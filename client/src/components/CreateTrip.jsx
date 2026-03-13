import React, { useState, useRef, useEffect } from "react";
import {
  PlusCircle,
  MapPin,
  X,
  Search,
  Loader2,
  Navigation,
  Flag,
  CircleDot,
  Leaf,
  Shield,
} from "lucide-react";
import { createTrip } from "../api/trips";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
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

const DEFAULT_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  budget: "",
};

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
const CM =
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img";

const originIcon = new L.Icon({
  iconUrl: `${CM}/marker-icon-2x-green.png`,
  shadowUrl: SHADOW,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
});

const destIcon = new L.Icon({
  iconUrl: `${CM}/marker-icon-2x-red.png`,
  shadowUrl: SHADOW,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
});

const stopIcon = new L.Icon({
  iconUrl: `${CM}/marker-icon-2x-blue.png`,
  shadowUrl: SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "Accept-Language": "en" } },
  );
  const data = await res.json();
  const addr = data.address || {};
  const city =
    addr.city || addr.town || addr.village || addr.county || addr.state || "";
  const country = addr.country || "";
  const displayName =
    data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { city, country, displayName, lat, lng };
}

async function forwardGeocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { "Accept-Language": "en" } },
  );
  return await res.json();
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click: async (e) => {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ points }) {
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

// Picking modes
const MODE_ORIGIN = "origin";
const MODE_DEST = "destination";
const MODE_STOP = "stop";

const hasCoordinates = (place) =>
  Number.isFinite(place?.lat) && Number.isFinite(place?.lng);

export default function CreateTrip({
  onTripCreated,
  open: controlledOpen,
  onOpenChange,
  initialDraft,
  hideTrigger = false,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = basic info, 2 = map picker
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]);
  const [pickMode, setPickMode] = useState(MODE_ORIGIN);
  const [ecoRoute, setEcoRoute] = useState(false);
  const [safetyRoute, setSafetyRoute] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef(null);
  const mapRef = useRef(null);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (value) => {
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetAll = () => {
    setStep(1);
    setForm(DEFAULT_FORM);
    setOrigin(null);
    setDestination(null);
    setStops([]);
    setPickMode(MODE_ORIGIN);
    setSearchQuery("");
    setSearchResults([]);
  };

  const resolveDraftPlace = async (place) => {
    if (!place) {
      return null;
    }

    if (hasCoordinates(place)) {
      return place;
    }

    const label =
      place.displayName ||
      [place.city, place.country].filter(Boolean).join(", ");
    if (!label) {
      return null;
    }

    try {
      const results = await forwardGeocode(label);
      const firstMatch = results?.[0];
      if (!firstMatch) {
        return place;
      }

      return {
        city:
          place.city || firstMatch.address?.city || firstMatch.name || label,
        country: place.country || firstMatch.address?.country || "",
        displayName: place.displayName || firstMatch.display_name || label,
        lat: Number(firstMatch.lat),
        lng: Number(firstMatch.lon),
      };
    } catch {
      return place;
    }
  };

  useEffect(() => {
    if (!open || !initialDraft) {
      return;
    }

    let cancelled = false;

    const applyDraft = async () => {
      setStep(1);
      setForm({
        name: initialDraft.name || "",
        startDate: initialDraft.startDate || "",
        endDate: initialDraft.endDate || "",
        budget:
          initialDraft.budget === undefined || initialDraft.budget === null
            ? ""
            : String(initialDraft.budget),
      });

      const [nextOrigin, nextDestination, nextStops] = await Promise.all([
        resolveDraftPlace(initialDraft.origin),
        resolveDraftPlace(initialDraft.mainDestination),
        Promise.all((initialDraft.destinations || []).map(resolveDraftPlace)),
      ]);

      if (cancelled) {
        return;
      }

      setOrigin(nextOrigin);
      setDestination(nextDestination);
      setStops(nextStops.filter(Boolean));
    };

    applyDraft();

    return () => {
      cancelled = true;
    };
  }, [initialDraft, open]);

  const handleMapClick = async (lat, lng) => {
    setResolving(true);
    try {
      const place = await reverseGeocode(lat, lng);
      if (pickMode === MODE_ORIGIN) {
        setOrigin(place);
        if (!destination) setPickMode(MODE_DEST);
      } else if (pickMode === MODE_DEST) {
        setDestination(place);
        setPickMode(MODE_STOP);
      } else {
        setStops((prev) => {
          if (
            prev.some(
              (s) =>
                Math.abs(s.lat - lat) < 0.001 && Math.abs(s.lng - lng) < 0.001,
            )
          )
            return prev;
          return [...prev, place];
        });
      }
    } catch {
      const fallback = {
        city: `Lat ${lat.toFixed(3)}`,
        country: `Lng ${lng.toFixed(3)}`,
        displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
      };
      if (pickMode === MODE_ORIGIN) setOrigin(fallback);
      else if (pickMode === MODE_DEST) setDestination(fallback);
      else setStops((prev) => [...prev, fallback]);
    } finally {
      setResolving(false);
    }
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await forwardGeocode(q);
        setSearchResults(results.slice(0, 5));
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const handleSearchSelect = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSearchResults([]);
    setSearchQuery("");
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 10, { duration: 0.8 });
    }
    setResolving(true);
    try {
      const place = await reverseGeocode(lat, lng);
      if (pickMode === MODE_ORIGIN) {
        setOrigin(place);
        if (!destination) setPickMode(MODE_DEST);
      } else if (pickMode === MODE_DEST) {
        setDestination(place);
        setPickMode(MODE_STOP);
      } else {
        setStops((prev) => {
          if (
            prev.some(
              (s) =>
                Math.abs(s.lat - lat) < 0.01 && Math.abs(s.lng - lng) < 0.01,
            )
          )
            return prev;
          return [...prev, place];
        });
      }
    } finally {
      setResolving(false);
    }
  };

  const removeStop = (idx) => {
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  // Build polyline from origin -> stops (in order) -> destination
  const routePoints = [];
  if (hasCoordinates(origin)) routePoints.push([origin.lat, origin.lng]);
  stops.filter(hasCoordinates).forEach((s) => routePoints.push([s.lat, s.lng]));
  if (hasCoordinates(destination))
    routePoints.push([destination.lat, destination.lng]);

  const allFitPoints = [
    ...(hasCoordinates(origin) ? [[origin.lat, origin.lng]] : []),
    ...(hasCoordinates(destination)
      ? [[destination.lat, destination.lng]]
      : []),
    ...stops.filter(hasCoordinates).map((s) => [s.lat, s.lng]),
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await createTrip({
        ...form,
        budget: Number(form.budget),
        origin: origin || undefined,
        mainDestination: destination || undefined,
        destinations: stops,
      });
      console.log("Trip Created:", res.data);
      setOpen(false);
      resetAll();
      onTripCreated?.();
    } catch (error) {
      console.error("Error creating trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 =
    form.name && form.startDate && form.endDate && form.budget;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetAll();
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">Create Trip</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className={
          step === 1
            ? "sm:max-w-md"
            : "sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Create a New Trip" : "Pick Your Route"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          /* ── Step 1: Basic Info ── */
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Trip Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Summer Europe Adventure"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Estimated Budget (INR)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                min="0"
                placeholder="e.g. 2000"
                value={form.budget}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetAll();
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canProceedStep1}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setStep(2)}
              >
                Next: Pick Route
              </Button>
            </div>
          </div>
        ) : (
          /* ── Step 2: Map Route Picker ── */
          <div className="space-y-3 mt-2">
            {/* Mode selector */}
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                type="button"
                size="sm"
                variant={pickMode === MODE_ORIGIN ? "default" : "outline"}
                className={
                  pickMode === MODE_ORIGIN
                    ? "gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    : "gap-1.5"
                }
                onClick={() => setPickMode(MODE_ORIGIN)}
              >
                <Navigation size={14} />
                Source
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pickMode === MODE_DEST ? "default" : "outline"}
                className={
                  pickMode === MODE_DEST
                    ? "gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                    : "gap-1.5"
                }
                onClick={() => setPickMode(MODE_DEST)}
              >
                <Flag size={14} />
                Destination
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pickMode === MODE_STOP ? "default" : "outline"}
                className={
                  pickMode === MODE_STOP
                    ? "gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    : "gap-1.5"
                }
                onClick={() => setPickMode(MODE_STOP)}
              >
                <CircleDot size={14} />
                Add Stop
              </Button>
              
              <div className="h-6 w-px bg-[#E5E7EB] mx-1 hidden sm:block"></div>

              {/* Eco & Safety Route Toggles */}
              <Button
                type="button"
                size="sm"
                variant={ecoRoute ? "default" : "outline"}
                className={
                  ecoRoute
                    ? "gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                    : "gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                }
                onClick={() => setEcoRoute(!ecoRoute)}
                title="Prioritize eco-friendly travel options"
              >
                <Leaf size={14} />
                Eco Route
              </Button>
              <Button
                type="button"
                size="sm"
                variant={safetyRoute ? "default" : "outline"}
                className={
                  safetyRoute
                    ? "gap-1.5 bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                    : "gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-800"
                }
                onClick={() => setSafetyRoute(!safetyRoute)}
                title="Prioritize well-lit and secure travel options"
              >
                <Shield size={14} />
                Women Safety Route
              </Button>
            </div>

            {/* Route summary bar */}
            <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 min-h-[36px]">
              {origin ? (
                <span className="flex items-center gap-1.5 text-green-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shrink-0" />
                  {origin.city || "Origin"}
                  <button
                    onClick={() => setOrigin(null)}
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
              {stops.length > 0 && (
                <>
                  <span className="border-t border-dashed border-gray-300 flex-1 mx-1" />
                  <span className="text-blue-600 font-medium">
                    {stops.length} stop{stops.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
              {(origin || destination) && (
                <span className="border-t border-dashed border-gray-300 flex-1 mx-1" />
              )}
              {destination ? (
                <span className="flex items-center gap-1.5 text-red-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0" />
                  {destination.city || "Destination"}
                  <button
                    onClick={() => setDestination(null)}
                    className="text-red-400 hover:text-red-600 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ) : (
                !origin && (
                  <span className="text-gray-400 italic ml-auto">
                    No destination set
                  </span>
                )
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search for a city to set as ${pickMode === MODE_ORIGIN ? "source" : pickMode === MODE_DEST ? "destination" : "stop"}...`}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchLoading && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-[9999] top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map((r) => (
                    <button
                      key={r.place_id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0 truncate"
                      onClick={() => handleSearchSelect(r)}
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
                {pickMode === MODE_ORIGIN
                  ? "Setting Source"
                  : pickMode === MODE_DEST
                    ? "Setting Destination"
                    : "Adding Stops"}
              </strong>
            </p>

            {/* Map */}
            <div
              className="relative rounded-lg overflow-hidden border border-gray-200"
              style={{ height: 380 }}
            >
              {resolving && (
                <div className="absolute inset-0 z-[9998] bg-white/50 flex items-center justify-center">
                  <Loader2 className="animate-spin text-blue-500" size={28} />
                </div>
              )}
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%" }}
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickHandler onPick={handleMapClick} />
                {allFitPoints.length > 0 && <FitBounds points={allFitPoints} />}

                {/* Origin marker */}
                {origin && hasCoordinates(origin) && (
                  <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
                    <Popup>
                      <strong className="text-green-700">Source:</strong>{" "}
                      {origin.city}, {origin.country}
                    </Popup>
                  </Marker>
                )}

                {/* Destination marker */}
                {destination && hasCoordinates(destination) && (
                  <Marker
                    position={[destination.lat, destination.lng]}
                    icon={destIcon}
                  >
                    <Popup>
                      <strong className="text-red-700">Destination:</strong>{" "}
                      {destination.city}, {destination.country}
                    </Popup>
                  </Marker>
                )}

                {/* Stop markers */}
                {stops.filter(hasCoordinates).map((s, i) => (
                  <Marker key={i} position={[s.lat, s.lng]} icon={stopIcon}>
                    <Popup>
                      <strong className="text-blue-700">Stop {i + 1}:</strong>{" "}
                      {s.city}, {s.country}
                    </Popup>
                  </Marker>
                ))}

                {/* Route polyline */}
                {routePoints.length >= 2 && (
                  <Polyline
                    positions={routePoints}
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

            {/* Stops list */}
            {stops.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stops.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-1 rounded-full"
                  >
                    <MapPin size={12} />
                    <span className="max-w-[180px] truncate">
                      {s.city || s.displayName}
                      {s.country ? `, ${s.country}` : ""}
                    </span>
                    <button
                      onClick={() => removeStop(i)}
                      className="text-blue-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Source
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Destination
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Stop
              </span>
            </div>

            {/* Footer actions */}
            <div className="flex justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetAll();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSubmit}
                >
                  {loading ? "Creating..." : "Create Trip"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
