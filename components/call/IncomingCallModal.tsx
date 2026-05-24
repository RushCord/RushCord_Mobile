import React, { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/ui/Avatar";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { getSocket } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";

export function IncomingCallModal() {
  const router = useRouter();
  const incomingCall = useAuthStore((s) => s.incomingCall);
  const clearIncomingCall = useAuthStore((s) => s.clearIncomingCall);
  const users = useChatStore((s) => s.users);
  const selectedUser = useChatStore((s) => s.selectedUser);

  const caller = useMemo(() => {
    const from = incomingCall?.from;
    if (!from) return null;
    return (
      users.find((u) => String(u._id) === String(from)) ??
      (String(selectedUser?._id) === String(from) ? selectedUser : null)
    );
  }, [incomingCall?.from, selectedUser, users]);

  if (!incomingCall) return null;

  const reject = () => {
    const socket = getSocket();
    socket?.emit("hangup", { to: incomingCall.from });
    clearIncomingCall();
  };

  const accept = () => {
    router.push(`/call?from=${encodeURIComponent(incomingCall.from)}`);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={reject}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.avatarRing}>
            <Avatar
              uri={caller?.profilePic}
              name={caller?.fullName || "Unknown"}
              size={84}
            />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {caller?.fullName || "Unknown"}
          </Text>
          <Text style={styles.subtitle}>Incoming video call…</Text>

          <View style={styles.actions}>
            <Pressable onPress={reject} style={[styles.actionBtn, styles.decline]}>
              <Ionicons name="close" size={22} color={Colors.textHeader} />
              <Text style={styles.actionText}>Từ chối</Text>
            </Pressable>
            <Pressable onPress={accept} style={[styles.actionBtn, styles.accept]}>
              <Ionicons name="videocam" size={22} color={Colors.textHeader} />
              <Text style={styles.actionText}>Chấp nhận</Text>
            </Pressable>
          </View>

          <Pressable onPress={reject} hitSlop={10} style={styles.dismissHint}>
            <Text style={styles.dismissHintText}>Nhấn để từ chối</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarRing: {
    padding: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  name: {
    color: Colors.textHeader,
    fontSize: FontSize.xl,
    fontWeight: "800",
    maxWidth: "100%",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: -2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  decline: {
    backgroundColor: Colors.danger,
  },
  accept: {
    backgroundColor: Colors.primary,
  },
  actionText: {
    color: Colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "800",
  },
  dismissHint: {
    marginTop: 6,
    paddingVertical: 6,
  },
  dismissHintText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});

