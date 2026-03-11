import React, { useState } from 'react';
import { Send } from 'lucide-react';

export default function AgentChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I am your AI Agent. I can help suggest destinations, find flights, and plan activities.', sender: 'agent' },
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    // Add user message to UI
    setMessages(prev => [...prev, { id: Date.now(), text: inputValue, sender: 'user' }]);
    setInputValue('');
    
    // TODO: Integrate actual agent backend here
    // Mocking agent response delay
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now(), text: 'This is a mocked agent response. Hook this up to your LLM or backend API.', sender: 'agent' }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
        <h2 className="font-semibold text-gray-800">Agent Workspace</h2>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 block"></span>
          Online
        </span>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      
      {/* Input Area */}
      <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg flex items-center gap-2">
        <input 
          type="text" 
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Ask for suggestions..." 
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-sm"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
