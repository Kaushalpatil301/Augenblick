import React, { useEffect, useState } from "react";
import { getPointsOfInterest } from "../api/amadeus";
import { fetchWikipediaInfo } from "../lib/wikiCache";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Loader2,
  MapPin,
  Camera,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
  ImageOff,
} from "lucide-react";

const CATEGORY_LABELS = {
  SIGHTS: "Sights",
  NIGHTLIFE: "Nightlife",
  RESTAURANT: "Restaurant",
  SHOPPING: "Shopping",
  BEACH_PARK: "Beach & Park",
};

const CATEGORY_COLORS = {
  SIGHTS: "bg-pink-100 text-pink-700",
  NIGHTLIFE: "bg-purple-100 text-purple-700",
  RESTAURANT: "bg-orange-100 text-orange-700",
  SHOPPING: "bg-emerald-100 text-emerald-700",
  BEACH_PARK: "bg-cyan-100 text-cyan-700",
};

export default function AttractionPicker({
  trip,
  onAdd,
  onClose,
  existingAttractions = [],
}) {
  const [loading, setLoading] = useState(true);
  const [attractions, setAttractions] = useState([]);
  const [images, setImages] = useState({});
  const [expanded, setExpanded] = useState({});
  const [adding, setAdding] = useState({});
  const [added, setAdded] = useState({});
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [error, setError] = useState("");

  // Build the list of places to search near
  const getSearchLocations = () => {
    const locations = [];
    if (trip.mainDestination?.lat && trip.mainDestination?.lng) {
      locations.push({
        label: trip.mainDestination.city || "Destination",
        lat: trip.mainDestination.lat,
        lng: trip.mainDestination.lng,
      });
    }
    if (trip.destinations?.length) {
      trip.destinations.forEach((d) => {
        if (d.lat && d.lng) {
          locations.push({
            label: d.city || "Stop",
            lat: d.lat,
            lng: d.lng,
          });
        }
      });
    }
    if (!locations.length && trip.origin?.lat && trip.origin?.lng) {
      locations.push({
        label: trip.origin.city || "Origin",
        lat: trip.origin.lat,
        lng: trip.origin.lng,
      });
    }
    return locations;
  };

  // Fetch attractions from Overpass API (via server proxy)
  useEffect(() => {
    const fetchAttractions = async () => {
      setLoading(true);
      setError("");
      const locations = getSearchLocations();
      console.log(
        "[AttractionPicker] Trip data:",
        JSON.stringify({
          mainDestination: trip.mainDestination,
          destinations: trip.destinations,
          origin: trip.origin,
        }),
      );
      console.log("[AttractionPicker] Search locations:", locations);

      if (!locations.length) {
        setError(
          "No destination or stops with coordinates. Add a destination first.",
        );
        setLoading(false);
        return;
      }

      try {
        const allPois = [];
        const seenIds = new Set();

        for (const loc of locations) {
          try {
            console.log(
              "[AttractionPicker] Fetching POIs for",
              loc.label,
              loc.lat,
              loc.lng,
            );
            const res = await getPointsOfInterest(loc.lat, loc.lng, 10000);
            console.log("[AttractionPicker] Response:", res.data);
            const pois = res.data?.data || [];
            console.log("[AttractionPicker] POIs found:", pois.length);
            pois.forEach((poi) => {
              if (!seenIds.has(poi.id)) {
                seenIds.add(poi.id);
                allPois.push({ ...poi, nearCity: loc.label });
              }
            });
          } catch (err) {
            console.error(
              "[AttractionPicker] Error fetching POIs for",
              loc.label,
              err,
            );
          }
        }

        setAttractions(allPois);

        // Mark already-added attractions
        const addedMap = {};
        existingAttractions.forEach((ea) => {
          allPois.forEach((poi) => {
            if (poi.name === ea.name) addedMap[poi.id] = true;
          });
        });
        setAdded(addedMap);

        // Fetch images from Wikipedia for each attraction
        allPois.forEach((poi) => fetchImage(poi));
      } catch (err) {
        setError("Failed to load attractions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttractions();
  }, []);

  const fetchImage = async (poi) => {
    const searchTerm = `${poi.name} ${poi.nearCity || ""}`.trim();
    const info = await fetchWikipediaInfo(searchTerm);
    if (info.image) {
      setImages((prev) => ({ ...prev, [poi.id]: info.image }));
    }
  };

  const handleAdd = async (poi) => {
    setAdding((prev) => ({ ...prev, [poi.id]: true }));
    try {
      const location =
        poi.nearCity ||
        (poi.geoCode
          ? `${poi.geoCode.latitude.toFixed(4)}, ${poi.geoCode.longitude.toFixed(4)}`
          : "");
      await onAdd({
        name: poi.name,
        description: poi.category
          ? CATEGORY_LABELS[poi.category] || poi.category
          : "",
        location,
      });
      setAdded((prev) => ({ ...prev, [poi.id]: true }));
    } catch {
      // Error handled by parent
    } finally {
      setAdding((prev) => ({ ...prev, [poi.id]: false }));
    }
  };

  // Get unique categories for filter
  const categories = [
    "ALL",
    ...new Set(attractions.map((a) => a.category).filter(Boolean)),
  ];

  const filteredAttractions =
    activeFilter === "ALL"
      ? attractions
      : attractions.filter((a) => a.category === activeFilter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-sm text-gray-500">
          Discovering attractions nearby...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <MapPin className="text-gray-300" size={40} />
        <p className="text-sm text-gray-500 text-center max-w-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  if (!attractions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Camera className="text-gray-300" size={40} />
        <p className="text-sm text-gray-500">
          No attractions found near your destinations.
        </p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 sticky top-0 bg-white py-2 z-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === cat
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {cat === "ALL" ? "All" : CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        {filteredAttractions.length} attraction
        {filteredAttractions.length !== 1 ? "s" : ""} found near your
        destinations
      </p>

      {/* Attractions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredAttractions.map((poi) => (
          <div
            key={poi.id}
            className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
          >
            {/* Image */}
            <div className="relative w-full aspect-[16/9] bg-gray-100">
              {images[poi.id] ? (
                <img
                  src={images[poi.id]}
                  alt={poi.name}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <ImageOff size={28} className="text-gray-300" />
                </div>
              )}
              {/* Category badge */}
              {poi.category && (
                <span
                  className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${CATEGORY_COLORS[poi.category] || "bg-gray-100 text-gray-600"}`}
                >
                  {CATEGORY_LABELS[poi.category] || poi.category}
                </span>
              )}
              {/* Near city */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
                <p className="text-white text-[10px] flex items-center gap-1">
                  <MapPin size={10} /> Near {poi.nearCity}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 flex-1 flex flex-col">
              <h4 className="font-semibold text-sm text-gray-800 leading-snug">
                {poi.name}
              </h4>

              {poi.type && (
                <div className="flex items-center gap-1 mt-1">
                  <Star size={11} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10px] text-gray-500 capitalize">
                    {poi.type.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {poi.tags && poi.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {poi.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                    >
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-2">
                {added[poi.id] ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="w-full gap-1.5 text-green-600 border-green-200"
                  >
                    <Check size={14} /> Added
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={adding[poi.id]}
                    onClick={() => handleAdd(poi)}
                  >
                    {adding[poi.id] ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                    Add to Trip
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
