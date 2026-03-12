import React, { useState, useEffect } from "react";
import { Users, UserMinus, Search, Mail } from "lucide-react";
import { getFriends } from "../api/friends";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
    <div className="p-6">
      <Card className="max-w-4xl mx-auto border-none shadow-sm bg-white/80 backdrop-blur-md">
        <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" />
              Your Friends
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Manage your connections and travel buddies
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filter friends..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredFriends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => (
                <div
                  key={friend._id}
                  className="flex items-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-200 group"
                >
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm mr-4">
                    <AvatarImage src={friend.avatar?.url} alt={friend.username} />
                    <AvatarFallback>{friend.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {friend.username}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Mail size={12} className="mr-1" />
                      <span className="truncate">{friend.email}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-opacity rounded-full"
                    title="Remove Friend"
                  >
                    <UserMinus size={18} />
                  </Button>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No friends found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-blue-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No friends yet</h3>
              <p className="text-gray-500 mt-1 max-w-xs mx-auto">
                Search for other users and send friend requests to start building your travel circle!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
