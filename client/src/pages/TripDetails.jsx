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
  getAgentPlaygroundData,
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
  BedDouble,
  Clock,
  Star,
  Sparkles,
  Bot,
  Coffee,
  Train,
  CheckCircle2,
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

  // Fetch place images and info
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
      // Fetch both trip data and agent playground data in parallel
      const [tripRes, playgroundRes] = await Promise.allSettled([
        getTripById(tripId),
        getAgentPlaygroundData(tripId),
      ]);

      const tripData =
        tripRes.status === "fulfilled" ? tripRes.value.data.data : null;
      const playgroundData =
        playgroundRes.status === "fulfilled"
          ? playgroundRes.value.data.data
          : null;

      if (!tripData) {
        throw new Error("Failed to fetch trip data");
      }

      // Merge playground data with trip data if available
      if (playgroundData && Object.keys(playgroundData).length > 0) {
        if (!tripData.agents) tripData.agents = {};

        // Merge each category with clean playground data
        Object.keys(playgroundData).forEach((category) => {
          if (playgroundData[category] && playgroundData[category].length > 0) {
            tripData.agents[category] = {
              status: "success",
              data: playgroundData[category],
            };
            console.log(
              `[Playground] Loaded ${playgroundData[category].length} ${category} items from n8n collections`,
            );
          }
        });
      }

      setTrip(tripData);
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
    } catch (error) {}
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
    } catch {
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
    } catch {
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

  const sectionData = [
    {
      title: "Attractions",
      icon: Camera,
      color: "pink",
      key: "attractions",
      userItems: trip.attractions || [],
      aiItems: trip.agents?.activities?.data || [],
      emptyText: "No attractions added yet.",
    },
    {
      title: "Hotels",
      icon: Hotel,
      color: "blue",
      key: "accommodations",
      userItems: trip.accommodations || [],
      aiItems: trip.agents?.accommodation?.data || [],
      emptyText: "No hotels added yet.",
    },
    {
      title: "Transport",
      icon: Plane,
      color: "green",
      key: "transport",
      userItems: trip.transport || [],
      aiItems: trip.agents?.transport?.data || [],
      emptyText: "No transport added yet.",
    },
    {
      title: "Dining",
      icon: Utensils,
      color: "orange",
      key: "dining",
      userItems: trip.dining || [],
      aiItems: trip.agents?.dining?.data || [],
      emptyText: "No dining added yet.",
    },
  ];
  const totalAiSuggestions = sectionData.reduce(
    (sum, section) => sum + section.aiItems.length,
    0,
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/trips")}
            className="gap-2"
          >
            <ArrowLeft size={16} /> Back to Trips
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TabsList className="h-10 bg-transparent p-0 gap-2">
              <TabsTrigger
                value="overview"
                className="h-10 px-4 text-sm font-medium border rounded-md data-[state=active]:bg-accent"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="h-10 px-4 text-sm font-medium border rounded-md data-[state=active]:bg-accent"
              >
                Map
              </TabsTrigger>
              <TabsTrigger
                value="planning"
                className="h-10 px-4 text-sm font-medium border rounded-md data-[state=active]:bg-accent"
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
            {trip.createdBy?._id === currentUserId && (
              <Button
                variant="outline"
                className="gap-2 text-red-600 border-red-200"
                onClick={handleDeleteTrip}
              >
                <Trash2 size={16} /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Trip Info Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">{trip.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 opacity-90">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />{" "}
                    {trip.mainDestination?.city || "Discovery Pending..."}
                  </span>
                  <span className="flex items-center gap-1 ml-3">
                    <CalendarDays size={16} /> {formatDate(trip.startDate)} -{" "}
                    {formatDate(trip.endDate)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70 uppercase tracking-widest font-bold">
                  Total Budget
                </p>
                <p className="text-2xl font-bold">
                  ${trip.budget.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Origin/Destination Images */}
            {[
              {
                key: "origin",
                label: "Origin",
                place: trip.origin,
                color: "emerald",
              },
              {
                key: "dest",
                label: "Main Destination",
                place: trip.mainDestination,
                color: "rose",
              },
            ].map((loc) => (
              <Card
                key={loc.key}
                className="overflow-hidden border-none shadow-md"
              >
                <div className="relative aspect-[16/9] bg-gray-100">
                  {placeImages[loc.key] ? (
                    <img
                      src={placeImages[loc.key]}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin className="text-gray-300" size={40} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                      {loc.label}
                    </p>
                    <h4 className="text-lg font-bold text-white">
                      {loc.place?.city || "Select in Mapping"}
                    </h4>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {sectionData.map((sec) => {
              const hasItems =
                sec.userItems.length > 0 || sec.aiItems.length > 0;
              return (
                <Card
                  key={sec.title}
                  className="bg-white/50 backdrop-blur-sm border-gray-100"
                >
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 text-gray-600">
                      <sec.icon size={14} className={`text-${sec.color}-500`} />{" "}
                      {sec.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {!hasItems ? (
                      <p className="text-[10px] text-gray-400 italic">
                        {sec.emptyText}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {sec.userItems.slice(0, 1).map((item, i) => (
                          <div
                            key={i}
                            className="text-[11px] font-bold text-gray-800 truncate"
                          >
                            {item.name || item.restaurantName || item.type}
                          </div>
                        ))}
                        {sec.aiItems.slice(0, 1).map((item, i) => (
                          <div
                            key={i}
                            className="text-[11px] text-indigo-600 font-medium truncate flex items-center gap-1"
                          >
                            <Sparkles size={8} />{" "}
                            {item.name ||
                              item.hotel_name ||
                              item.provider ||
                              item.restaurantName}
                          </div>
                        ))}
                        {sec.userItems.length + sec.aiItems.length > 1 && (
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            +{sec.userItems.length + sec.aiItems.length - 1}{" "}
                            more
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
            <p className="text-xs text-indigo-700 font-medium">
              AI suggestions available: {totalAiSuggestions}
            </p>
            <span className="text-[11px] text-indigo-600">
              Overview, Map and Planning synced
            </span>
          </div>
          <Card className="h-[500px] overflow-hidden">
            <TripMap trip={trip} />
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {sectionData.map((sec) => (
              <Card key={`map-${sec.key}`} className="border-gray-100">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-gray-700">
                    <sec.icon size={14} className={`text-${sec.color}-500`} />{" "}
                    {sec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {sec.aiItems.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">
                      {sec.emptyText}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {sec.aiItems.slice(0, 2).map((item, i) => (
                        <p
                          key={i}
                          className="text-[11px] text-indigo-700 truncate flex items-center gap-1"
                        >
                          <Sparkles size={8} />{" "}
                          {item.name ||
                            item.hotel_name ||
                            item.provider ||
                            item.restaurantName}
                        </p>
                      ))}
                      {sec.aiItems.length > 2 && (
                        <p className="text-[10px] text-gray-500">
                          +{sec.aiItems.length - 2} more
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Planning Sections */}
            {sectionData.map((sec) => {
              const hasItems =
                sec.userItems.length > 0 || sec.aiItems.length > 0;
              return (
                <Card key={sec.key}>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-md font-bold flex items-center gap-2">
                      <sec.icon className={`text-${sec.color}-500`} size={18} />{" "}
                      {sec.title}
                    </CardTitle>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowAddForm(sec.key)}
                    >
                      <Plus size={16} />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!hasItems ? (
                      <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                        <p className="text-xs text-gray-400 italic">
                          {sec.emptyText}
                        </p>
                        {trip.itineraryStatus === "pending" && (
                          <p className="text-[10px] text-indigo-500 font-medium mt-1 animate-pulse">
                            AI Expert is researching...
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* User Added Items */}
                        {sec.userItems.map((item, i) => (
                          <div
                            key={`user-${i}`}
                            className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between group"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-gray-800 truncate">
                                {item.name || item.restaurantName || item.type}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {item.location || item.address || item.details}
                              </p>
                            </div>
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] h-5">
                              Plan
                            </Badge>
                          </div>
                        ))}

                        {/* AI Discovered Items */}
                        {sec.aiItems.slice(0, 3).map((item, i) => (
                          <div
                            key={`ai-${i}`}
                            className="p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-xl flex items-center justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-indigo-900 truncate">
                                {item.name ||
                                  item.hotel_name ||
                                  item.provider ||
                                  item.restaurantName}
                              </p>
                              <p className="text-[11px] text-indigo-700/70 truncate">
                                {item.neighborhood ||
                                  item.mode ||
                                  "Agent Finding"}
                              </p>
                            </div>
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[9px] h-5 flex items-center gap-1">
                              <Sparkles size={8} /> AI
                            </Badge>
                          </div>
                        ))}
                        {sec.aiItems.length > 3 && (
                          <p className="text-[10px] text-center text-indigo-500 font-medium cursor-pointer hover:underline">
                            + {sec.aiItems.length - 3} more AI suggestions
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs... */}
      <Dialog open={editingRoute} onOpenChange={setEditingRoute}>
        <DialogContent className="sm:max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={routePickMode === "origin" ? "default" : "outline"}
                onClick={() => setRoutePickMode("origin")}
              >
                Origin
              </Button>
              <Button
                size="sm"
                variant={routePickMode === "dest" ? "default" : "outline"}
                onClick={() => setRoutePickMode("dest")}
              >
                Destination
              </Button>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={handleSaveRoute}
                disabled={savingRoute}
              >
                {savingRoute ? <Loader2 className="animate-spin" /> : <Check />}{" "}
                Save
              </Button>
            </div>
            <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden min-h-[300px]">
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: "100%" }}
                ref={routeMapRef}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RouteMapClickHandler onPick={handleRouteMapClick} />
                {routeForm.origin && (
                  <Marker
                    position={[routeForm.origin.lat, routeForm.origin.lng]}
                    icon={routeOriginIcon}
                  />
                )}
                {routeForm.mainDestination && (
                  <Marker
                    position={[
                      routeForm.mainDestination.lat,
                      routeForm.mainDestination.lng,
                    ]}
                    icon={routeDestIcon}
                  />
                )}
                {routeForm.origin && routeForm.mainDestination && (
                  <Polyline
                    positions={[
                      [routeForm.origin.lat, routeForm.origin.lng],
                      [
                        routeForm.mainDestination.lat,
                        routeForm.mainDestination.lng,
                      ],
                    ]}
                    pathOptions={{ color: "#3b82f6", dashArray: "8 6" }}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={itineraryOpen} onOpenChange={setItineraryOpen}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <Itinerary trip={trip} />
        </DialogContent>
      </Dialog>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md h-[600px] p-0">
          <TripChat tripId={trip._id} members={trip.members} />
        </DialogContent>
      </Dialog>

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
  );
}
