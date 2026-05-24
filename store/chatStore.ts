import { create } from "zustand";
import { axiosInstance } from "@/services/api";
import { getSocket } from "@/services/socket";
import { uploadAssetViaPresign } from "@/services/upload";
import { useAuthStore } from "@/store/authStore";
import type { RecentConversation } from "@/types/conversation";
import type { Message, SendMessagePayload } from "@/types/message";
import type { User } from "@/types/user";

let newMessageHandler: ((newMessage: Message) => void) | null = null;
let messageRecalledHandler: ((updatedMessage: Message) => void) | null = null;
let messageRecalledMeHandler: ((updatedMessage: Message) => void) | null = null;
let typingHandler: ((payload?: { from?: string }) => void) | null = null;
let stopTypingHandler: ((payload?: { from?: string }) => void) | null = null;

function buildDmConversationId(userIdA?: string, userIdB?: string) {
  return `DM#${[userIdA, userIdB].filter(Boolean).sort().join("#")}`;
}

function sortRecentConversations(conversations: RecentConversation[]) {
  return [...conversations].sort((a, b) =>
    String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || "")),
  );
}

function upsertRecentConversation(
  conversations: RecentConversation[],
  nextConversation: RecentConversation,
) {
  const withoutCurrent = conversations.filter(
    (conversation) => conversation.user._id !== nextConversation.user._id,
  );
  return sortRecentConversations([nextConversation, ...withoutCurrent]);
}

interface ChatState {
  messages: Message[];
  users: User[];
  recentConversations: RecentConversation[];
  selectedUser: User | null;
  isTyping: boolean;
  typingFromUserId: string | null;
  typingUserName: string | null;
  _typingTimer: ReturnType<typeof setTimeout> | null;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;
  isRecentConversationsLoading: boolean;

  friends: any[];
  incomingFriendRequests: any[];
  outgoingFriendRequests: any[];
  isFriendsLoading: boolean;

  selectedConversation: RecentConversation | null;
  selectedChannel: any | null;
  channels: any[];
  voiceSession: { conversationId: string; voiceChannelId: string; roomName: string } | null;
  voiceMembersByRoom: Record<string, string[]>;
  selectedVoiceChannelId: string | null;
  voiceMicMuted: boolean;
  voiceOutputMuted: boolean;

  getUsers: () => Promise<void>;
  getRecentConversations: () => Promise<void>;
  getMessages: (userIdOrConversationId: string) => Promise<void>;
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
  forwardMessage: (messageId: string, receiverId: string) => Promise<void>;
  recallMessage: (messageId: string) => Promise<void>;
  recallMessageMe: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  editMessageText: (messageId: string, text: string) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  setSelectedUser: (user: User | null) => void;

  setSelectedConversation: (conversation: RecentConversation | null) => void;
  getChannels: (conversationId: string) => Promise<void>;
  setSelectedChannel: (channel: any | null) => void;
  joinVoiceChannel: (conversationId: string, voiceChannelId: string) => void;
  leaveVoiceChannel: () => void;
  requestVoicePresence: (conversationId: string) => void;
  toggleVoiceMic: () => void;
  toggleVoiceOutput: () => void;

