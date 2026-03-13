import React, { useState, useEffect } from "react";
import { Users, UserMinus, Search, Mail, Compass } from "lucide-react";
import { getFriends } from "../api/friends";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const response = await getFriends();
        setFriends(response.data.data);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] min-h-[calc(100vh-4rem)] relative">
      {/* Background textures */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          
          {/* Header */}
          <div className="px-6 py-6 md:py-8 border-b border-[#E5E7EB] bg-[#fdfbf9] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold font-['Playfair_Display'] text-[#2C2C2C] flex items-center gap-3">
                <Users className="text-[#2E7D32]" size={32} />
                Travel Companions
              </h2>
              <p className="text-[#6D4C41] text-base mt-2 font-medium">
                Manage your connections and find buddies for your next adventure.
              </p>
            </div>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6D4C41]/60" />
              <input
                type="text"
                placeholder="Find a friend..."
                className="w-full pl-10 pr-4 py-3 text-sm font-['Lato'] text-[#2C2C2C] bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32] transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-grow bg-[#F5F5F0]/30">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-[#6D4C41]">
                 <div className="w-10 h-10 border-4 border-[#2E7D32]/20 border-t-[#2E7D32] rounded-full animate-spin mb-4"></div>
                 <p className="text-lg font-medium">Gathering your crew...</p>
              </div>
            ) : filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend._id}
                    className="flex items-center p-4 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#2E7D32]/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <Avatar className="h-14 w-14 border border-[#E5E7EB] shadow-sm mr-4 ring-2 ring-transparent group-hover:ring-[#2E7D32]/20 transition-all">
                      <AvatarImage src={friend.avatar?.url} alt={friend.username} className="object-cover" />
                      <AvatarFallback className="bg-[#F5F5F0] text-[#6D4C41] font-bold text-lg">
                        {friend.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-lg text-[#2C2C2C] font-['Playfair_Display'] truncate group-hover:text-[#2E7D32] transition-colors">
                        {friend.username}
                      </p>
                      <div className="flex items-center text-xs text-[#6D4C41] mt-0.5">
                        <Mail size={12} className="mr-1.5 opacity-70" />
                        <span className="truncate">{friend.email}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-[#6D4C41]/50 hover:text-red-600 hover:bg-red-50 transition-all rounded-full h-8 w-8 shrink-0"
                      title="Remove Friend"
                    >
                      <UserMinus size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-center py-20">
                <p className="text-[#6D4C41] text-lg">No companions found matching <span className="font-bold">"{searchTerm}"</span>.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 h-full max-w-sm mx-auto">
                <div className="bg-[#2E7D32]/10 h-20 w-20 rounded-full flex items-center justify-center mb-6">
                  <Compass size={40} className="text-[#2E7D32]" />
                </div>
                <h3 className="text-2xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-3">No companions yet</h3>
                <p className="text-[#6D4C41] text-base leading-relaxed">
                  Search for other explorers and send friend requests to start building your travel circle! They'll show up here once they accept.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
