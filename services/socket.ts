import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/constants/config";

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = (accessToken: string): Socket => {
  if (socket) {
    socket.auth = { token: accessToken };
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
};
