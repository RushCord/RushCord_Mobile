import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/Avatar";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";
import { getMessagePreview } from "@/lib/messagePreview";
import { getSocket } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import type { Message } from "@/types/message";
import type { User } from "@/types/user";

type BannerPayload = {
  message: Message;
  sender: User | null;
  preview: string;
};

export function NewMessageBanner() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.authUser);
  const connectSocket = useAuthStore((state) => state.connectSocket);
  const translateY = useRef(new Animated.Value(-180)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [banner, setBanner] = useState<BannerPayload | null>(null);

  const hideBanner = useCallback((afterHide?: () => void) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    Animated.timing(translateY, {
      toValue: -180,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setBanner(null);
      afterHide?.();
    });
  }, [translateY]);

  const showBanner = useCallback((nextBanner: BannerPayload) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setBanner(nextBanner);
    translateY.setValue(-180);

    requestAnimationFrame(() => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        hideTimeoutRef.current = setTimeout(() => {
          hideBanner();
        }, 4000);
      });
    });
  }, [hideBanner, translateY]);

  useEffect(() => {
    if (!authUser) return;

    let isDisposed = false;
    let cleanup: (() => void) | undefined;

    const bindListener = async () => {
      await connectSocket();
      const socket = getSocket();
      if (!socket || isDisposed) return;

      const handleNewMessage = (message: Message) => {
        const currentUser = useAuthStore.getState().authUser;
        if (!currentUser || message.senderId === currentUser._id) {
          return;
        }

        const { users, selectedUser } = useChatStore.getState();
        const sender =
          users.find((user) => user._id === message.senderId) ||
          (selectedUser?._id === message.senderId ? selectedUser : null);

        showBanner({
          message,
          sender,
          preview: getMessagePreview(message),
        });
      };

      socket.on("newMessage", handleNewMessage);
      cleanup = () => {
        socket.off("newMessage", handleNewMessage);
      };
    };

    bindListener();

    return () => {
      isDisposed = true;
      cleanup?.();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [authUser, connectSocket, showBanner]);

  if (!banner) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingTop: top + Spacing.sm,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          hideBanner(() => {
            if (banner.sender) {
              useChatStore.getState().setSelectedUser(banner.sender);
            }
            router.push(`/chat/${banner.message.senderId}`);
          });
        }}
        style={styles.card}
      >
        <Avatar
          uri={banner.sender?.profilePic}
          name={banner.sender?.fullName || "User"}
          size={44}
        />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.sender?.fullName || "New message"}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {banner.preview}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: Spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  subtitle: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
});
