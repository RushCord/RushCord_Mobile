import { create } from "zustand";
import { axiosInstance } from "@/services/api";
import { getSocket } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import type { Message, SendMessagePayload } from "@/types/message";
import type { User } from "@/types/user";

interface ChatState {
  messages: Message[];
  users: User[];
  selectedUser: User | null;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;

  getUsers: () => Promise<void>;
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
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

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
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        payload
      );
      set({ messages: [...messages, res.data] });
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

    socket.on("newMessage", (newMessage: Message) => {
      set((state) => {
        const myId = useAuthStore.getState().authUser?._id;
        const { selectedUser } = state;

        if (newMessage.senderId === myId) {
          return { messages: [...state.messages, newMessage] };
        }
        if (
          selectedUser &&
          (newMessage.senderId === selectedUser._id ||
            newMessage.receiverId === selectedUser._id)
        ) {
          return { messages: [...state.messages, newMessage] };
        }
        return state;
      });
    });

    socket.on("messageRecalled", (updatedMessage: Message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = getSocket();
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageRecalled");
  },

  setSelectedUser: (user) => set({ selectedUser: user }),
}));
