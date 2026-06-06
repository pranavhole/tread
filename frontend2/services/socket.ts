import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

let socketInstance: Socket | null = null;

export const getSocket = () => {
  if (typeof window === "undefined") return null;

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket"],
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance?.id);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  }

  return socketInstance;
};