  getFriends: () => Promise<void>;
  getFriendRequests: () => Promise<void>;
  sendFriendRequest: (otherUserId: string) => Promise<void>;
  acceptFriendRequest: (otherUserId: string) => Promise<void>;
  deleteFriendRequest: (otherUserId: string) => Promise<void>;
  removeFriend: (otherUserId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  users: [],
  recentConversations: [],
  selectedUser: null,
  isTyping: false,
  typingFromUserId: null,
  typingUserName: null,
  _typingTimer: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isRecentConversationsLoading: false,

  selectedConversation: null,
  selectedChannel: null,
  channels: [],
  voiceSession: null,
  voiceMembersByRoom: {},
  selectedVoiceChannelId: null,
  voiceMicMuted: false,
  voiceOutputMuted: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error: any) {
      console.error("getUsers error:", error.response?.data?.message || error.message || error);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getRecentConversations: async () => {
    set({ isRecentConversationsLoading: true });
    try {
      const res = await axiosInstance.get("/conversations");
      const rawConvs = res.data || [];
      const usersList = get().users || [];
      
      const mappedConvs = rawConvs.map((c: any) => {
        const isGroup = c.type === "GROUP";
        const otherUser = isGroup
          ? {
              _id: "",
              fullName: c.title || "Server",
              email: "",
              profilePic: c.avatar || "",
            }
          : usersList.find((u) => u._id === c.otherUserId) || {
              _id: c.otherUserId || "",
              fullName: c.title || "User",
              email: "",
              profilePic: c.avatar || "",
            };
        return {
          conversationId: c.conversationId,
          user: otherUser,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt || c.lastMessage?.createdAt || "",
          type: c.type || "DM",
          title: c.title,
          avatar: c.avatar,
          cover: c.cover,
          topic: c.topic,
          description: c.description,
          memberCount: c.memberCount,
        };
      });

      set({ recentConversations: sortRecentConversations(mappedConvs) });
    } catch (error: any) {
      console.error("getRecentConversations error:", error.response?.data?.message || error.message || error);
    } finally {
      set({ isRecentConversationsLoading: false });
    }
  },

  getMessages: async (userIdOrConversationId) => {
    set({ isMessagesLoading: true });
    try {
      const { selectedConversation, selectedChannel } = get();
      let res;
      if (selectedConversation?.type === "GROUP") {
        const channelId = selectedChannel?.channelId || get().channels.find((c) => c.channelType === "CHAT")?.channelId || "";
        res = await axiosInstance.get(
          `/conversations/${encodeURIComponent(selectedConversation.conversationId)}/channels/${encodeURIComponent(channelId)}/messages`
        );
      } else {
        res = await axiosInstance.get(`/messages/${userIdOrConversationId}`);
      }
      set({ messages: res.data || [] });
    } catch (error: any) {
      console.error("getMessages error:", error.response?.data?.message || error.message || error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (payload) => {
    const { selectedUser, selectedConversation, selectedChannel, messages } = get();
    const isGroup = selectedConversation?.type === "GROUP";
    
    if (!isGroup && !selectedUser?._id) return;
    if (isGroup && !selectedConversation?.conversationId) return;

    const trimmed = String(payload.text || "").trim();
    const many = Array.isArray(payload.files) ? payload.files.filter(Boolean) : [];
    const single = payload.file || many[0] || null;

    if (!trimmed && !single && many.length === 0) return;

    try {
      let body: Record<string, unknown> = {};

      if (trimmed) {
        body.text = trimmed;
      }

      if (many.length > 1) {
        const images = [];
        for (const asset of many) {
          const uploaded = await uploadAssetViaPresign(asset, "message");
          images.push({
            fileUrl: uploaded.publicUrl,
            s3Key: uploaded.key,
            mimeType: uploaded.mimeType,
            fileName: uploaded.fileName,
            sizeBytes: uploaded.sizeBytes,
          });
        }
        body.images = images;
      } else if (single) {
        const uploaded = await uploadAssetViaPresign(single, "message");
        body = {
          ...body,
          fileUrl: uploaded.publicUrl,
          s3Key: uploaded.key,
          mimeType: uploaded.mimeType,
          fileName: uploaded.fileName,
          sizeBytes: uploaded.sizeBytes,
        };
      }

      let res;
      if (isGroup) {
        const channelId = selectedChannel?.channelId || get().channels.find((c) => c.channelType === "CHAT")?.channelId || "";
        res = await axiosInstance.post(
          `/conversations/${encodeURIComponent(selectedConversation.conversationId)}/channels/${encodeURIComponent(channelId)}/messages`,
          body
        );
      } else {
        res = await axiosInstance.post(
          `/messages/send/${selectedUser?._id}`,
          body,
        );
      }

      set((state) => {
        const nextMessages = [...messages, res.data];
        
        let nextRecentConversations = state.recentConversations;
        if (isGroup) {
          nextRecentConversations = state.recentConversations.map((c) =>
            c.conversationId === selectedConversation.conversationId
              ? { ...c, lastMessage: res.data, lastMessageAt: res.data.createdAt }
              : c
          );
        } else if (selectedUser) {
          nextRecentConversations = upsertRecentConversation(state.recentConversations, {
            conversationId:
              state.recentConversations.find(
                (conversation) => conversation.user._id === selectedUser._id,
              )?.conversationId ||
              buildDmConversationId(
                useAuthStore.getState().authUser?._id,
                selectedUser._id,
              ),
            user: selectedUser,
            lastMessage: res.data,
            lastMessageAt: res.data.createdAt,
            type: "DM",
          });
        }

        return {
          messages: nextMessages,
          recentConversations: nextRecentConversations,
        };
      });
    } catch (error: any) {
      console.error("sendMessage error:", error.response?.data?.message || error.message || error);
    }
  },

  forwardMessage: async (messageId, receiverId) => {
    try {
      const res = await axiosInstance.post("/messages/forward", {
        messageId,
        receiverId,
      });
      set((state) => ({ messages: [...state.messages, res.data] }));
    } catch (error: any) {
      console.error("forwardMessage error:", error);
    }
  },

  recallMessage: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/messages/recall/${messageId}`);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === res.data._id ? res.data : msg
        ),
      }));
    } catch (error: any) {
      console.error("recallMessage error:", error.response?.data?.message || error.message || error);
    }
  },

  recallMessageMe: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/messages/recall-me/${messageId}`);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === res.data._id ? res.data : msg,
        ),
        recentConversations: state.recentConversations.map((conversation) =>
          conversation.lastMessage?._id === res.data._id
            ? {
                ...conversation,
                lastMessage: res.data,
                lastMessageAt: res.data.createdAt,
              }
            : conversation,
        ),
      }));
    } catch (error: any) {
      console.error("recallMessageMe error:", error.response?.data?.error || error.message);
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/react/${messageId}`, { emoji });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === res.data._id ? res.data : msg,
        ),
        recentConversations: state.recentConversations.map((conversation) =>
          conversation.lastMessage?._id === res.data._id
            ? {
                ...conversation,
                lastMessage: res.data,
                lastMessageAt: res.data.createdAt,
              }
            : conversation,
        ),
      }));
    } catch (error: any) {
      console.error("reactToMessage error:", error.response?.data?.error || error.message);
    }
  },

  editMessageText: async (messageId, text) => {
    try {
      const nextText = String(text || "").trim();
      if (!nextText) return;
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text: nextText });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === res.data._id ? res.data : msg,
        ),
        recentConversations: state.recentConversations.map((conversation) =>
          conversation.lastMessage?._id === res.data._id
            ? {
                ...conversation,
                lastMessage: res.data,
                lastMessageAt: res.data.createdAt,
              }
            : conversation,
        ),
      }));
    } catch (error: any) {
      console.error("editMessageText error:", error.response?.data?.error || error.message);
    }
  },

  subscribeToMessages: () => {
    const socket = getSocket();
    if (!socket) return;

    if (newMessageHandler) {
      socket.off("newMessage", newMessageHandler);
    }
    if (messageRecalledHandler) {
      socket.off("messageRecalled", messageRecalledHandler);
    }
    if (messageRecalledMeHandler) {
      socket.off("messageRecalledMe", messageRecalledMeHandler);
    }
    if (typingHandler) {
      socket.off("typing", typingHandler);
    }
    if (stopTypingHandler) {
      socket.off("stopTyping", stopTypingHandler);
    }
    socket.off("messageReactionUpdated");
    socket.off("messageEdited");
    socket.off("voiceChannelPresence");
    socket.off("voicePresenceSnapshot");

    newMessageHandler = (newMessage: Message) => {
      set((state) => {
        const myId = useAuthStore.getState().authUser?._id;
        const { selectedConversation, selectedChannel } = state;

        const isCurrentGroupMsg =
          selectedConversation?.type === "GROUP" &&
          newMessage.channelId &&
          String(newMessage.channelId) === String(selectedChannel?.channelId);

        const isCurrentDMMsg =
          selectedConversation?.type === "DM" &&
          (newMessage.senderId === state.selectedUser?._id ||
            newMessage.receiverId === state.selectedUser?._id);

        let nextRecentConversations = state.recentConversations;
        
        if (newMessage.channelId) {
          const targetConvId = state.recentConversations.find(
            (c) => c.conversationId === selectedConversation?.conversationId
          )?.conversationId || selectedConversation?.conversationId;

          if (targetConvId) {
            nextRecentConversations = state.recentConversations.map((c) =>
              c.conversationId === targetConvId
                ? { ...c, lastMessage: newMessage, lastMessageAt: newMessage.createdAt }
                : c
            );
          }
        } else {
          const otherUserId =
            newMessage.senderId === myId ? newMessage.receiverId : newMessage.senderId;
          const otherUser =
            state.users.find((user) => user._id === otherUserId) ||
            (state.selectedUser?._id === otherUserId ? state.selectedUser : null);

          if (otherUser) {
            nextRecentConversations = upsertRecentConversation(
              state.recentConversations,
              {
                conversationId:
                  state.recentConversations.find(
                    (conversation) => conversation.user._id === otherUser._id,
                  )?.conversationId ||
                  buildDmConversationId(myId, otherUser._id),
                user: otherUser,
                lastMessage: newMessage,
                lastMessageAt: newMessage.createdAt,
                type: "DM",
              },
            );
          }
        }

        if (state.messages.some((msg) => msg._id === newMessage._id)) {
          return { ...state, recentConversations: nextRecentConversations };
        }

        if (newMessage.senderId === myId || isCurrentGroupMsg || isCurrentDMMsg) {
          return {
            messages: [...state.messages, newMessage],
            recentConversations: nextRecentConversations,
          };
        }

        return { ...state, recentConversations: nextRecentConversations };
      });
    };
    socket.on("newMessage", newMessageHandler);

    messageRecalledHandler = (updatedMessage: Message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        ),
        recentConversations: state.recentConversations.map((conversation) =>
          conversation.lastMessage?._id === updatedMessage._id
            ? {
                ...conversation,
                lastMessage: updatedMessage,
                lastMessageAt: updatedMessage.createdAt,
              }
            : conversation,
        ),
      }));
    };
    socket.on("messageRecalled", messageRecalledHandler);

    messageRecalledMeHandler = (updatedMessage: Message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        ),
        recentConversations: state.recentConversations.map((conversation) =>
          conversation.lastMessage?._id === updatedMessage._id
            ? {
                ...conversation,
                lastMessage: updatedMessage,
                lastMessageAt: updatedMessage.createdAt,
              }
            : conversation,
        ),
      }));
    };
    socket.on("messageRecalledMe", messageRecalledMeHandler);

    const TYPING_WINDOW_MS = 10_000;

    typingHandler = ({ from } = {}) => {
      set((state) => {
        const selected = state.selectedUser;
        if (!selected?._id) return state;
        if (!from || String(from) !== String(selected._id)) return state;

        if (state._typingTimer) clearTimeout(state._typingTimer);
        const timer = setTimeout(() => {
          set({
            isTyping: false,
            typingFromUserId: null,
            typingUserName: null,
            _typingTimer: null,
          });
        }, TYPING_WINDOW_MS);

        return {
          isTyping: true,
          typingFromUserId: String(from),
          typingUserName: selected.fullName || null,
          _typingTimer: timer,
        };
      });
    };
    socket.on("typing", typingHandler);

    stopTypingHandler = ({ from } = {}) => {
      set((state) => {
        const selected = state.selectedUser;
        if (!selected?._id) return state;
        if (!from || String(from) !== String(selected._id)) return state;
        if (state._typingTimer) clearTimeout(state._typingTimer);
        return {
          isTyping: false,
          typingFromUserId: null,
          typingUserName: null,
          _typingTimer: null,
        };
      });
    };
    socket.on("stopTyping", stopTypingHandler);

    socket.on("messageReactionUpdated", (updatedMessage: Message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
        recentConversations: state.recentConversations.map((conversation) =>
          conversation.lastMessage?._id === updatedMessage._id
            ? {
                ...conversation,
                lastMessage: updatedMessage,
                lastMessageAt: updatedMessage.createdAt,
              }
            : conversation,
        ),
      }));
    });

    socket.on("messageEdited", (updatedMessage: Message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
        recentConversations: state.recentConversations.map((conversation) =>
          conversation.lastMessage?._id === updatedMessage._id
            ? {
                ...conversation,
                lastMessage: updatedMessage,
                lastMessageAt: updatedMessage.createdAt,
              }
            : conversation,
        ),
      }));
    });

    socket.on("voiceChannelPresence", ({ roomName, members }: { roomName: string; members: string[] }) => {
      if (!roomName) return;
      set((s) => ({
        voiceMembersByRoom: {
          ...s.voiceMembersByRoom,
          [roomName]: Array.isArray(members) ? members : [],
        },
      }));
    });

    socket.on("voicePresenceSnapshot", ({ rooms }: { rooms: Record<string, string[]> }) => {
      set((s) => ({
        voiceMembersByRoom: {
          ...s.voiceMembersByRoom,
          ...(rooms || {}),
        },
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = getSocket();
    if (!socket) return;
    if (newMessageHandler) {
      socket.off("newMessage", newMessageHandler);
    }
    if (messageRecalledHandler) {
      socket.off("messageRecalled", messageRecalledHandler);
    }
    if (messageRecalledMeHandler) {
      socket.off("messageRecalledMe", messageRecalledMeHandler);
    }
    if (typingHandler) {
      socket.off("typing", typingHandler);
    }
    if (stopTypingHandler) {
      socket.off("stopTyping", stopTypingHandler);
    }
    socket.off("messageReactionUpdated");
    socket.off("messageEdited");
    socket.off("voiceChannelPresence");
    socket.off("voicePresenceSnapshot");

    const t = get()._typingTimer;
    if (t) clearTimeout(t);
    set({
      isTyping: false,
      typingFromUserId: null,
      typingUserName: null,
      _typingTimer: null,
    });
  },

  setSelectedUser: (user) => {
    const t = get()._typingTimer;
    if (t) clearTimeout(t);
    set({
      selectedConversation: null,
      selectedUser: user,
      selectedChannel: null,
      channels: [],
      isTyping: false,
      typingFromUserId: null,
      typingUserName: null,
      _typingTimer: null,
    });
  },

  setSelectedConversation: (conv) => {
    const t = get()._typingTimer;
    if (t) clearTimeout(t);
    
    const socket = getSocket();
    if (socket && conv?.conversationId) {
      socket.emit("joinConversation", { conversationId: conv.conversationId });
    }

    set({
      selectedConversation: conv,
      selectedUser: conv?.type === "DM" ? conv.user : null,
      selectedChannel: null,
      channels: [],
      isTyping: false,
      typingFromUserId: null,
      typingUserName: null,
      _typingTimer: null,
    });

    if (conv?.type === "GROUP") {
      get().getChannels(conv.conversationId);
    }
  },

  getChannels: async (conversationId) => {
    try {
      const res = await axiosInstance.get(`/conversations/${encodeURIComponent(conversationId)}/channels`);
      const channels = Array.isArray(res.data) ? res.data : [];
      set({ channels });
      
      const firstChat = channels.find((c) => c.channelType === "CHAT");
      if (firstChat) {
        get().setSelectedChannel(firstChat);
      }
    } catch (error) {
      console.error("getChannels error:", error);
    }
  },

  setSelectedChannel: (channel) => {
    const prevChannel = get().selectedChannel;
    const { selectedConversation } = get();
    const socket = getSocket();

    if (socket && selectedConversation?.conversationId) {
      if (prevChannel?.channelId) {
        socket.emit("leaveConversationChannel", {
          conversationId: selectedConversation.conversationId,
          channelId: prevChannel.channelId,
        });
      }
      if (channel?.channelId) {
        socket.emit("joinConversationChannel", {
          conversationId: selectedConversation.conversationId,
          channelId: channel.channelId,
        });
      }
    }

    set({ selectedChannel: channel });
    if (channel?.channelId && selectedConversation?.conversationId) {
      get().getMessages(selectedConversation.conversationId);
    }
  },

  joinVoiceChannel: (conversationId, voiceChannelId) => {
    const roomName = `${conversationId}#VOICE#${voiceChannelId}`;
    const prev = get().voiceSession;
    const socket = getSocket();

    if (socket && prev) {
      socket.emit("voiceChannelLeave", {
        conversationId: prev.conversationId,
        voiceChannelId: prev.voiceChannelId,
        roomName: prev.roomName,
      });
    }

    set({
      selectedVoiceChannelId: voiceChannelId,
      voiceSession: { conversationId, voiceChannelId, roomName },
      voiceMicMuted: false,
      voiceOutputMuted: false,
    });

    if (socket) {
      socket.emit("voiceChannelJoin", {
        conversationId,
        voiceChannelId,
        roomName,
      });
    }
  },

  leaveVoiceChannel: () => {
    const session = get().voiceSession;
    const socket = getSocket();
    if (socket && session) {
      socket.emit("voiceChannelLeave", {
        conversationId: session.conversationId,
        voiceChannelId: session.voiceChannelId,
        roomName: session.roomName,
      });
    }
    set({
      voiceSession: null,
      selectedVoiceChannelId: null,
      voiceMicMuted: false,
      voiceOutputMuted: false,
    });
  },

  requestVoicePresence: (conversationId) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("requestVoicePresence", { conversationId });
    }
  },

  toggleVoiceMic: () => {
    set((s) => ({ voiceMicMuted: !s.voiceMicMuted }));
  },

  toggleVoiceOutput: () => {
    set((s) => ({ voiceOutputMuted: !s.voiceOutputMuted }));
  },

  friends: [],
  incomingFriendRequests: [],
  outgoingFriendRequests: [],
  isFriendsLoading: false,

  getFriends: async () => {
    set({ isFriendsLoading: true });
    try {
      const res = await axiosInstance.get("/friends");
      set({ friends: res.data || [] });
    } catch (error: any) {
      console.error("getFriends error:", error.response?.data?.message || error.message);
    } finally {
      set({ isFriendsLoading: false });
    }
  },

  getFriendRequests: async () => {
    set({ isFriendsLoading: true });
    try {
      const incomingRes = await axiosInstance.get("/friends/requests?type=incoming");
      const outgoingRes = await axiosInstance.get("/friends/requests?type=outgoing");
      set({
        incomingFriendRequests: incomingRes.data || [],
        outgoingFriendRequests: outgoingRes.data || [],
      });
    } catch (error: any) {
      console.error("getFriendRequests error:", error.response?.data?.message || error.message);
    } finally {
      set({ isFriendsLoading: false });
    }
  },

  sendFriendRequest: async (otherUserId) => {
    try {
      const res = await axiosInstance.post("/friends/requests", { otherUserId });
      set((state) => ({
        outgoingFriendRequests: [...state.outgoingFriendRequests, res.data],
      }));
    } catch (error: any) {
      console.error("sendFriendRequest error:", error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.error || "Gửi lời mời thất bại");
    }
  },

  acceptFriendRequest: async (otherUserId) => {
    try {
      const res = await axiosInstance.post(`/friends/requests/${otherUserId}/accept`);
      set((state) => ({
        incomingFriendRequests: state.incomingFriendRequests.filter(
          (r) => r.otherUserId !== otherUserId
        ),
        friends: [...state.friends, res.data],
      }));
    } catch (error: any) {
      console.error("acceptFriendRequest error:", error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.error || "Chấp nhận lời mời thất bại");
    }
  },

  deleteFriendRequest: async (otherUserId) => {
    try {
      await axiosInstance.delete(`/friends/requests/${otherUserId}`);
      set((state) => ({
        incomingFriendRequests: state.incomingFriendRequests.filter(
          (r) => r.otherUserId !== otherUserId
        ),
        outgoingFriendRequests: state.outgoingFriendRequests.filter(
          (r) => r.otherUserId !== otherUserId
        ),
      }));
    } catch (error: any) {
      console.error("deleteFriendRequest error:", error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.error || "Từ chối/hủy lời mời thất bại");
    }
  },

  removeFriend: async (otherUserId) => {
    try {
      await axiosInstance.delete(`/friends/${otherUserId}`);
      set((state) => ({
        friends: state.friends.filter((f) => f.otherUserId !== otherUserId),
      }));
    } catch (error: any) {
      console.error("removeFriend error:", error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.error || "Xóa bạn bè thất bại");
    }
  },
}));
