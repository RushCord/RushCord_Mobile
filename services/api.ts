import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from "@/constants/config";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
});

// Mỗi request: đọc jwt cookie từ SecureStore, gắn vào header
axiosInstance.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Cookie = `jwt=${token}`;
  }
  return config;
});

// Mỗi response: nếu server set-cookie jwt → lưu vào SecureStore
axiosInstance.interceptors.response.use(
  async (response) => {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      for (const cookie of cookies) {
        if (cookie.startsWith("jwt=")) {
          const token = cookie.split(";")[0].replace("jwt=", "").trim();
          if (token) {
            await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
          } else {
            // jwt= rỗng nghĩa là logout
            await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
          }
          break;
        }
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    }
    return Promise.reject(error);
  }
);
