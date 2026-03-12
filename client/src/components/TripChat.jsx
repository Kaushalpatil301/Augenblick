import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Send, MessageSquare, Bot, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getTripMessages } from "../api/trips";
import VoiceChat from "./VoiceChat";

const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL?.replace("/api/v1/", "") ||
  "http://localhost:8000";

export default function TripChat({ tripId, members }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser?.data?.user) {
        setCurrentUser(storedUser.data.user);
      } else if (storedUser?.user) {
        setCurrentUser(storedUser.user);
      } else {
        setCurrentUser(storedUser);
      }
    } catch (err) {
      console.error("Failed to parse user from localStorage");
    }
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getTripMessages(tripId);
        setMessages(res.data.data);
      } catch (error) {
        console.error("Failed to load history", error);
      }
    };
    fetchHistory();

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join_trip", tripId);
    });

    newSocket.on("receive_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => newSocket.close();
  }, [tripId]);

  useEffect(() => {
    if (!messages?.length) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    // Allow messages even without strict currentUser definition just in case it fails to load
    if (!inputText.trim() || !socket) return;

    const msgData = {
      tripId,
      sender: currentUser?._id || "guest",
      text: inputText,
      createdAt: new Date().toISOString(),
    };

    socket.emit("send_message", msgData);
    setInputText("");
  };

  const handleJoinVoice = () => {
    const username = currentUser?.username || "A user";
    if (socket) {
      socket.emit("start_voice_chat", {
        tripId,
        sender: currentUser?._id || "guest",
        username,
      });
    }
    window.open(`/dashboard/voice/${tripId}`, "_blank");
  };

  return (
    <div className="flex flex-col h-[600px] w-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-[500px]">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-indigo-600" size={20} />
          <h3 className="font-semibold text-gray-800">Trip Chat</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
            {members?.length || 0} online
          </span>
          <button
            onClick={handleJoinVoice}
            className="p-1.5 ml-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
            title="Join Voice Chat (New Tab)"
          >
            <Mic size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          if (msg.isSystem) {
            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center my-4"
              >
                <div className="flex flex-col items-center justify-center gap-2 bg-indigo-50 px-6 py-3 rounded-3xl border border-indigo-100 shadow-sm max-w-[85%]">
                  <div className="flex items-center gap-2 text-indigo-800 text-sm font-medium">
                    <div className="p-1.5 bg-indigo-100 rounded-full text-indigo-600 animate-pulse">
                      <Mic size={14} />
                    </div>
                    <span>{msg.text}</span>
                  </div>
                  <button
                    onClick={() =>
                      window.open(`/dashboard/voice/${tripId}`, "_blank")
                    }
                    className="text-xs font-semibold px-4 py-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Join
                  </button>
                </div>
              </motion.div>
            );
          }

          const msgSenderId =
            typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
          const isMe = msgSenderId === (currentUser?._id || "guest");

          const senderInfo =
            typeof msg.sender === "object"
              ? msg.sender
              : members?.find((m) => m._id === msg.sender);

          return (
            <motion.div
              key={msg._id || idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={senderInfo?.avatar?.url} />
                  <AvatarFallback>
                    {senderInfo?.username?.[0]?.toUpperCase() || (
                      <Bot size={14} />
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {!isMe && (
                  <p className="text-[10px] font-medium text-indigo-600 mb-1">
                    {senderInfo?.username || "Agentic AI"}
                  </p>
                )}
                <p>{msg.text}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-gray-100 flex gap-2"
      >
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="bg-gray-50 border-gray-200 focus-visible:ring-indigo-500 rounded-full"
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-full bg-indigo-600 hover:bg-indigo-700 shrink-0 text-white"
        >
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
