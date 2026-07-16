import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../middlewares/auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "bingo_secret_key_change_in_production";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        (socket as unknown as { user: JwtPayload }).user = payload;
      } catch {
        // Allow unauthenticated connections (read-only observers)
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    socket.on("joinGame", (gameId: number) => {
      socket.join(`game:${gameId}`);
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically
    });
  });

  return io;
}

export function getIo(): SocketIOServer | null {
  return io;
}
