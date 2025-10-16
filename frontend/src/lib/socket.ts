// utils/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const 
connectSocket = (userId: string) => {
   if (typeof window === "undefined") return null;
  
  if (!userId) throw new Error("connectSocket: userId is required");

  if (!socket) {
    socket = io("http://localhost:5001", {
      query: { userId },
      withCredentials: true,
      // transports: ["websocket"],
    });

    // Helpful client-side logs
    socket.on("connect", () => {
      console.log("[SOCKET CONNECTED]", socket?.id, "as user", userId);
    });
    console.log(socket,"socket");
    
    socket.on("connect_error", (err) => {
      console.error("[SOCKET CONNECT ERROR]", err.message);
    });
    socket.on("disconnect", (reason) => {
      console.log("[SOCKET DISCONNECTED]", reason);
    });
  }
  return socket;
};

export const getSocket = () => socket;
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
