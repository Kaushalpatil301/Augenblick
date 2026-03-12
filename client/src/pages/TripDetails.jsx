import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTripById,
  updateTripDetails,
  inviteToTrip,
  addDestination,
  removeDestination,
  updateTripRoute,
  leaveTrip,
  deleteTrip,
} from "../api/trips";
import { getFriends } from "../api/friends";
import DestinationMapPicker from "../components/DestinationMapPicker";
import HotelPicker from "../components/HotelPicker";
import AttractionPicker from "../components/AttractionPicker";
import FlightPicker from "../components/FlightPicker";
import TripMap from "../components/TripMap";
import { fetchWikipediaInfo } from "../lib/wikiCache";
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
  LogOut,
  Trash2,
  Search,
  Flag,
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
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ROUTE_SHADOW =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
const ROUTE_CM =
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img";

const routeOriginIcon = new L.Icon({
  iconUrl: `${ROUTE_CM}/marker-icon-2x-green.png`,
  shadowUrl: ROUTE_SHADOW,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
});

const routeDestIcon = new L.Icon({
  iconUrl: `${ROUTE_CM}/marker-icon-2x-red.png`,
  shadowUrl: ROUTE_SHADOW,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
});

function RouteMapClickHandler({ onPick }) {
  useMapEvents({
    click: (e) => {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RouteMapFitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 8 });
    } else if (points.length === 1) {
      map.flyTo(points[0], 6, { duration: 0.8 });
    }
  }, [points, map]);
  return null;
}

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

const earthBackgrounds = [
  "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1000&auto=format&fit=crop", // Forest path
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop", // Mountains
  "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?q=80&w=1000&auto=format&fit=crop", // Desert sand
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=1000&auto=format&fit=crop", // Nature valley
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop"  // Deep forest
];

