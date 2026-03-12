import React, { useState, useEffect } from "react";
import { Search, UserPlus, Check, Clock, UserCheck } from "lucide-react";
import { searchUsers, sendFriendRequest } from "../api/friends";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import api from "../api/axios";
export default function UserSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query) {
        handleSearch();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      console.log(query);

      const response = await searchUsers(query);
      setUsers(response.data.data);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      // Update local state to show pending
      setUsers(
        users.map((user) =>
          user._id === userId ? { ...user, status: "pending" } : user,
        ),
      );
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "friends":
        return <UserCheck className="text-green-500" size={18} />;
      case "pending":
        return <Clock className="text-yellow-500" size={18} />;
      case "incoming":
        return <Clock className="text-blue-500" size={18} />;
      default:
        return <UserPlus size={18} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "friends":
        return "Friends";
      case "pending":
        return "Request Sent";
      case "incoming":
        return "In Request";
      default:
        return "Add Friend";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <Search size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by username..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 max-h-60 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Searching...</div>
          ) : users.length > 0 ? (
            users.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarImage src={user.avatar?.url} alt={user.username} />
                    <AvatarFallback>
                      {user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={user.status === "none" ? "default" : "secondary"}
                  disabled={user.status !== "none"}
                  onClick={() => handleAddFriend(user._id)}
                  className="gap-1"
                >
                  {getStatusIcon(user.status)}
                  <span className="hidden sm:inline">
                    {getStatusText(user.status)}
                  </span>
                </Button>
              </div>
            ))
          ) : query ? (
            <div className="text-center py-4 text-gray-500">No users found</div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              Type a username to start searching
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
