import React, { useState } from 'react';
import AgentChat from './AgentChat';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const DUMMY_DESTINATIONS = [
  { id: 1, name: 'Kyoto, Japan', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=500&fit=crop', price: '$1,200 est.' },
  { id: 2, name: 'Santorini, Greece', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5f1?w=800&h=500&fit=crop', price: '$1,500 est.' },
  { id: 3, name: 'Banff, Canada', image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&h=500&fit=crop', price: '$900 est.' },
  { id: 4, name: 'Marrakech, Morocco', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=500&fit=crop', price: '$1,100 est.' }
];

export default function Planner() {
  const [budget] = useState({ spent: 450, total: 3000 });
  const [votes, setVotes] = useState({});

  const handleVote = (id, type) => {
    // TODO: Wire this to a backend database or global state store for real-time collaboration
    setVotes(prev => {
      const currentDestVotes = prev[id] || { up: 0, down: 0 };
      return {
        ...prev,
        [id]: {
          ...currentDestVotes,
          [type]: currentDestVotes[type] + 1
        }
      };
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden gap-6 p-6">
      
   
      
      {/* Main Collab Workspace */}
      <div className="flex-1 flex flex-col overflow-y-auto pr-2 pb-4">
        
        {/* Budget Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Trip Budget</h2>
            <p className="text-sm text-gray-500">Track your estimated group expenses</p>
          </div>
          <div className="text-right w-1/3 min-w-[200px]">
            <p className="text-lg font-bold mb-1">
              <span className="text-blue-600">${budget.spent}</span> 
              <span className="text-gray-400 mx-1.5">/</span> 
              <span className="text-gray-800">${budget.total}</span>
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((budget.spent / budget.total) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Destination Grid */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">Agent Suggestions</h3>
          <p className="text-sm text-gray-500 mt-1">Vote on destinations for the next trip.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 auto-rows-max">
          {DUMMY_DESTINATIONS.map(dest => (
            <div key={dest.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md">
              <div className="h-48 overflow-hidden bg-gray-100 relative">
                <img 
                  src={dest.image} 
                  alt={dest.name} 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-sm font-semibold text-gray-800 shadow-sm">
                  {dest.price}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="font-bold text-lg text-gray-800 mb-4">{dest.name}</h4>
                <div className="mt-auto flex justify-between items-center border-t border-gray-100 pt-4">
                  <span className="text-sm text-gray-500 font-medium tracking-wide">TEAM VOTES</span>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleVote(dest.id, 'up')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:text-green-600 hover:bg-green-50 border border-gray-200 transition-colors"
                    >
                      <ThumbsUp size={16} /> <span className="font-medium">{votes[dest.id]?.up || 0}</span>
                    </button>
                    <button 
                      onClick={() => handleVote(dest.id, 'down')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors"
                    >
                      <ThumbsDown size={16} /> <span className="font-medium">{votes[dest.id]?.down || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
