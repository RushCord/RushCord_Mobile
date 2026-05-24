// Android Emulator  → "10.0.2.2"
// iOS Simulator     → "localhost"
// Device thật       → IP máy tính (vd: "192.168.1.5")

export const API_BASE_URL = `http://192.168.1.74:3000/api`;
export const SOCKET_URL = `http://192.168.1.74:3000`;

export const API_TIMEOUT = 10000;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user_data",
} as const;
