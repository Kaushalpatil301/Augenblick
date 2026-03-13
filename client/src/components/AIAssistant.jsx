import React, { useState } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { chatItineraryWithGemini } from "../api/trips";
import { toast } from "react-hot-toast";

export default function AIAssistant({ tripId, onItineraryUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your AI Travel Agent. Tell me what changes you'd like to make to your itinerary." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || !tripId) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatItineraryWithGemini(tripId, userMessage);
      const explanation = response.data?.data?.explanation || "I've updated your itinerary based on your request!";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: explanation }
      ]);
      if (onItineraryUpdated) {
        onItineraryUpdated();
      }
      toast.success("Itinerary updated by AI");
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error trying to update the itinerary." }
      ]);
      toast.error("Failed to update itinerary");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#2E7D32] text-white p-4 rounded-full shadow-lg hover:bg-[#2E7D32]/90 transition-all z-50 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E7D32]"
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-[#E5E7EB] z-50 flex flex-col font-['Lato'] overflow-hidden">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <h3 className="font-semibold font-['Playfair_Display'] text-lg">AI Travel Agent</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white hover:text-white/80">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="p-4 flex-1 h-80 overflow-y-auto space-y-4 bg-[#F5F5F0]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-[#6D4C41] text-white rounded-br-none"
                  : "bg-white border border-[#E5E7EB] text-[#2C2C2C] rounded-bl-none shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E5E7EB] text-[#2C2C2C] p-3 rounded-lg rounded-bl-none flex items-center gap-2 shadow-sm">
              <Loader2 size={16} className="animate-spin text-[#2E7D32]" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-[#E5E7EB] flex flex-col gap-2">
        <Textarea
          placeholder="E.g., Change day 2 hotel to a cheaper one..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[60px] max-h-[100px] text-sm resize-none focus-visible:ring-[#2E7D32]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button 
          onClick={handleSend} 
          disabled={loading || !input.trim()}
          className="w-full bg-[#F4A261] hover:bg-[#F4A261]/90 text-white gap-2 h-9"
        >
          <Send size={16} /> Send to AI
        </Button>
      </div>
    </div>
  );
}
