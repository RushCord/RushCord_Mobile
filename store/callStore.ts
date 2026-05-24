import { create } from "zustand";
import { getSocket } from "@/services/socket";
import { getWebRTC, getWebRtcUnavailableReason } from "@/lib/webrtc";
import { useAuthStore } from "@/store/authStore";

type CallRole = "caller" | "callee";
type CallStatus = "idle" | "ringing" | "connecting" | "in_call" | "ended" | "failed";

type RemoteIcePayload = { from?: string; candidate?: any };
type CallAnsweredPayload = { from?: string; answer?: RTCSessionDescriptionInit };

interface CallState {
  status: CallStatus;
  role: CallRole | null;
  peerUserId: string | null;
  error: string | null;

  localStream: any | null;
  remoteStream: any | null;
  isMicEnabled: boolean;
  isCamEnabled: boolean;

  _pc: any | null;
  _unsubSocket: (() => void) | null;

  startCall: (toUserId: string) => Promise<void>;
  acceptIncoming: (fromUserId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  endCall: (reason?: string) => void;
  toggleMic: () => void;
  toggleCam: () => void;
}

function safeGetTracks(stream: any) {
  const tracks = stream?.getTracks?.();
  return Array.isArray(tracks) ? tracks : [];
}

function setTrackEnabled(stream: any, kind: "audio" | "video", enabled: boolean) {
  for (const t of safeGetTracks(stream)) {
    if (t?.kind === kind) t.enabled = enabled;
  }
}

export const useCallStore = create<CallState>((set, get) => ({
  status: "idle",
  role: null,
  peerUserId: null,
  error: null,
  localStream: null,
  remoteStream: null,
  isMicEnabled: true,
  isCamEnabled: true,
  _pc: null,
  _unsubSocket: null,

  startCall: async (toUserId) => {
    const socket = getSocket();
    const webrtc = getWebRTC();
    if (!socket) {
      set({ status: "failed", error: "Socket chưa kết nối." });
      return;
    }
    if (!webrtc?.RTCPeerConnection || !webrtc?.mediaDevices?.getUserMedia) {
      set({
        status: "failed",
        error:
          getWebRtcUnavailableReason() ||
          "WebRTC không khả dụng. Dùng dev build (không phải Expo Go).",
      });
      return;
    }

    get().endCall();
    set({ status: "connecting", role: "caller", peerUserId: toUserId, error: null });

    const pc = new webrtc.RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    const localStream = await webrtc.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    for (const track of safeGetTracks(localStream)) {
      pc.addTrack(track, localStream);
    }

    pc.ontrack = (ev: any) => {
      const stream = ev?.streams?.[0];
      if (stream) set({ remoteStream: stream });
    };

    pc.onicecandidate = (ev: any) => {
      if (ev?.candidate) {
        socket.emit("iceCandidate", { to: toUserId, candidate: ev.candidate });
      }
    };

    const cleanupSocket = () => {
      socket.off("callAnswered");
      socket.off("iceCandidate");
      socket.off("hangup");
    };

    socket.on("callAnswered", async ({ from, answer }: CallAnsweredPayload) => {
      if (!answer) return;
      if (from && String(from) !== String(toUserId)) return;
      try {
        await pc.setRemoteDescription(answer);
        set({ status: "in_call" });
      } catch (e: any) {
        set({ status: "failed", error: e?.message || "Không set được remote answer." });
      }
    });

    socket.on("iceCandidate", async ({ from, candidate }: RemoteIcePayload) => {
      if (from && String(from) !== String(toUserId)) return;
      if (!candidate) return;
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    });

    socket.on("hangup", ({ from }: { from: string }) => {
      if (from && String(from) !== String(toUserId)) return;
      get().endCall("Remote hangup");
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("callUser", { to: toUserId, offer });

    set({
      _pc: pc,
      localStream,
      _unsubSocket: cleanupSocket,
      isMicEnabled: true,
      isCamEnabled: true,
    });
  },

  acceptIncoming: async (fromUserId, offer) => {
    const socket = getSocket();
    const webrtc = getWebRTC();
    if (!socket) {
      set({ status: "failed", error: "Socket chưa kết nối." });
      return;
    }
    if (!webrtc?.RTCPeerConnection || !webrtc?.mediaDevices?.getUserMedia) {
      set({
        status: "failed",
        error:
          getWebRtcUnavailableReason() ||
          "WebRTC không khả dụng. Dùng dev build (không phải Expo Go).",
      });
      return;
    }
    if (!offer) {
      set({ status: "failed", error: "Không có offer cho incoming call." });
      return;
    }

    get().endCall();
    set({ status: "connecting", role: "callee", peerUserId: fromUserId, error: null });

    const pc = new webrtc.RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    const localStream = await webrtc.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    for (const track of safeGetTracks(localStream)) {
      pc.addTrack(track, localStream);
    }

    pc.ontrack = (ev: any) => {
      const stream = ev?.streams?.[0];
      if (stream) set({ remoteStream: stream });
    };

    pc.onicecandidate = (ev: any) => {
      if (ev?.candidate) {
        socket.emit("iceCandidate", { to: fromUserId, candidate: ev.candidate });
      }
    };

    const cleanupSocket = () => {
      socket.off("iceCandidate");
      socket.off("hangup");
    };

    socket.on("iceCandidate", async ({ from, candidate }: RemoteIcePayload) => {
      if (from && String(from) !== String(fromUserId)) return;
      if (!candidate) return;
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    });

    socket.on("hangup", ({ from }: { from: string }) => {
      if (from && String(from) !== String(fromUserId)) return;
      get().endCall("Remote hangup");
    });

    await pc.setRemoteDescription(offer as any);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answerCall", { to: fromUserId, answer });

    useAuthStore.getState().clearIncomingCall();

    set({
      _pc: pc,
      localStream,
      _unsubSocket: cleanupSocket,
      isMicEnabled: true,
      isCamEnabled: true,
    });
  },

  endCall: (reason) => {
    const { _pc, localStream, remoteStream, _unsubSocket, peerUserId } = get();
    const socket = getSocket();

    _unsubSocket?.();

    try {
      for (const t of safeGetTracks(localStream)) t.stop?.();
    } catch {
      // ignore
    }
    try {
      for (const t of safeGetTracks(remoteStream)) t.stop?.();
    } catch {
      // ignore
    }
    try {
      _pc?.close?.();
    } catch {
      // ignore
    }

    if (peerUserId && socket) {
      // best-effort notify, backend handles who is "from"
      socket.emit("hangup", { to: peerUserId });
    }

    set({
      status: reason ? "ended" : "idle",
      role: null,
      peerUserId: null,
      error: reason || null,
      localStream: null,
      remoteStream: null,
      _pc: null,
      _unsubSocket: null,
      isMicEnabled: true,
      isCamEnabled: true,
    });
  },

  toggleMic: () => {
    const next = !get().isMicEnabled;
    const s = get().localStream;
    setTrackEnabled(s, "audio", next);
    set({ isMicEnabled: next });
  },

  toggleCam: () => {
    const next = !get().isCamEnabled;
    const s = get().localStream;
    setTrackEnabled(s, "video", next);
    set({ isCamEnabled: next });
  },
}));

