import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Send, MessageSquare, Bot, Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getTripMessages } from "../api/trips";
import VoiceChat from "./VoiceChat";

const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL?.replace("/api/v1/", "") ||
  "http://localhost:8000";

export default function TripChat({ tripId, members, onNewMessage }) {
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
      // Notify parent about incoming messages from others
      const storedUser = (() => {
        try {
          const s = JSON.parse(localStorage.getItem("user"));
          return s?.data?.user || s?.user || s;
        } catch {
          return null;
        }
      })();
      const myId = storedUser?._id;
      const senderId =
        typeof message.sender === "object"
          ? message.sender?._id
          : message.sender;
      if (!message.isSystem && senderId !== myId) {
        onNewMessage?.();
      }
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
    <div className="flex flex-col h-[600px] w-full rounded-xl border border-[#E5E7EB] bg-[#F5F5F0] shadow-md overflow-hidden min-h-[500px]">
      {/* ── Header ── */}
      <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="text-[#6D4C41]" size={20} />
          <h3 className="font-semibold text-[#2C2C2C] font-['Playfair_Display']">
            Trip Chat
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium font-['Lato'] px-2.5 py-1 rounded-full bg-[#2E7D32]/10 text-[#2E7D32]">
            {members?.length || 0} online
          </span>
          <button
            onClick={handleJoinVoice}
            className="p-1.5 ml-1 bg-[#2E7D32]/10 text-[#2E7D32] hover:bg-[#2E7D32]/20 rounded-xl transition-colors border border-[#2E7D32]/20"
            title="Join Voice Chat (New Tab)"
          >
            <Mic size={16} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          if (msg.isSystem) {
            const isEndedMsg = msg.text?.toLowerCase().includes("ended");
            const isSessionOver =
              isEndedMsg ||
              messages
                .slice(idx + 1)
                .some(
                  (m) => m.isSystem && m.text?.toLowerCase().includes("ended"),
                );
            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center my-4"
              >
                <div
                  className={`flex flex-col items-center justify-center gap-2 px-6 py-3 rounded-2xl border shadow-sm max-w-[85%] ${
                    isSessionOver
                      ? "bg-white border-[#E5E7EB]"
                      : "bg-[#2E7D32]/5 border-[#2E7D32]/20"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-sm font-medium font-['Lato'] ${
                      isSessionOver ? "text-[#6D4C41]" : "text-[#2E7D32]"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-full ${
                        isSessionOver
                          ? "bg-[#E5E7EB] text-[#6D4C41]"
                          : "bg-[#2E7D32]/15 text-[#2E7D32] animate-pulse"
                      }`}
                    >
                      {isSessionOver ? <MicOff size={14} /> : <Mic size={14} />}
                    </div>
                    <span>{msg.text}</span>
                  </div>
                  {isSessionOver ? (
                    <span className="text-xs font-semibold font-['Lato'] px-4 py-1.5 bg-[#E5E7EB] text-[#6D4C41] rounded-full cursor-default">
                      Ended
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        window.open(`/dashboard/voice/${tripId}`, "_blank")
                      }
                      className="text-xs font-semibold font-['Lato'] px-4 py-1.5 bg-[#F4A261] text-white rounded-full hover:bg-[#e8944f] transition-colors shadow-sm"
                    >
                      Join
                    </button>
                  )}
                  {msg.createdAt && (
                    <span className="text-[10px] text-[#6D4C41]/50 mt-1 font-['Lato']">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
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
                  <AvatarFallback className="bg-[#6D4C41]/10 text-[#6D4C41] font-['Lato'] text-xs">
                    {senderInfo?.username?.[0]?.toUpperCase() || (
                      <Bot size={14} />
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm font-['Lato'] ${
                  isMe
                    ? "bg-[#2E7D32] text-white rounded-br-sm"
                    : "bg-white text-[#2C2C2C] rounded-bl-sm border border-[#E5E7EB]"
                }`}
              >
                {!isMe && (
                  <p className="text-[10px] font-semibold text-[#F4A261] mb-1 font-['Lato']">
                    {senderInfo?.username || "Agentic AI"}
                  </p>
                )}
                <p>{msg.text}</p>
                {msg.createdAt && (
                  <p
                    className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-[#6D4C41]/50"}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-[#E5E7EB] flex gap-2"
      >
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="bg-[#F5F5F0] border-[#E5E7EB] focus-visible:ring-[#2E7D32] rounded-full font-['Lato'] text-[#2C2C2C] placeholder:text-[#6D4C41]/40"
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-full bg-[#2E7D32] hover:bg-[#1b4b1e] shrink-0 text-white"
        >
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
