import React, { useState, useEffect } from "react";
import { Bell, UserCheck, UserX, UserPlus, Plane, Check, X } from "lucide-react";
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from "../api/friends";
import { getTripInvitations, respondToTripInvitation } from "../api/trips";
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
import { toast } from "react-hot-toast";

export default function FriendRequests() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [tripInvites, setTripInvites] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [friendRes, tripRes] = await Promise.all([
        getFriendRequests(),
        getTripInvitations()
      ]);
      setRequests(friendRes.data.data);
      setTripInvites(tripRes.data.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptFriend = async (senderId) => {
    try {
      await acceptFriendRequest(senderId);
      setRequests(requests.filter((req) => req._id !== senderId));
      toast.success("Friend request accepted");
    } catch (error) {
      toast.error("Failed to accept request");
    }
  };

  const handleRejectFriend = async (senderId) => {
    try {
      await rejectFriendRequest(senderId);
      setRequests(requests.filter((req) => req._id !== senderId));
    } catch (error) {
      toast.error("Failed to reject request");
    }
  };

  const handleTripResponse = async (tripId, accept) => {
    try {
      await respondToTripInvitation(tripId, accept);
      setTripInvites(tripInvites.filter((invite) => invite._id !== tripId));
      toast.success(`Trip invitation ${accept ? "accepted" : "rejected"}`);
    } catch (error) {
      toast.error("Failed to respond to trip invitation");
    }
  };

  const totalCount = requests.length + tripInvites.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-600 hover:bg-gray-100 rounded-full">
          <Bell size={20} />
          {totalCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 border-2 border-white text-[10px] text-white">
              {totalCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Notifications
            {totalCount > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {totalCount}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 max-h-96 overflow-y-auto space-y-4">
          {/* Friend Requests Section */}
          {requests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Friend Requests</h3>
              {requests.map((request) => (
                <div key={request._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                      <AvatarImage src={request.avatar?.url} alt={request.username} />
                      <AvatarFallback>{request.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{request.username}</p>
                      <p className="text-xs text-gray-500">wants to be friends</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50 rounded-full" onClick={() => handleAcceptFriend(request._id)}>
                      <Check size={18} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleRejectFriend(request._id)}>
                      <X size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trip Invitations Section */}
          {tripInvites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Trip Invitations</h3>
              {tripInvites.map((invite) => (
                <div key={invite._id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Plane size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{invite.name}</p>
                      <p className="text-xs text-gray-500">Invited by {invite.createdBy?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50 rounded-full" onClick={() => handleTripResponse(invite._id, true)}>
                      <Check size={18} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleTripResponse(invite._id, false)}>
                      <X size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalCount === 0 && (
            <div className="text-center py-8">
              <div className="bg-gray-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell size={20} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No new notifications</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
