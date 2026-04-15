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
  isUsersLoading: boolean;
  isMessagesLoading: boolean;
  isRecentConversationsLoading: boolean;

  getUsers: () => Promise<void>;
  getRecentConversations: () => Promise<void>;
  getMessages: (userId: string) => Promise<void>;
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
  forwardMessage: (messageId: string, receiverId: string) => Promise<void>;
  recallMessage: (messageId: string) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  setSelectedUser: (user: User | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  users: [],
  recentConversations: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isRecentConversationsLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error: any) {
      console.error("getUsers error:", error.response?.data?.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getRecentConversations: async () => {
    set({ isRecentConversationsLoading: true });
    try {
      const res = await axiosInstance.get("/messages/recent");
      set({ recentConversations: sortRecentConversations(res.data || []) });
    } catch (error: any) {
      console.error("getRecentConversations error:", error.response?.data?.message);
    } finally {
      set({ isRecentConversationsLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error: any) {
      console.error("getMessages error:", error.response?.data?.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (payload) => {
    const { selectedUser, messages } = get();
    if (!selectedUser?._id) return;

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

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        body,
      );
      set((state) => ({
        messages: [...messages, res.data],
        recentConversations: upsertRecentConversation(state.recentConversations, {
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
        }),
      }));
    } catch (error: any) {
      console.error("sendMessage error:", error.response?.data?.message);
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
      console.error("recallMessage error:", error.response?.data?.message);
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

    newMessageHandler = (newMessage: Message) => {
      set((state) => {
        const myId = useAuthStore.getState().authUser?._id;
        const { selectedUser } = state;

        const otherUserId =
          newMessage.senderId === myId ? newMessage.receiverId : newMessage.senderId;
        const otherUser =
          state.users.find((user) => user._id === otherUserId) ||
          (selectedUser?._id === otherUserId ? selectedUser : null);

        let nextRecentConversations = state.recentConversations;
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
            },
          );
        }

        if (state.messages.some((msg) => msg._id === newMessage._id)) {
          return { ...state, recentConversations: nextRecentConversations };
        }

        if (newMessage.senderId === myId) {
          return {
            messages: [...state.messages, newMessage],
            recentConversations: nextRecentConversations,
          };
        }
        if (
          selectedUser &&
          (newMessage.senderId === selectedUser._id ||
            newMessage.receiverId === selectedUser._id)
        ) {
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
  },

  setSelectedUser: (user) => set({ selectedUser: user }),
}));
