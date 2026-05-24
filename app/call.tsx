import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { getWebRTC, getWebRtcUnavailableReason } from "@/lib/webrtc";
import { useCallStore } from "@/store/callStore";

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ to?: string; from?: string }>();

  const incomingCall = useAuthStore((s) => s.incomingCall);
  const connectSocket = useAuthStore((s) => s.connectSocket);
  const authUser = useAuthStore((s) => s.authUser);

  const users = useChatStore((s) => s.users);
  const selectedUser = useChatStore((s) => s.selectedUser);

  const {
    status,
    role,
    peerUserId,
    error,
    localStream,
    remoteStream,
    isMicEnabled,
    isCamEnabled,
    startCall,
    acceptIncoming,
    endCall,
    toggleMic,
    toggleCam,
  } = useCallStore();

  const peerId = useMemo(() => {
    return params.to ? String(params.to) : params.from ? String(params.from) : peerUserId;
  }, [params.from, params.to, peerUserId]);

  const peer = useMemo(() => {
    if (!peerId) return null;
    return (
      users.find((u) => String(u._id) === String(peerId)) ??
      (String(selectedUser?._id) === String(peerId) ? selectedUser : null)
    );
  }, [peerId, selectedUser, users]);

  const webrtc = getWebRTC();
  const RTCView = webrtc?.RTCView as any;

  useEffect(() => {
    // Ensure socket is connected before we try to signal.
    if (authUser) {
      connectSocket().catch(() => {});
    }
  }, [authUser, connectSocket]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!peerId) return;

      // If incoming route, accept with stored offer.
      if (params.from) {
        const offer = incomingCall?.from === peerId ? incomingCall.offer : null;
        if (!offer) return;
        if (cancelled) return;
        await acceptIncoming(peerId, offer);
        return;
      }

      // Outgoing call.
      if (params.to) {
        if (cancelled) return;
        await startCall(peerId);
      }
    };

    boot().catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to, peerId]);

  const hangupAndBack = () => {
    endCall();
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: peer?.fullName || "Call",
          headerStyle: { backgroundColor: Colors.backgroundSecondary },
          headerTintColor: Colors.textHeader,
        }}
      />

      <View style={styles.stage}>
        {RTCView && remoteStream ? (
          <RTCView style={styles.remoteVideo} streamURL={remoteStream.toURL()} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="videocam-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.placeholderTitle}>
              {status === "connecting" ? "Đang kết nối..." : status === "in_call" ? "Đang gọi" : "Call"}
            </Text>
            {!!error ? <Text style={styles.placeholderSub}>{error}</Text> : null}
            {!webrtc ? (
              <Text style={styles.placeholderSub}>
                {getWebRtcUnavailableReason() ||
                  "Cần dev build (react-native-webrtc không có trong Expo Go)."}
              </Text>
            ) : null}
          </View>
        )}

        {RTCView && localStream ? (
          <View style={styles.localPip}>
            <RTCView style={styles.localVideo} streamURL={localStream.toURL()} />
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.statusLine}>
          {role ? `${role.toUpperCase()} • ` : ""}
          {status.replaceAll("_", " ")}
        </Text>

        <View style={styles.controls}>
          <Pressable onPress={toggleMic} style={[styles.ctrlBtn, !isMicEnabled && styles.ctrlBtnOff]}>
            <Ionicons name={isMicEnabled ? "mic" : "mic-off"} size={22} color={Colors.textHeader} />
          </Pressable>
          <Pressable onPress={toggleCam} style={[styles.ctrlBtn, !isCamEnabled && styles.ctrlBtnOff]}>
            <Ionicons name={isCamEnabled ? "videocam" : "videocam-off"} size={22} color={Colors.textHeader} />
          </Pressable>
          <Pressable onPress={hangupAndBack} style={[styles.ctrlBtn, styles.ctrlBtnHangup]}>
            <Ionicons name="call" size={22} color={Colors.textHeader} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stage: {
    flex: 1,
    backgroundColor: Colors.backgroundTertiary,
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: Colors.backgroundTertiary,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    gap: 10,
  },
  placeholderTitle: {
    color: Colors.textHeader,
    fontSize: FontSize.xl,
    fontWeight: "800",
    textAlign: "center",
  },
  placeholderSub: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: "center",
  },
  localPip: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    width: 110,
    height: 160,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  localVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.backgroundSecondary,
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  statusLine: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctrlBtnOff: {
    backgroundColor: Colors.backgroundTertiary,
  },
  ctrlBtnHangup: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
    transform: [{ rotate: "135deg" }],
  },
});

