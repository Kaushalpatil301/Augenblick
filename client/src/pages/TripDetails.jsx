import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTripById,
  updateTripDetails,
  inviteToTrip,
  addDestination,
  removeDestination,
  updateTripRoute,
} from "../api/trips";
import { getFriends } from "../api/friends";
import DestinationMapPicker from "../components/DestinationMapPicker";
import HotelPicker from "../components/HotelPicker";
import TripMap from "../components/TripMap";
import {
  MapPin,
  CalendarDays,
  DollarSign,
  Users,
  Plus,
  ArrowLeft,
  ArrowRight,
  Plane,
  Hotel,
  Utensils,
  Camera,
  UserPlus,
  Check,
  X,
  Navigation,
  Pencil,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { toast } from "react-hot-toast";
import TripChat from "../components/TripChat";
import Itinerary from "../components/Itinerary";

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
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Form states
  const [showAddForm, setShowAddForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [destForm, setDestForm] = useState({ city: "", country: "" });
  const [addingDest, setAddingDest] = useState(false);
  const [pickingHotel, setPickingHotel] = useState(false);

  // Route editing
  const [editingRoute, setEditingRoute] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [sameAsOrigin, setSameAsOrigin] = useState(false);
  const [routeForm, setRouteForm] = useState({
    originQuery: "",
    destQuery: "",
    origin: null,
    mainDestination: null,
  });
  const [routeOriginResults, setRouteOriginResults] = useState([]);
  const [routeDestResults, setRouteDestResults] = useState([]);
  const routeSearchTimeouts = useRef({ origin: null, dest: null });

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

  const handleAddDestination = async (place) => {
    try {
      await addDestination(tripId, {
        city: place.city,
        country: place.country,
        displayName: place.displayName,
        lat: place.lat,
        lng: place.lng,
      });
      fetchTrip();
    } catch (error) {
      toast.error("Failed to add destination");
      throw error;
    }
  };

  const handleRouteSearch = (field, q) => {
    if (field === "origin")
      setRouteForm((prev) => ({ ...prev, originQuery: q }));
    else setRouteForm((prev) => ({ ...prev, destQuery: q }));

    clearTimeout(routeSearchTimeouts.current[field]);
    if (!q.trim()) {
      if (field === "origin") setRouteOriginResults([]);
      else setRouteDestResults([]);
      return;
    }
    routeSearchTimeouts.current[field] = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en" } },
        );
        const results = await res.json();
        if (field === "origin") setRouteOriginResults(results);
        else setRouteDestResults(results);
      } catch {}
    }, 400);
  };

  const handleRouteSelect = (field, result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      result.display_name.split(",")[0];
    const country = addr.country || "";
    const place = { city, country, displayName: result.display_name, lat, lng };

    if (field === "origin") {
      setRouteForm((prev) => ({
        ...prev,
        origin: place,
        originQuery: `${city}${country ? `, ${country}` : ""}`,
        ...(sameAsOrigin ? { mainDestination: place } : {}),
      }));
      setRouteOriginResults([]);
    } else {
      setRouteForm((prev) => ({
        ...prev,
        mainDestination: place,
        destQuery: `${city}${country ? `, ${country}` : ""}`,
      }));
      setRouteDestResults([]);
    }
  };

  const handleSameAsOriginToggle = (checked) => {
    setSameAsOrigin(checked);
    if (checked && routeForm.origin) {
      setRouteForm((prev) => ({ ...prev, mainDestination: prev.origin }));
    }
  };

  const handleSaveRoute = async () => {
    setSavingRoute(true);
    try {
      const finalDest = sameAsOrigin
        ? routeForm.origin
        : routeForm.mainDestination;
      await updateTripRoute(tripId, {
        origin: routeForm.origin,
        mainDestination: finalDest,
      });
      toast.success("Route updated");
      setEditingRoute(false);
      fetchTrip();
    } catch {
      toast.error("Failed to update route");
    } finally {
      setSavingRoute(false);
    }
  };

  const openRouteEditor = () => {
    setRouteForm({
      originQuery: trip?.origin?.city
        ? `${trip.origin.city}${trip.origin.country ? `, ${trip.origin.country}` : ""}`
        : "",
      destQuery: trip?.mainDestination?.city
        ? `${trip.mainDestination.city}${trip.mainDestination.country ? `, ${trip.mainDestination.country}` : ""}`
        : "",
      origin: trip?.origin?.city ? trip.origin : null,
      mainDestination: trip?.mainDestination?.city
        ? trip.mainDestination
        : null,
    });
    setSameAsOrigin(
      !!(
        trip?.origin?.city &&
        trip?.mainDestination?.city &&
        trip.origin.city === trip.mainDestination.city
      ),
    );
    setEditingRoute(true);
  };

  const handleRemoveDestination = async (destId) => {
    try {
      await removeDestination(tripId, destId);
      fetchTrip();
    } catch (error) {
      toast.error("Failed to remove destination");
    }
  };

  const handleAddHotel = async (hotelData) => {
    try {
      await updateTripDetails(tripId, "accommodations", hotelData);
      toast.success("Hotel added");
      fetchTrip();
    } catch {
      toast.error("Failed to add hotel");
    }
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
  if (!trip)
    return <div className="p-10 text-center text-red-500">Trip not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/trips")}
            className="gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Trips
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <TabsList className="h-10 bg-transparent p-0 gap-2">
              <TabsTrigger
                value="overview"
                className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                Map
              </TabsTrigger>
              <TabsTrigger
                value="planning"
                className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                Planning
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setItineraryOpen(true)}
            >
              <CalendarDays size={16} /> View Itinerary
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare size={16} /> Trip Chat
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
                    <p className="text-center text-gray-500 py-4">
                      No friends to invite
                    </p>
                  ) : (
                    friends.map((friend) => {
                      const isMember = trip.members.some(
                        (m) => m._id === friend._id,
                      );
                      const isInvited = trip.invitations.some(
                        (i) => i._id === friend._id,
                      );
                      return (
                        <div
                          key={friend._id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={friend.avatar?.url} />
                              <AvatarFallback>
                                {friend.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {friend.username}
                            </span>
                          </div>
                          {isMember ? (
                            <Badge variant="secondary">Member</Badge>
                          ) : isInvited ? (
                            <Badge
                              variant="outline"
                              className="text-yellow-600"
                            >
                              Invited
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleInviteFriend(friend._id)}
                            >
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
        </div>

        {/* Trip Info Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">{trip.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 opacity-90">
                  {trip.destinations?.length > 0 ? (
                    trip.destinations.map((d) => (
                      <span
                        key={d._id}
                        className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs"
                      >
                        <MapPin size={11} /> {d.city}, {d.country}
                      </span>
                    ))
                  ) : (
                    <span className="flex items-center gap-1 opacity-70 text-sm">
                      <MapPin size={14} /> No destinations yet
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarDays size={16} /> {formatDate(trip.startDate)} -{" "}
                    {formatDate(trip.endDate)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs opacity-70 uppercase tracking-wider font-semibold">
                    Budget
                  </p>
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
                  <Avatar
                    key={member._id}
                    className="h-7 w-7 border-2 border-indigo-600"
                  >
                    <AvatarImage src={member.avatar?.url} />
                    <AvatarFallback className="text-[10px] bg-indigo-500">
                      {member.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Trip Route Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Navigation className="text-indigo-500" size={20} /> Trip Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">
                    Origin
                  </p>
                  {trip.origin?.city ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="font-medium text-sm">
                        {trip.origin.city}
                        {trip.origin.country ? `, ${trip.origin.country}` : ""}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Not set</p>
                  )}
                </div>
                <ArrowRight size={18} className="text-gray-300 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">
                    Main Destination
                  </p>
                  {trip.mainDestination?.city ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="font-medium text-sm">
                        {trip.mainDestination.city}
                        {trip.mainDestination.country
                          ? `, ${trip.mainDestination.country}`
                          : ""}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Not set</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinations (Read-only) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="text-blue-500" size={20} /> Destinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {!trip.destinations?.length ? (
                  <p className="text-sm text-gray-500 italic">
                    No destinations added yet.
                  </p>
                ) : (
                  trip.destinations.map((dest) => (
                    <div
                      key={dest._id}
                      className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full"
                    >
                      <MapPin size={12} />
                      {dest.city}, {dest.country}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Planning Details (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="text-pink-500" size={20} /> Attractions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!trip.attractions?.length ? (
                  <p className="text-sm text-gray-500 italic">
                    No attractions added yet
                  </p>
                ) : (
                  trip.attractions.map((attr, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <p className="font-semibold text-sm">{attr.name}</p>
                      <p className="text-xs text-gray-500">{attr.location}</p>
                      {attr.date && (
                        <p className="text-[10px] text-indigo-600 mt-1">
                          {formatDate(attr.date)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hotel className="text-blue-500" size={20} /> Accommodations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!trip.accommodations?.length ? (
                  <p className="text-sm text-gray-500 italic">
                    No accommodations added yet
                  </p>
                ) : (
                  trip.accommodations.map((acc, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <p className="font-semibold text-sm">{acc.name}</p>
                      <p className="text-xs text-gray-500">{acc.address}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-indigo-600">
                          {formatDate(acc.checkIn)} - {formatDate(acc.checkOut)}
                        </p>
                        {acc.priceTotal && (
                          <span className="text-[10px] font-semibold text-green-600">
                            {acc.priceCurrency} {acc.priceTotal}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plane className="text-green-500" size={20} /> Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!trip.transport?.length ? (
                  <p className="text-sm text-gray-500 italic">
                    No transport details added yet
                  </p>
                ) : (
                  trip.transport.map((trans, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Badge
                        variant="secondary"
                        className="mb-1 text-[10px] h-4"
                      >
                        {trans.type}
                      </Badge>
                      <p className="text-sm font-medium">{trans.details}</p>
                      <p className="text-[10px] text-indigo-600 mt-1">
                        Dep: {formatDateTime(trans.departureTime)} | Arr:{" "}
                        {formatDateTime(trans.arrivalTime)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Utensils className="text-orange-500" size={20} /> Dining
                  Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!trip.dining?.length ? (
                  <p className="text-sm text-gray-500 italic">
                    No dining options added yet
                  </p>
                ) : (
                  trip.dining.map((dine, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <p className="font-semibold text-sm">
                        {dine.restaurantName}
                      </p>
                      <p className="text-xs text-gray-500">{dine.cuisine}</p>
                      <p className="text-[10px] text-indigo-600 mt-1">
                        {formatDateTime(dine.dateTime)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="text-purple-500" size={20} /> Trip Overview
                Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TripMap trip={trip} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning" className="space-y-6">
          {/* Destinations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="text-blue-500" size={20} /> Destinations
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingDest(true)}
                className="gap-1"
              >
                <Plus size={14} /> Add City
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(!trip.destinations || trip.destinations.length === 0) &&
                  !addingDest && (
                    <p className="text-sm text-gray-500 italic">
                      No destinations added yet. Add cities you plan to visit.
                    </p>
                  )}
                {trip.destinations?.map((dest) => (
                  <div
                    key={dest._id}
                    className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full"
                  >
                    <MapPin size={12} />
                    {dest.city}, {dest.country}
                    <button
                      onClick={() => handleRemoveDestination(dest._id)}
                      className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Map picker dialog */}
              {addingDest && (
                <Dialog
                  open={addingDest}
                  onOpenChange={(o) => !o && setAddingDest(false)}
                >
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Pick Destinations on Map</DialogTitle>
                    </DialogHeader>
                    <DestinationMapPicker
                      onAdd={handleAddDestination}
                      onClose={() => setAddingDest(false)}
                      existingDestinations={trip.destinations || []}
                      origin={trip.origin}
                      mainDestination={trip.mainDestination}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Planning Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attractions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="text-pink-500" size={20} /> Attractions &
                  Destinations
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm("attractions")}
                >
                  <Plus size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {trip.attractions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No attractions added yet
                  </p>
                ) : (
                  trip.attractions.map((attr, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <p className="font-semibold text-sm">{attr.name}</p>
                      <p className="text-xs text-gray-500">{attr.location}</p>
                      {attr.date && (
                        <p className="text-[10px] text-indigo-600 mt-1">
                          {formatDate(attr.date)}
                        </p>
                      )}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPickingHotel(true)}
                >
                  <Plus size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {trip.accommodations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No accommodations added yet
                  </p>
                ) : (
                  trip.accommodations.map((acc, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <p className="font-semibold text-sm">{acc.name}</p>
                      <p className="text-xs text-gray-500">{acc.address}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-indigo-600">
                          {formatDate(acc.checkIn)} - {formatDate(acc.checkOut)}
                        </p>
                        {acc.priceTotal && (
                          <span className="text-[10px] font-semibold text-green-600">
                            {acc.priceCurrency} {acc.priceTotal}
                          </span>
                        )}
                      </div>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm("transport")}
                >
                  <Plus size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {trip.transport.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No transport details added yet
                  </p>
                ) : (
                  trip.transport.map((trans, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Badge
                        variant="secondary"
                        className="mb-1 text-[10px] h-4"
                      >
                        {trans.type}
                      </Badge>
                      <p className="text-sm font-medium">{trans.details}</p>
                      <p className="text-[10px] text-indigo-600 mt-1">
                        Dep: {formatDateTime(trans.departureTime)} | Arr:{" "}
                        {formatDateTime(trans.arrivalTime)}
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
                  <Utensils className="text-orange-500" size={20} /> Dining
                  Options
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm("dining")}
                >
                  <Plus size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {trip.dining.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No dining options added yet
                  </p>
                ) : (
                  trip.dining.map((dine, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <p className="font-semibold text-sm">
                        {dine.restaurantName}
                      </p>
                      <p className="text-xs text-gray-500">{dine.cuisine}</p>
                      <p className="text-[10px] text-indigo-600 mt-1">
                        {formatDateTime(dine.dateTime)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <Dialog
        open={editingRoute}
        onOpenChange={(o) => {
          if (!o) setEditingRoute(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Trip Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Origin */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                Origin (Departure City)
              </label>
              <div className="relative">
                <Input
                  placeholder="e.g. New York, USA"
                  value={routeForm.originQuery}
                  onChange={(e) => handleRouteSearch("origin", e.target.value)}
                />
                {routeOriginResults.length > 0 && (
                  <div className="absolute z-[9999] top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {routeOriginResults.map((r) => (
                      <button
                        key={r.place_id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0 truncate"
                        onClick={() => handleRouteSelect("origin", r)}
                      >
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {routeForm.origin?.city && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check size={11} /> {routeForm.origin.city},{" "}
                  {routeForm.origin.country}
                </p>
              )}
            </div>

            {/* Same as origin checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sameAsOrigin"
                checked={sameAsOrigin}
                onChange={(e) => handleSameAsOriginToggle(e.target.checked)}
                className="rounded"
              />
              <label
                htmlFor="sameAsOrigin"
                className="text-sm text-gray-600 cursor-pointer"
              >
                Main destination is same as origin
              </label>
            </div>

            {/* Destination */}
            {!sameAsOrigin && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  Main Destination
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g. Paris, France"
                    value={routeForm.destQuery}
                    onChange={(e) => handleRouteSearch("dest", e.target.value)}
                  />
                  {routeDestResults.length > 0 && (
                    <div className="absolute z-[9999] top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {routeDestResults.map((r) => (
                        <button
                          key={r.place_id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0 truncate"
                          onClick={() => handleRouteSelect("dest", r)}
                        >
                          {r.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {routeForm.mainDestination?.city && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <Check size={11} /> {routeForm.mainDestination.city},{" "}
                    {routeForm.mainDestination.country}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setEditingRoute(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRoute}
                disabled={savingRoute || !routeForm.origin}
                className="gap-1.5"
              >
                {savingRoute ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Check size={14} />
                )}
                Save Route
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hotel Picker Dialog */}
      <Dialog
        open={pickingHotel}
        onOpenChange={(o) => !o && setPickingHotel(false)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Find a Hotel</DialogTitle>
          </DialogHeader>
          <HotelPicker
            trip={trip}
            onAdd={handleAddHotel}
            onClose={() => setPickingHotel(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Itinerary Dialog */}
      <Dialog open={itineraryOpen} onOpenChange={setItineraryOpen}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trip Itinerary</DialogTitle>
          </DialogHeader>
          <Itinerary />
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md h-[600px] p-0 overflow-hidden">
          <TripChat tripId={trip._id} members={trip.members} />
        </DialogContent>
      </Dialog>

      {/* Add Form Dialog */}
      <Dialog open={!!showAddForm} onOpenChange={() => setShowAddForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Add {showAddForm}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDetail} className="space-y-4">
            {showAddForm === "attractions" && (
              <>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" required onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    name="location"
                    required
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" name="date" onChange={handleInputChange} />
                </div>
              </>
            )}
            {showAddForm === "accommodations" && (
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
                    <Input
                      type="date"
                      name="checkIn"
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out</Label>
                    <Input
                      type="date"
                      name="checkOut"
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </>
            )}
            {showAddForm === "transport" && (
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
                    <Input
                      type="datetime-local"
                      name="departureTime"
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival</Label>
                    <Input
                      type="datetime-local"
                      name="arrivalTime"
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </>
            )}
            {showAddForm === "dining" && (
              <>
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input
                    name="restaurantName"
                    required
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cuisine</Label>
                  <Input name="cuisine" onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    name="dateTime"
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
