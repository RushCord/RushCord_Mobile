import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { axiosInstance } from "@/services/api";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { STORAGE_KEYS } from "@/constants/config";
import type { User } from "@/types/user";
import type { LoginPayload, SignupPayload, UpdateProfilePayload } from "@/types/auth";

interface AuthState {
  authUser: User | null;
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: string[];
  incomingCall: { from: string; offer: RTCSessionDescriptionInit } | null;

  checkAuth: () => Promise<void>;
  signup: (data: SignupPayload) => Promise<void>;
  login: (data: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfilePayload) => Promise<void>;
  clearIncomingCall: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  incomingCall: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      const socket = connectSocket(res.data._id);
      socket.on("getOnlineUsers", (userIds: string[]) => {
        set({ onlineUsers: userIds });
      });
      socket.on("incomingCall", ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        set({ incomingCall: { from, offer } });
      });
      socket.on("hangup", ({ from }: { from: string }) => {
        const ic = get().incomingCall;
        if (ic && ic.from === from) set({ incomingCall: null });
      });
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, res.data.token ?? "");
      set({ authUser: res.data });
      connectSocket(res.data._id);
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, res.data.token ?? "");
      set({ authUser: res.data });
      connectSocket(res.data._id);
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } finally {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      disconnectSocket();
      set({ authUser: null, onlineUsers: [], incomingCall: null });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  clearIncomingCall: () => set({ incomingCall: null }),
}));
