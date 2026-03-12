import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./db/index.js";
import { createServer } from "http";
import { Server } from "socket.io";
import Message from "./models/Message.js";
const port = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on("join_trip", async (tripId) => {
    if (tripId) {
      socket.join(tripId);
      console.log(`Socket ${socket.id} joined trip ${tripId}`);

      try {
        const history = await Message.find({ tripId }).sort({ createdAt: 1 }).populate("sender", "username avatar");
        socket.emit("chat_history", history);
      } catch (err) {
        console.error("Error fetching chat history", err);
      }
    }
  });

  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        tripId: data.tripId,
        sender: data.sender._id || data.sender, // Support populated user or straight ID
        text: data.text,
      });
      await newMessage.save();

      // Broadcast to room
      io.to(data.tripId).emit("receive_message", {
        ...data,
        _id: newMessage._id,
        createdAt: newMessage.createdAt,
      });
    } catch (err) {
      console.error("Error saving message", err);
    }
  });

  socket.on("user_typing", (data) => {
    socket.to(data.tripId).emit("user_typing", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`🚀 Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });
