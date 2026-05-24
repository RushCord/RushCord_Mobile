import { NativeModules } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

type AnyFn = (...args: any[]) => any;

export type WebRTCModule = {
  RTCPeerConnection?: any;
  RTCIceCandidate?: any;
  RTCSessionDescription?: any;
  RTCView?: any;
  mediaDevices?: {
    getUserMedia?: AnyFn;
    enumerateDevices?: AnyFn;
  };
};

let cached: WebRTCModule | null | undefined;
let lastUnavailableReason: string | null = null;

/**
 * Why WebRTC is not usable (Expo Go, missing native build, etc.).
 * Call after getWebRTC() has run at least once.
 */
export function getWebRtcUnavailableReason(): string | null {
  return lastUnavailableReason;
}

function setUnavailable(reason: string): null {
  lastUnavailableReason = reason;
  cached = null;
  return null;
}

/**
 * Returns react-native-webrtc module only when the native WebRTCModule is linked
 * (development / production build). Always null in Expo Go.
 */
export function getWebRTC(): WebRTCModule | null {
  if (cached !== undefined) {
    return cached;
  }

  lastUnavailableReason = null;

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return setUnavailable(
      "Expo Go không chứa WebRTC native. Cài app dev build: chạy `npx expo run:android` (hoặc `run:ios`) trong thư mục project sau khi `npx expo prebuild`.",
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-webrtc") as WebRTCModule;
    if (!NativeModules.WebRTCModule) {
      return setUnavailable(
        "Native WebRTC chưa được link. Không dùng Expo Go — build lại app: `npx expo prebuild` rồi `npx expo run:android`.",
      );
    }
    cached = mod;
    return mod;
  } catch {
    return setUnavailable(
      "Không tải được react-native-webrtc. Chạy `npm install` rồi build native: `npx expo prebuild` và `npx expo run:android`.",
    );
  }
}
