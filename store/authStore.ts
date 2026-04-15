import { create } from "zustand";
import { axiosInstance, clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "@/services/api";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { useChatStore } from "@/store/chatStore";
import type { User } from "@/types/user";
import type {
  ConfirmSignupPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from "@/types/auth";

interface AuthState {
  authUser: User | null;
  isSigningUp: boolean;
  isConfirming: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: string[];
  incomingCall: { from: string; offer: RTCSessionDescriptionInit } | null;

  checkAuth: () => Promise<void>;
  signup: (data: RegisterPayload) => Promise<{ userSub: string; pendingConfirmation: boolean }>;
  confirmSignup: (data: ConfirmSignupPayload) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  login: (data: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfilePayload) => Promise<void>;
  connectSocket: () => Promise<void>;
  clearIncomingCall: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isConfirming: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  incomingCall: null,

  checkAuth: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ authUser: null });
        return;
      }

      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      get().connectSocket();
    } catch {
      await clearAuthTokens();
      disconnectSocket();
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/register", data);
      return res.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  confirmSignup: async (data) => {
    set({ isConfirming: true });
    try {
      await axiosInstance.post("/auth/confirm", data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? "Confirmation failed");
    } finally {
      set({ isConfirming: false });
    }
  },

  resendConfirmation: async (email) => {
    try {
      await axiosInstance.post("/auth/resend-confirmation", { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? "Resend failed");
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      await setAuthTokens(res.data.accessToken, res.data.refreshToken);

      const checkRes = await axiosInstance.get("/auth/check");
      set({ authUser: checkRes.data });
      get().connectSocket();
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      const refreshToken = await getRefreshToken();
      await axiosInstance.post(
        "/auth/logout",
        refreshToken ? { refreshToken } : {},
      );
    } finally {
      await clearAuthTokens();
      useChatStore.getState().unsubscribeFromMessages();
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

  connectSocket: async () => {
    const token = await getAccessToken();
    if (!token) return;

    const socket = connectSocket(token);
    socket.off("getOnlineUsers");
    socket.on("getOnlineUsers", (userIds: string[]) => {
      set({ onlineUsers: userIds });
    });

    socket.off("incomingCall");
    socket.on(
      "incomingCall",
      ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        set({ incomingCall: { from, offer } });
      },
    );

    socket.off("hangup");
    socket.on("hangup", ({ from }: { from: string }) => {
      const ic = get().incomingCall;
      if (ic && ic.from === from) set({ incomingCall: null });
    });

    useChatStore.getState().subscribeToMessages();

    if (!socket.connected) {
      socket.connect();
    }
  },
}));
