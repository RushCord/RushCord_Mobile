import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const {
    authUser,
    isCheckingAuth,
    checkAuth,
    login,
    signup,
    logout,
    updateProfile,
    isLoggingIn,
    isSigningUp,
    isUpdatingProfile,
    onlineUsers,
  } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  return {
    authUser,
    isCheckingAuth,
    isLoggingIn,
    isSigningUp,
    isUpdatingProfile,
    onlineUsers,
    isUserOnline,
    login,
    signup,
    logout,
    updateProfile,
  };
}
