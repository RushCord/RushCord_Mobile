import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const {
    authUser,
    isCheckingAuth,
    checkAuth,
    login,
    signup,
    confirmSignup,
    resendConfirmation,
    logout,
    updateProfile,
    isLoggingIn,
    isSigningUp,
    isConfirming,
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
    isConfirming,
    isUpdatingProfile,
    onlineUsers,
    isUserOnline,
    login,
    signup,
    confirmSignup,
    resendConfirmation,
    logout,
    updateProfile,
  };
}
