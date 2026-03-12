import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTripById, updateTripDetails, inviteToTrip } from "../api/trips";
import { getFriends } from "../api/friends";
import {
  MapPin,
  CalendarDays,
  DollarSign,
  Users,
  Plus,
  ArrowLeft,
  Plane,
  Hotel,
  Utensils,
  Camera,
  UserPlus,
  Check,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { toast } from "react-hot-toast";
import TripChat from "../components/TripChat";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(null); // 'attractions', 'accommodations', 'transport', 'dining'
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchTrip();
    fetchFriends();
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      const res = await getTripById(tripId);
      setTrip(res.data.data);
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast.error("Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await getFriends();
      setFriends(res.data.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddDetail = async (e) => {
    e.preventDefault();
    try {
      await updateTripDetails(tripId, showAddForm, formData);
      toast.success(`${showAddForm} added successfully`);
      setShowAddForm(null);
      setFormData({});
      fetchTrip();
    } catch (error) {
      toast.error("Failed to add detail");
    }
  };

  const handleInviteFriend = async (friendId) => {
    try {
      await inviteToTrip(tripId, friendId);
      toast.success("Invitation sent");
      fetchTrip();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send invitation");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading trip...</div>;
  if (!trip) return <div className="p-10 text-center text-red-500">Trip not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/dashboard/planner")} className="gap-2">
          <ArrowLeft size={16} /> Back to Trips
        </Button>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus size={16} /> Invite Friends
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Friends to {trip.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No friends to invite</p>
              ) : (
                friends.map((friend) => {
                  const isMember = trip.members.some((m) => m._id === friend._id);
                  const isInvited = trip.invitations.some((i) => i._id === friend._id);
                  return (
                    <div key={friend._id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar?.url} />
                          <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{friend.username}</span>
                      </div>
                      {isMember ? (
                        <Badge variant="secondary">Member</Badge>
                      ) : isInvited ? (
                        <Badge variant="outline" className="text-yellow-600">Invited</Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleInviteFriend(friend._id)}>
                          Invite
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trip Info Card */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">{trip.name}</h2>
              <div className="flex items-center gap-4 mt-2 opacity-90">
                <div className="flex items-center gap-1">
                  <MapPin size={16} /> {trip.destination}
                </div>
                <div className="flex items-center gap-1">
                  <CalendarDays size={16} /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs opacity-70 uppercase tracking-wider font-semibold">Budget</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <DollarSign size={20} /> {trip.budget.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 pt-4 border-t border-white/20">
            <Users size={16} />
            <span className="text-sm font-medium">Members:</span>
            <div className="flex -space-x-2 ml-2">
              {trip.members.map((member) => (
                <Avatar key={member._id} className="h-7 w-7 border-2 border-indigo-600">
                  <AvatarImage src={member.avatar?.url} />
                  <AvatarFallback className="text-[10px] bg-indigo-500">{member.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planning Sections */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attractions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="text-pink-500" size={20} /> Attractions & Destinations
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm('attractions')}>
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {trip.attractions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No attractions added yet</p>
              ) : (
                trip.attractions.map((attr, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="font-semibold text-sm">{attr.name}</p>
                    <p className="text-xs text-gray-500">{attr.location}</p>
                    {attr.date && <p className="text-[10px] text-indigo-600 mt-1">{formatDate(attr.date)}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Accommodations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hotel className="text-blue-500" size={20} /> Accommodations
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm('accommodations')}>
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {trip.accommodations.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No accommodations added yet</p>
              ) : (
                trip.accommodations.map((acc, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="font-semibold text-sm">{acc.name}</p>
                    <p className="text-xs text-gray-500">{acc.address}</p>
                    <p className="text-[10px] text-indigo-600 mt-1">
                      {formatDate(acc.checkIn)} - {formatDate(acc.checkOut)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Transport */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plane className="text-green-500" size={20} /> Transport
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm('transport')}>
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {trip.transport.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No transport details added yet</p>
              ) : (
                trip.transport.map((trans, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <Badge variant="secondary" className="mb-1 text-[10px] h-4">{trans.type}</Badge>
                    <p className="text-sm font-medium">{trans.details}</p>
                    <p className="text-[10px] text-indigo-600 mt-1">
                      Dep: {formatDateTime(trans.departureTime)} | Arr: {formatDateTime(trans.arrivalTime)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Dining */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Utensils className="text-orange-500" size={20} /> Dining Options
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm('dining')}>
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {trip.dining.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No dining options added yet</p>
              ) : (
                trip.dining.map((dine, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="font-semibold text-sm">{dine.restaurantName}</p>
                    <p className="text-xs text-gray-500">{dine.cuisine}</p>
                    <p className="text-[10px] text-indigo-600 mt-1">{formatDateTime(dine.dateTime)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:col-span-1">
          <TripChat tripId={trip._id} members={trip.members} />
        </div>
      </div>

      {/* Add Form Dialog */}
      <Dialog open={!!showAddForm} onOpenChange={() => setShowAddForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Add {showAddForm}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDetail} className="space-y-4">
            {showAddForm === 'attractions' && (
              <>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" required onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input name="location" required onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" name="date" onChange={handleInputChange} />
                </div>
              </>
            )}
            {showAddForm === 'accommodations' && (
              <>
                <div className="space-y-2">
                  <Label>Hotel/Place Name</Label>
                  <Input name="name" required onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" required onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in</Label>
                    <Input type="date" name="checkIn" onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out</Label>
                    <Input type="date" name="checkOut" onChange={handleInputChange} />
                  </div>
                </div>
              </>
            )}
            {showAddForm === 'transport' && (
              <>
                <div className="space-y-2">
                  <Label>Type (e.g. Flight, Train)</Label>
                  <Input name="type" required onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Details (e.g. Flight No.)</Label>
                  <Input name="details" required onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure</Label>
                    <Input type="datetime-local" name="departureTime" onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival</Label>
                    <Input type="datetime-local" name="arrivalTime" onChange={handleInputChange} />
                  </div>
                </div>
              </>
            )}
            {showAddForm === 'dining' && (
              <>
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input name="restaurantName" required onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Cuisine</Label>
                  <Input name="cuisine" onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" name="dateTime" onChange={handleInputChange} />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