export default function TripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Form states
  const [showAddForm, setShowAddForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [destForm, setDestForm] = useState({ city: "", country: "" });
  const [addingDest, setAddingDest] = useState(false);
  const [pickingHotel, setPickingHotel] = useState(false);
  const [pickingAttraction, setPickingAttraction] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [placeImages, setPlaceImages] = useState({});
  const [placeInfo, setPlaceInfo] = useState({});
  const [expandedPlaces, setExpandedPlaces] = useState({});

  const toggleExpanded = (key) =>
    setExpandedPlaces((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const user = storedUser?.data?.user || storedUser?.user || storedUser;
      setCurrentUserId(user?._id);
    } catch {}
  }, []);

  // Route editing
  const [editingRoute, setEditingRoute] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeForm, setRouteForm] = useState({
    origin: null,
    mainDestination: null,
  });
  const [routePickMode, setRoutePickMode] = useState("origin");
  const [routeSearchQuery, setRouteSearchQuery] = useState("");
  const [routeSearchResults, setRouteSearchResults] = useState([]);
  const [routeSearchLoading, setRouteSearchLoading] = useState(false);
  const [routeResolving, setRouteResolving] = useState(false);
  const routeMapRef = useRef(null);
  const routeSearchTimeout = useRef(null);

  useEffect(() => {
    fetchTrip();
    fetchFriends();
  }, [tripId]);

    // Auto-poll when AI itinerary is being generated
  useEffect(() => {
    if (!trip || trip.itineraryStatus !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const res = await getTripById(tripId);
        const updated = res.data.data;

        // Always update the trip to show partial results as they come in
        setTrip(updated);

        if (updated.itineraryStatus !== "pending") {
          clearInterval(interval);
          if (updated.itineraryStatus === "done") {
            toast.success("✨ Your AI itinerary is ready!");
          }
        }
      } catch {}
    }, 20000);
    return () => clearInterval(interval);
  }, [trip?.itineraryStatus, tripId]);

  // Fetch place images and info from Wikimedia when trip loads
  useEffect(() => {
    if (!trip) return;
    const places = [
      trip.origin?.city && {
        key: `origin`,
        name: trip.origin.city,
        country: trip.origin.country,
      },
      trip.mainDestination?.city && {
        key: `dest`,
        name: trip.mainDestination.city,
        country: trip.mainDestination.country,
      },
      ...(trip.destinations || []).map((d) => ({
        key: d._id,
        name: d.city,
        country: d.country,
      })),
    ].filter(Boolean);

    (async () => {
      for (const place of places) {
        if (placeImages[place.key]) continue;
        const searchTerm = `${place.name}${place.country ? ` ${place.country}` : ""}`;
        const info = await fetchWikipediaInfo(searchTerm);
        setPlaceImages((prev) => ({ ...prev, [place.key]: info.image }));
        setPlaceInfo((prev) => ({ ...prev, [place.key]: info.description }));
      }
    })();
  }, [trip]);

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

  const handleRouteMapSearch = (q) => {
    setRouteSearchQuery(q);
    clearTimeout(routeSearchTimeout.current);
    if (!q.trim()) {
      setRouteSearchResults([]);
      return;
    }
    routeSearchTimeout.current = setTimeout(async () => {
      setRouteSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en" } },
        );
        const results = await res.json();
        setRouteSearchResults(results.slice(0, 5));
      } finally {
        setRouteSearchLoading(false);
      }
    }, 400);
  };

  const handleRouteMapSearchSelect = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setRouteSearchResults([]);
    setRouteSearchQuery("");
    if (routeMapRef.current) {
      routeMapRef.current.flyTo([lat, lng], 10, { duration: 0.8 });
    }
    setRouteResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.state ||
        result.display_name.split(",")[0];
      const country = addr.country || "";
      const place = {
        city,
        country,
        displayName: result.display_name,
        lat,
        lng,
      };
      if (routePickMode === "origin") {
        setRouteForm((prev) => ({ ...prev, origin: place }));
        setRoutePickMode("dest");
      } else {
        setRouteForm((prev) => ({ ...prev, mainDestination: place }));
      }
    } catch {
      // use display name as fallback
      const city = result.display_name.split(",")[0];
      const place = {
        city,
        country: "",
        displayName: result.display_name,
        lat,
        lng,
      };
      if (routePickMode === "origin") {
        setRouteForm((prev) => ({ ...prev, origin: place }));
        setRoutePickMode("dest");
      } else {
        setRouteForm((prev) => ({ ...prev, mainDestination: place }));
      }
    } finally {
      setRouteResolving(false);
    }
  };

  const handleRouteMapClick = async (lat, lng) => {
    setRouteResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.state ||
        "";
      const country = addr.country || "";
      const place = { city, country, displayName: data.display_name, lat, lng };
      if (routePickMode === "origin") {
        setRouteForm((prev) => ({ ...prev, origin: place }));
        if (!routeForm.mainDestination) setRoutePickMode("dest");
      } else {
        setRouteForm((prev) => ({ ...prev, mainDestination: place }));
      }
    } catch {
      const fallback = {
        city: `Lat ${lat.toFixed(3)}`,
        country: `Lng ${lng.toFixed(3)}`,
        displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
      };
      if (routePickMode === "origin")
        setRouteForm((prev) => ({ ...prev, origin: fallback }));
      else setRouteForm((prev) => ({ ...prev, mainDestination: fallback }));
    } finally {
      setRouteResolving(false);
    }
  };

  const handleSaveRoute = async () => {
    setSavingRoute(true);
    try {
      await updateTripRoute(tripId, {
        origin: routeForm.origin,
        mainDestination: routeForm.mainDestination,
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
      origin: trip?.origin?.city ? trip.origin : null,
      mainDestination: trip?.mainDestination?.city
        ? trip.mainDestination
        : null,
    });
    setRoutePickMode("origin");
    setRouteSearchQuery("");
    setRouteSearchResults([]);
    setRouteResolving(false);
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

  const handleAddAttraction = async (attractionData) => {
    try {
      await updateTripDetails(tripId, "attractions", attractionData);
      toast.success("Attraction added");
      fetchTrip();
    } catch {
      toast.error("Failed to add attraction");
      throw new Error("Failed to add attraction");
    }
  };

  const handleAddTransport = async (transportData) => {
    try {
      await updateTripDetails(tripId, "transport", transportData);
      toast.success("Transport added successfully");
      setShowAddForm(null);
      fetchTrip();
    } catch (error) {
      toast.error("Failed to add transport");
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

  const handleLeaveTrip = async () => {
    if (!window.confirm("Are you sure you want to leave this trip?")) return;
    try {
      await leaveTrip(tripId);
      toast.success("You have left the trip");
      navigate("/dashboard/trips");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave trip");
    }
  };

  const handleDeleteTrip = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this trip? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteTrip(tripId);
      toast.success("Trip deleted");
      navigate("/dashboard/trips");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete trip");
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
    <div className="p-6 md:p-10 font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] min-h-[calc(100vh-4rem)] relative md:text-lg">
      {/* Background textures */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
      <Tabs defaultValue="overview" className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/trips")}
            className="gap-2 cursor-pointer text-base md:text-lg"
          >
            <ArrowLeft size={18} /> Back to Trips
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2 mt-4 md:mt-0">
            <TabsList className="h-12 bg-white/50 border border-[#E5E7EB] shadow-sm p-1 rounded-lg gap-1">
              <TabsTrigger
                value="overview"
                className="h-10 rounded-md px-5 text-base font-medium data-[state=active]:bg-white data-[state=active]:text-[#2E7D32] data-[state=active]:shadow-sm text-[#6D4C41]"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="h-10 rounded-md px-5 text-base font-medium data-[state=active]:bg-white data-[state=active]:text-[#2E7D32] data-[state=active]:shadow-sm text-[#6D4C41]"
              >
                Map
              </TabsTrigger>
              <TabsTrigger
                value="planning"
                className="h-10 rounded-md px-5 text-base font-medium data-[state=active]:bg-white data-[state=active]:text-[#2E7D32] data-[state=active]:shadow-sm text-[#6D4C41]"
              >
                Planning
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              className="gap-2 border-[#E5E7EB] text-[#2E7D32] hover:bg-white hover:border-[#2E7D32] text-sm md:text-base h-12"
              onClick={() => setItineraryOpen(true)}
            >
              <CalendarDays size={18} /> View Itinerary
            </Button>
            <Button
              variant="outline"
              className="gap-2 relative border-[#E5E7EB] text-[#2E7D32] hover:bg-white hover:border-[#2E7D32] text-sm md:text-base h-12"
              onClick={() => {
                setChatOpen(true);
                setUnreadCount(0);
              }}
            >
              <MessageSquare size={18} /> Trip Chat
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1 shadow">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </div>

            {trip.createdBy?._id === currentUserId ? (
              <Button
                variant="outline"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleDeleteTrip}
              >
                <Trash2 size={16} /> Delete Trip
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleLeaveTrip}
              >
                <LogOut size={16} /> Leave Trip
              </Button>
            )}

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[#2E7D32] text-white hover:bg-[#2E7D32]/90">
                  <UserPlus size={16} /> Invite Friends
                </Button>
              </DialogTrigger>
              <DialogContent className="font-['Lato'] text-[#2C2C2C] bg-white border border-[#E5E7EB]">
                <DialogHeader>
                  <DialogTitle className="font-['Playfair_Display'] text-xl">Invite Friends to {trip.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4 max-h-96 overflow-y-auto pr-2">
                  {friends.length === 0 ? (
                    <p className="text-center text-[#6D4C41] py-4">
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
                            <Badge variant="secondary" className="bg-[#6D4C41]/10 text-[#6D4C41] border border-[#E5E7EB]">Member</Badge>
                          ) : isInvited ? (
                            <Badge
                              variant="outline"
                              className="text-[#F4A261] border-[#F4A261]"
                            >
                              Invited
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-[#2E7D32] text-white hover:bg-[#2E7D32]/90"
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

        {/* Trip Info Card */}
        <Card 
          className="text-white border-none shadow-md overflow-hidden relative rounded-[14px] bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(to right bottom, rgba(46, 125, 50, 0.85), rgba(27, 75, 30, 0.95)), url('${trip?._id ? earthBackgrounds[parseInt(trip._id.slice(-5), 16) % earthBackgrounds.length] : earthBackgrounds[0]}')` }}
        >
          {/* Subtle map decoration */}
          <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[200%] rounded-full border border-white/10 pointer-events-none opacity-50 mix-blend-overlay" />
          <div className="absolute bottom-[-50%] left-[-10%] w-[40%] h-[150%] rounded-full border border-[#F4A261]/20 pointer-events-none opacity-30 mix-blend-overlay" />
          
          <CardContent className="pt-10 pb-8 px-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-5xl md:text-6xl font-bold font-['Playfair_Display'] tracking-tight mb-4 drop-shadow-sm">{trip.name}</h2>
                <div className="flex flex-wrap items-center gap-3 opacity-95 font-['Lato'] text-base">
                  {trip.destinations?.length > 0 ? (
                    trip.destinations.map((d) => (
                      <span
                        key={d._id}
                        className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-medium border border-white/10"
                      >
                        <MapPin size={12} /> {d.city}, {d.country}
                      </span>
                    ))
                  ) : (
                    <span className="flex items-center gap-1.5 opacity-80 text-sm">
                      <MapPin size={14} /> No destinations yet
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs border border-white/5">
                    <CalendarDays size={14} /> {formatDate(trip.startDate)} -{" "}
                    {formatDate(trip.endDate)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right bg-black/20 px-6 py-4 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-xs opacity-80 uppercase tracking-widest font-bold mb-1 font-['Lato'] text-[#F4A261]">
                    Budget
                  </p>
                  <p className="text-3xl md:text-4xl font-bold flex items-center gap-1 font-['Lato']">
                    ${trip.budget.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 pt-5 border-t border-white/20 font-['Lato']">
              <Users size={18} className="opacity-80"/>
              <span className="text-base font-medium opacity-90">Explorers:</span>
              <div className="flex -space-x-2 ml-2">
                {trip.members.map((member) => (
                  <Avatar
                    key={member._id}
                    className="h-8 w-8 border-2 border-[#1b4b1e] shadow-sm"
                  >
                    <AvatarImage src={member.avatar?.url} />
                    <AvatarFallback className="text-[10px] font-bold bg-[#F4A261] text-[#2C2C2C]">
                      {member.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Trip Route — Origin & Destination Cards */}
          <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-white/50">
              <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                <Navigation className="text-[#6D4C41]" size={20} /> Trip Route
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    key: "origin",
                    label: "Origin",
                    labelColor: "bg-[#2E7D32]",
                    place: trip.origin,
                    borderColor: "border-[#E5E7EB]",
                    gradientFrom: "from-[#2C2C2C]",
                  },
                  {
                    key: "dest",
                    label: "Destination",
                    labelColor: "bg-[#F4A261]",
                    place: trip.mainDestination,
                    borderColor: "border-[#E5E7EB]",
                    gradientFrom: "from-[#2C2C2C]",
                  },
                ].map(
                  ({
                    key,
                    label,
                    labelColor,
                    place,
                    borderColor,
                    gradientFrom,
                  }) => (
                    <div
                      key={key}
                      className={`rounded-[12px] overflow-hidden border ${borderColor} shadow-sm group hover:shadow-md transition-shadow relative bg-white`}
                    >
                      {place?.city ? (
                        <>
                          {/* Image with overlay */}
                          <div className="relative w-full aspect-[16/9] bg-[#F5F5F0]">
                            {placeImages[key] ? (
                              <img
                                src={placeImages[key]}
                                alt={place.city}
                                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#F5F5F0]">
                                <MapPin size={36} className="text-[#E5E7EB]" />
                              </div>
                            )}
                            {/* Gradient overlay */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-t ${gradientFrom}/70 via-transparent to-transparent opacity-80`}
                            />
                            {/* Badge */}
                            <span
                              className={`absolute top-4 left-4 ${labelColor} text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md shadow-sm`}
                            >
                              {label}
                            </span>
                            {/* City name overlaid at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              <h4 className="text-white font-bold text-2xl drop-shadow-lg leading-tight font-['Playfair_Display']">
                                {place.city}
                                {place.country ? `, ${place.country}` : ""}
                              </h4>
                            </div>
                          </div>
                          {/* Description + Show more */}
                          {placeInfo[key] && (
                            <div className="px-5 py-4 bg-white border-t border-[#E5E7EB]">
                              <p
                                className={`text-sm text-[#6D4C41] leading-relaxed font-['Lato'] ${
                                  expandedPlaces[key] ? "" : "line-clamp-2"
                                }`}
                              >
                                {placeInfo[key]}
                              </p>
                              <button
                                onClick={() => toggleExpanded(key)}
                                className="mt-2 text-xs font-semibold text-[#2E7D32] hover:text-[#2E7D32]/80 transition-colors flex items-center gap-1"
                              >
                                {expandedPlaces[key]
                                  ? "Show less ▲"
                                  : "Show more ▼"}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-8 text-center text-sm text-[#6D4C41] italic bg-[#F5F5F0] h-full flex items-center justify-center font-['Lato'] border border-dashed border-[#E5E7EB] m-4 rounded-lg">
                          <span className="flex flex-col items-center gap-2">
                             <MapPin className="text-[#E5E7EB]" size={24}/>
                             {label} not set
                          </span>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stops / Destinations */}
          <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-white/50">
              <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                <MapPin className="text-[#6D4C41]" size={20} /> Stops Along the
                Way
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!trip.destinations?.length ? (
                <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                  No stops added yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trip.destinations.map((dest, idx) => (
                    <div
                      key={dest._id}
                      className="rounded-[12px] overflow-hidden border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow bg-white group"
                    >
                      {/* Image with overlay */}
                      <div className="relative w-full aspect-[4/3] bg-[#F5F5F0]">
                        {placeImages[dest._id] ? (
                          <img
                            src={placeImages[dest._id]}
                            alt={dest.city}
                            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#F5F5F0]">
                            <MapPin size={28} className="text-[#E5E7EB]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/70 via-transparent to-transparent opacity-80" />
                        <span className="absolute top-3 left-3 bg-[#6D4C41] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
                          Stop {idx + 1}
                        </span>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="text-white font-bold text-lg drop-shadow-lg font-['Playfair_Display']">
                            {dest.city}, {dest.country}
                          </h4>
                        </div>
                      </div>
                      {/* Description + Show more */}
                      {placeInfo[dest._id] && (
                        <div className="px-4 py-3 bg-white border-t border-[#E5E7EB]">
                          <p
                            className={`text-xs text-[#6D4C41] leading-relaxed font-['Lato'] ${
                              expandedPlaces[dest._id] ? "" : "line-clamp-2"
                            }`}
                          >
                            {placeInfo[dest._id]}
                          </p>
                           <button
                             onClick={() => toggleExpanded(dest._id)}
                             className="mt-1.5 text-[11px] font-semibold text-[#2E7D32] hover:text-[#2E7D32]/80 transition-colors flex items-center gap-1"
                           >
                             {expandedPlaces[dest._id]
                               ? "Show less ▲"
                               : "Show more ▼"}
                           </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planning Details (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Camera className="text-[#2E7D32]" size={20} /> Attractions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {!trip.attractions?.length ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No attractions added yet
                  </p>
                ) : (
                  trip.attractions.map((attr, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <p className="font-semibold text-sm font-['Lato'] text-[#2C2C2C]">{attr.name}</p>
                      <p className="text-xs text-[#6D4C41] mt-1">{attr.location}</p>
                      {attr.date && (
                        <p className="text-[10px] text-[#2E7D32] font-semibold mt-1">
                          {formatDate(attr.date)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Hotel className="text-[#6D4C41]" size={20} /> Accommodations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {!trip.accommodations?.length ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No accommodations added yet
                  </p>
                ) : (
                  trip.accommodations.map((acc, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <p className="font-semibold text-sm font-['Lato'] text-[#2C2C2C]">{acc.name}</p>
                      <p className="text-xs text-[#6D4C41] mt-1">{acc.address}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E5E7EB]">
                        <p className="text-[10px] text-[#6D4C41] font-semibold">
                          {formatDate(acc.checkIn)} - {formatDate(acc.checkOut)}
                        </p>
                        {acc.priceTotal && (
                          <span className="text-[11px] font-bold text-[#2E7D32]">
                            {acc.priceCurrency} {acc.priceTotal}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Plane className="text-[#2E7D32]" size={20} /> Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {!trip.transport?.length ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No transport details added yet
                  </p>
                ) : (
                  trip.transport.map((trans, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <Badge
                        variant="secondary"
                        className="mb-2 text-[10px] h-5 bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/20 border"
                      >
                        {trans.type}
                      </Badge>
                      <p className="text-sm font-medium font-['Lato'] text-[#2C2C2C]">{trans.details}</p>
                      <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex justify-between items-center">
                        <p className="text-[10px] text-[#6D4C41] font-semibold">
                          <span className="text-[#2C2C2C]">Dep:</span> {formatDateTime(trans.departureTime)} <br/> 
                          <span className="text-[#2C2C2C]">Arr:</span> {formatDateTime(trans.arrivalTime)}
                        </p>
                         {trans.priceTotal && (
                          <p className="text-xs font-bold text-[#2E7D32] mt-1">
                            {trans.priceTotal} {trans.priceCurrency || ""}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Utensils className="text-[#F4A261]" size={20} /> Dining
                  Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {!trip.dining?.length ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No dining options added yet
                  </p>
                ) : (
                  trip.dining.map((dine, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <p className="font-semibold text-sm font-['Lato'] text-[#2C2C2C]">
                        {dine.restaurantName}
                      </p>
                      <p className="text-xs text-[#6D4C41] mt-1">{dine.cuisine}</p>
                      <p className="text-[10px] text-[#F4A261] font-semibold mt-2 pt-2 border-t border-[#E5E7EB]">
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
        <TabsContent value="map" className="space-y-6 mt-6">
          <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-white/50">
              <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                <MapPin className="text-[#6D4C41]" size={20} /> Trip Overview
                Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TripMap trip={trip} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning" className="space-y-6 mt-6">
          {/* Source & Destination */}
          <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E5E7EB] bg-white/50">
              <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                <Navigation className="text-[#6D4C41]" size={20} /> Source
                &amp; Destination
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={openRouteEditor}
                className="gap-1 border-[#E5E7EB] text-[#2E7D32] hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
              >
                <Pencil size={14} /> Edit Route
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-[#F5F5F0] rounded-xl border border-[#E5E7EB]">
                  <span className="mt-0.5 w-3 h-3 rounded-full bg-[#2E7D32] shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32] mb-0.5">
                      Source
                    </p>
                    {trip.origin?.city ? (
                      <p className="text-sm font-semibold text-[#2C2C2C] font-['Lato']">
                        {trip.origin.city}
                        {trip.origin.country ? `, ${trip.origin.country}` : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-[#6D4C41] italic">Not set</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#F5F5F0] rounded-xl border border-[#E5E7EB]">
                  <span className="mt-0.5 w-3 h-3 rounded-full bg-[#F4A261] shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#F4A261] mb-0.5">
                      Destination
                    </p>
                    {trip.mainDestination?.city ? (
                      <p className="text-sm font-semibold text-[#2C2C2C] font-['Lato']">
                        {trip.mainDestination.city}
                        {trip.mainDestination.country
                          ? `, ${trip.mainDestination.country}`
                          : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-[#6D4C41] italic">Not set</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinations */}
          <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E5E7EB] bg-white/50">
              <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                <MapPin className="text-[#6D4C41]" size={20} /> Destinations
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingDest(true)}
                className="gap-1 border-[#E5E7EB] text-[#2E7D32] hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
              >
                <Plus size={14} /> Add City
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {(!trip.destinations || trip.destinations.length === 0) &&
                  !addingDest && (
                    <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                      No destinations added yet. Add cities you plan to visit.
                    </p>
                  )}
                {trip.destinations?.map((dest) => (
                  <div
                    key={dest._id}
                    className="flex items-center gap-1.5 bg-[#2E7D32]/10 border border-[#2E7D32]/20 text-[#2E7D32] text-sm font-medium px-4 py-2 rounded-full font-['Lato']"
                  >
                    <MapPin size={12} />
                    {dest.city}, {dest.country}
                    <button
                      onClick={() => handleRemoveDestination(dest._id)}
                      className="ml-1 text-[#2E7D32]/60 hover:text-red-500 transition-colors"
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
                  <DialogContent className="sm:max-w-2xl border border-[#E5E7EB] bg-white">
                    <DialogHeader>
                      <DialogTitle className="font-['Playfair_Display'] text-xl">Pick Destinations on Map</DialogTitle>
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
            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Camera className="text-[#2E7D32]" size={20} /> Attractions &
                  Destinations
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPickingAttraction(true)}
                  className="gap-1 border-[#E5E7EB] text-[#2E7D32] hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
                >
                  <Plus size={14} /> Discover
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {trip.attractions.length === 0 ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No attractions added yet
                  </p>
                ) : (
                  trip.attractions.map((attr, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <p className="font-semibold text-sm font-['Lato'] text-[#2C2C2C]">{attr.name}</p>
                      <p className="text-xs text-[#6D4C41] mt-1">{attr.location}</p>
                      {attr.date && (
                        <p className="text-[10px] text-[#2E7D32] font-semibold mt-1">
                          {formatDate(attr.date)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Accommodations */}
            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Hotel className="text-[#6D4C41]" size={20} /> Accommodations
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPickingHotel(true)}
                  className="border-[#E5E7EB] text-[#2E7D32] hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
                >
                  <Plus size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {trip.accommodations.length === 0 ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No accommodations added yet
                  </p>
                ) : (
                  trip.accommodations.map((acc, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <p className="font-semibold text-sm font-['Lato'] text-[#2C2C2C]">{acc.name}</p>
                      <p className="text-xs text-[#6D4C41] mt-1">{acc.address}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E5E7EB]">
                        <p className="text-[10px] text-[#6D4C41] font-semibold">
                          {formatDate(acc.checkIn)} - {formatDate(acc.checkOut)}
                        </p>
                        {acc.priceTotal && (
                          <span className="text-[11px] font-bold text-[#2E7D32]">
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
            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Plane className="text-[#2E7D32]" size={20} /> Transport
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm("transport")}
                  className="border-[#E5E7EB] text-[#2E7D32] hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
                >
                  <Plus size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {trip.transport.length === 0 ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No transport details added yet
                  </p>
                ) : (
                  trip.transport.map((trans, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <Badge
                        variant="secondary"
                        className="mb-2 text-[10px] h-5 bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/20 border"
                      >
                        {trans.type}
                      </Badge>
                      <p className="text-sm font-medium font-['Lato'] text-[#2C2C2C]">{trans.details}</p>
                      <div className="mt-2 pt-2 border-t border-[#E5E7EB]">
                        <p className="text-[10px] text-[#6D4C41]">
                           <span className="font-semibold text-[#2C2C2C]">Dep:</span> {formatDateTime(trans.departureTime)} | <span className="font-semibold text-[#2C2C2C]">Arr:</span>{" "}
                          {formatDateTime(trans.arrivalTime)}
                        </p>
                        {trans.priceTotal && (
                          <p className="text-xs font-bold text-[#2E7D32] mt-1">
                            ${Math.round(Number(trans.priceTotal))}{" "}
                            {trans.priceCurrency || "USD"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Dining */}
            <Card className="rounded-[14px] border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E7EB] bg-white/50">
                <CardTitle className="flex items-center gap-2 text-xl font-['Playfair_Display'] text-[#2C2C2C]">
                  <Utensils className="text-[#F4A261]" size={20} /> Dining
                  Options
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm("dining")}
                  className="border-[#E5E7EB] text-[#2E7D32] hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
                >
                  <Plus size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {trip.dining.length === 0 ? (
                  <p className="text-sm text-[#6D4C41] italic font-['Lato']">
                    No dining options added yet
                  </p>
                ) : (
                  trip.dining.map((dine, i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#F5F5F0] rounded-lg border border-[#E5E7EB]"
                    >
                      <p className="font-semibold text-sm font-['Lato'] text-[#2C2C2C]">
                        {dine.restaurantName}
                      </p>
                      <p className="text-xs text-[#6D4C41] mt-1">{dine.cuisine}</p>
                      <p className="text-[10px] text-[#F4A261] font-semibold mt-2 pt-2 border-t border-[#E5E7EB]">
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trip Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Mode selector */}
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant={routePickMode === "origin" ? "default" : "outline"}
                className={
                  routePickMode === "origin"
                    ? "gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    : "gap-1.5"
                }
                onClick={() => setRoutePickMode("origin")}
              >
                <Navigation size={14} />
                Source
              </Button>
              <Button
                type="button"
                size="sm"
                variant={routePickMode === "dest" ? "default" : "outline"}
                className={
                  routePickMode === "dest"
                    ? "gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                    : "gap-1.5"
                }
                onClick={() => setRoutePickMode("dest")}
              >
                <Flag size={14} />
                Destination
              </Button>
            </div>

            {/* Route summary bar */}
            <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 min-h-[36px]">
              {routeForm.origin ? (
                <span className="flex items-center gap-1.5 text-green-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shrink-0" />
                  {routeForm.origin.city || "Origin"}
                  <button
                    onClick={() =>
                      setRouteForm((prev) => ({ ...prev, origin: null }))
                    }
                    className="text-green-400 hover:text-red-500 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ) : (
                <span className="text-gray-400 italic">
                  Click map to set source
                </span>
              )}
              <span className="border-t border-dashed border-gray-300 flex-1 mx-1" />
              {routeForm.mainDestination ? (
                <span className="flex items-center gap-1.5 text-red-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0" />
                  {routeForm.mainDestination.city || "Destination"}
                  <button
                    onClick={() =>
                      setRouteForm((prev) => ({
                        ...prev,
                        mainDestination: null,
                      }))
                    }
                    className="text-red-400 hover:text-red-600 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ) : (
                <span className="text-gray-400 italic">No destination set</span>
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search for a city to set as ${routePickMode === "origin" ? "source" : "destination"}...`}
                className="pl-9"
                value={routeSearchQuery}
                onChange={(e) => handleRouteMapSearch(e.target.value)}
              />
              {routeSearchLoading && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
              )}
              {routeSearchResults.length > 0 && (
                <div className="absolute z-[9999] top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {routeSearchResults.map((r) => (
                    <button
                      key={r.place_id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0 truncate"
                      onClick={() => handleRouteMapSearchSelect(r)}
                    >
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Click on the map or search above.{" "}
              <strong className="text-gray-700">
                Mode:{" "}
                {routePickMode === "origin"
                  ? "Setting Source"
                  : "Setting Destination"}
              </strong>
            </p>

            {/* Map */}
            <div
              className="relative rounded-lg overflow-hidden border border-gray-200"
              style={{ height: 380 }}
            >
              {routeResolving && (
                <div className="absolute inset-0 z-[9998] bg-white/50 flex items-center justify-center">
                  <Loader2 className="animate-spin text-blue-500" size={28} />
                </div>
              )}
              <MapContainer
                center={[
                  routeForm.origin?.lat || routeForm.mainDestination?.lat || 20,
                  routeForm.origin?.lng || routeForm.mainDestination?.lng || 0,
                ]}
                zoom={routeForm.origin || routeForm.mainDestination ? 5 : 2}
                style={{ height: "100%", width: "100%" }}
                ref={routeMapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RouteMapClickHandler onPick={handleRouteMapClick} />
                {(routeForm.origin || routeForm.mainDestination) && (
                  <RouteMapFitBounds
                    points={[
                      ...(routeForm.origin
                        ? [[routeForm.origin.lat, routeForm.origin.lng]]
                        : []),
                      ...(routeForm.mainDestination
                        ? [
                            [
                              routeForm.mainDestination.lat,
                              routeForm.mainDestination.lng,
                            ],
                          ]
                        : []),
                    ]}
                  />
                )}

                {/* Origin marker */}
                {routeForm.origin && (
                  <Marker
                    position={[routeForm.origin.lat, routeForm.origin.lng]}
                    icon={routeOriginIcon}
                  >
                    <Popup>
                      <strong className="text-green-700">Source:</strong>{" "}
                      {routeForm.origin.city}, {routeForm.origin.country}
                    </Popup>
                  </Marker>
                )}

                {/* Destination marker */}
                {routeForm.mainDestination && (
                  <Marker
                    position={[
                      routeForm.mainDestination.lat,
                      routeForm.mainDestination.lng,
                    ]}
                    icon={routeDestIcon}
                  >
                    <Popup>
                      <strong className="text-red-700">Destination:</strong>{" "}
                      {routeForm.mainDestination.city},{" "}
                      {routeForm.mainDestination.country}
                    </Popup>
                  </Marker>
                )}

                {/* Route polyline */}
                {routeForm.origin && routeForm.mainDestination && (
                  <Polyline
                    positions={[
                      [routeForm.origin.lat, routeForm.origin.lng],
                      [
                        routeForm.mainDestination.lat,
                        routeForm.mainDestination.lng,
                      ],
                    ]}
                    pathOptions={{
                      color: "#3b82f6",
                      weight: 3,
                      dashArray: "8 6",
                      opacity: 0.7,
                    }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Source
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Destination
              </span>
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-2 pt-1">
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

      {/* Attraction Picker Dialog */}
      <Dialog
        open={pickingAttraction}
        onOpenChange={(o) => !o && setPickingAttraction(false)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Discover Attractions</DialogTitle>
          </DialogHeader>
          <AttractionPicker
            trip={trip}
            onAdd={handleAddAttraction}
            onClose={() => setPickingAttraction(false)}
            existingAttractions={trip.attractions || []}
          />
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
          <Itinerary trip={trip}/>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog
        open={chatOpen}
        onOpenChange={(open) => {
          setChatOpen(open);
          if (open) setUnreadCount(0);
        }}
      >
        <DialogContent className="max-w-md h-[600px] p-0 overflow-hidden">
          <TripChat
            tripId={trip._id}
            members={trip.members}
            onNewMessage={() => {
              if (!chatOpen) setUnreadCount((c) => c + 1);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Form Dialog */}
      <Dialog open={!!showAddForm} onOpenChange={() => setShowAddForm(null)}>
        <DialogContent
          className={showAddForm === "transport" ? "sm:max-w-2xl" : ""}
        >
          <DialogHeader>
            <DialogTitle className="capitalize">Add {showAddForm}</DialogTitle>
          </DialogHeader>

          {showAddForm === "transport" ? (
            <FlightPicker
              trip={trip}
              onAdd={handleAddTransport}
              onClose={() => setShowAddForm(null)}
            />
          ) : (
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
                    <Input
                      type="date"
                      name="date"
                      onChange={handleInputChange}
                    />
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
                    <Input
                      name="address"
                      required
                      onChange={handleInputChange}
                    />
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
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
