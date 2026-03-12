import React, { useState, useEffect } from "react";
import { Bell, UserCheck, UserX, UserPlus } from "lucide-react";
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from "../api/friends";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";

export default function FriendRequests() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await getFriendRequests();
      setRequests(response.data.data);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Poll for requests every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (senderId) => {
    try {
      await acceptFriendRequest(senderId);
      setRequests(requests.filter((req) => req._id !== senderId));
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleReject = async (senderId) => {
    try {
      await rejectFriendRequest(senderId);
      setRequests(requests.filter((req) => req._id !== senderId));
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-600 hover:bg-gray-100 rounded-full">
          <Bell size={20} />
          {requests.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 border-2 border-white text-[10px] text-white">
              {requests.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Friend Requests
            {requests.length > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {requests.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 max-h-60 overflow-y-auto space-y-3">
          {loading && requests.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
          ) : requests.length > 0 ? (
            requests.map((request) => (
              <div
                key={request._id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarImage src={request.avatar?.url} alt={request.username} />
                    <AvatarFallback>{request.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{request.username}</p>
                    <p className="text-xs text-gray-500">wants to be friends</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600 hover:bg-green-50 rounded-full"
                    onClick={() => handleAccept(request._id)}
                    title="Accept"
                  >
                    <UserCheck size={18} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full"
                    onClick={() => handleReject(request._id)}
                    title="Decline"
                  >
                    <UserX size={18} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="bg-gray-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus size={20} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No new requests</p>
              <p className="text-gray-400 text-xs mt-1">When someone adds you, it'll show up here</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
