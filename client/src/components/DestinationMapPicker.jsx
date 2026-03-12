import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, X, Check, Search, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Fix default marker icons broken by webpack/vite
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

const selectedIcon = new L.Icon({
  iconUrl: `${CM}/marker-icon-2x-blue.png`,
  shadowUrl: SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const originIcon = new L.Icon({
  iconUrl: `${CM}/marker-icon-2x-green.png`,
  shadowUrl: SHADOW,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
});

const mainDestIcon = new L.Icon({
  iconUrl: `${CM}/marker-icon-2x-red.png`,
  shadowUrl: SHADOW,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
});

const suggestedIcon = new L.Icon({
  iconUrl: `${CM}/marker-icon-2x-orange.png`,
  shadowUrl: SHADOW,
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [1, -30],
});

// Reverse-geocode a lat/lng using Nominatim (free, no API key)
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

// Forward-geocode a search query
async function forwardGeocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { "Accept-Language": "en" } },
  );
  return await res.json();
}

// Fetch notable cities within a bounding box
async function fetchCitiesInBox(minLat, maxLat, minLng, maxLng) {
  const url = `https://nominatim.openstreetmap.org/search?q=city&format=json&limit=15&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  return await res.json();
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      onPick(lat, lng);
    },
  });
  return null;
}

function MapFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }
  }, [bounds, map]);
  return null;
}

export default function DestinationMapPicker({
  onAdd,
  onClose,
  existingDestinations = [],
  origin,
  mainDestination,
}) {
  const [pending, setPending] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [suggestedCities, setSuggestedCities] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const mapRef = useRef(null);
  const searchTimeout = useRef(null);

  // Resolve origin/destination coordinates and fetch suggested cities
  useEffect(() => {
    async function init() {
      let oCoords = null;
      let dCoords = null;

      if (origin?.lat && origin?.lng) {
        oCoords = {
          lat: origin.lat,
          lng: origin.lng,
          label: origin.city || "Origin",
        };
      } else if (origin?.city) {
        try {
          const r = await forwardGeocode(
            `${origin.city}${origin.country ? `, ${origin.country}` : ""}`,
          );
          if (r[0])
            oCoords = {
              lat: parseFloat(r[0].lat),
              lng: parseFloat(r[0].lon),
              label: origin.city,
            };
        } catch {}
      }

      if (mainDestination?.lat && mainDestination?.lng) {
        dCoords = {
          lat: mainDestination.lat,
          lng: mainDestination.lng,
          label: mainDestination.city || "Destination",
        };
      } else if (mainDestination?.city) {
        try {
          const r = await forwardGeocode(
            `${mainDestination.city}${mainDestination.country ? `, ${mainDestination.country}` : ""}`,
          );
          if (r[0])
            dCoords = {
              lat: parseFloat(r[0].lat),
              lng: parseFloat(r[0].lon),
              label: mainDestination.city,
            };
        } catch {}
      }

      if (oCoords) setOriginCoords(oCoords);
      if (dCoords) setDestCoords(dCoords);

      const a = oCoords;
      const b = dCoords || oCoords;
      if (a && b) {
        const pad = 3;
        const minLat = Math.min(a.lat, b.lat) - pad;
        const maxLat = Math.max(a.lat, b.lat) + pad;
        const minLng = Math.min(a.lng, b.lng) - pad;
        const maxLng = Math.max(a.lng, b.lng) + pad;
        setMapBounds([
          [minLat, minLng],
          [maxLat, maxLng],
        ]);

        // Only fetch suggestions if origin and destination are distinct
        if (
          oCoords &&
          dCoords &&
          !(
            Math.abs(oCoords.lat - dCoords.lat) < 0.5 &&
            Math.abs(oCoords.lng - dCoords.lng) < 0.5
          )
        ) {
          try {
            const cities = await fetchCitiesInBox(
              minLat,
              maxLat,
              minLng,
              maxLng,
            );
            setSuggestedCities(
              cities.map((c) => ({
                place_id: c.place_id,
                lat: parseFloat(c.lat),
                lng: parseFloat(c.lon),
                city:
                  c.address?.city ||
                  c.address?.town ||
                  c.address?.village ||
                  c.display_name.split(",")[0],
                country: c.address?.country || "",
                displayName: c.display_name,
              })),
            );
          } catch {}
        }
      }
    }
    init();
  }, []);

  const handleMapClick = async (lat, lng) => {
    setResolving(true);
    try {
      const place = await reverseGeocode(lat, lng);
      setPending((prev) => {
        if (
          prev.some(
            (p) =>
              Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lng - lng) < 0.001,
          )
        )
          return prev;
        return [...prev, place];
      });
    } catch {
      setPending((prev) => [
        ...prev,
        {
          city: `Lat ${lat.toFixed(3)}`,
          country: `Lng ${lng.toFixed(3)}`,
          displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
        },
      ]);
    } finally {
      setResolving(false);
    }
  };

  const handleSuggestedClick = (city) => {
    setPending((prev) => {
      if (
        prev.some(
          (p) =>
            Math.abs(p.lat - city.lat) < 0.01 &&
            Math.abs(p.lng - city.lng) < 0.01,
        )
      )
        return prev;
      return [...prev, city];
    });
    if (mapRef.current)
      mapRef.current.flyTo([city.lat, city.lng], 10, { duration: 1 });
  };

  const handleSearch = async (q) => {
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
      mapRef.current.flyTo([lat, lng], 12, { duration: 1 });
    }
    setResolving(true);
    try {
      const place = await reverseGeocode(lat, lng);
      setPending((prev) => {
        if (
          prev.some(
            (p) =>
              Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lng - lng) < 0.001,
          )
        )
          return prev;
        return [...prev, place];
      });
    } finally {
      setResolving(false);
    }
  };

  const removePending = (idx) => {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    for (const place of pending) {
      await onAdd(place);
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Route indicator bar */}
      {(originCoords || destCoords) && (
        <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          {originCoords && (
            <span className="flex items-center gap-1.5 text-green-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block flex-shrink-0" />
              {originCoords.label}
            </span>
          )}
          {originCoords && destCoords && (
            <span className="flex-1 border-t-2 border-dashed border-gray-300 mx-1" />
          )}
          {destCoords && (
            <span className="flex items-center gap-1.5 text-red-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block flex-shrink-0" />
              {destCoords.label}
            </span>
          )}
          {suggestedCities.length > 0 && (
            <span className="ml-auto text-amber-600 whitespace-nowrap">
              {suggestedCities.length} suggested stops
            </span>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search for a city or place..."
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
        Click anywhere on the map to pin a spot, or use search above.
        {suggestedCities.length > 0 &&
          " Click an orange marker to quickly add a suggested city along your route."}
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
          {mapBounds && <MapFitter bounds={mapBounds} />}
          <ClickHandler onPick={handleMapClick} />

          {/* Origin marker */}
          {originCoords && (
            <Marker
              position={[originCoords.lat, originCoords.lng]}
              icon={originIcon}
            >
              <Popup>
                <strong>ðŸŸ¢ Origin:</strong> {originCoords.label}
              </Popup>
            </Marker>
          )}

          {/* Main destination marker */}
          {destCoords &&
            !(
              originCoords &&
              Math.abs(destCoords.lat - originCoords.lat) < 0.5 &&
              Math.abs(destCoords.lng - originCoords.lng) < 0.5
            ) && (
              <Marker
                position={[destCoords.lat, destCoords.lng]}
                icon={mainDestIcon}
              >
                <Popup>
                  <strong>ðŸ”´ Main Destination:</strong> {destCoords.label}
                </Popup>
              </Marker>
            )}

          {/* Suggested cities along route */}
          {suggestedCities.map((city) => {
            const alreadyPicked = pending.some(
              (p) =>
                Math.abs(p.lat - city.lat) < 0.05 &&
                Math.abs(p.lng - city.lng) < 0.05,
            );
            const alreadySaved = existingDestinations.some(
              (d) =>
                d.lat &&
                Math.abs(d.lat - city.lat) < 0.05 &&
                Math.abs(d.lng - city.lng) < 0.05,
            );
            if (alreadyPicked || alreadySaved) return null;
            return (
              <Marker
                key={city.place_id}
                position={[city.lat, city.lng]}
                icon={suggestedIcon}
                eventHandlers={{ click: () => handleSuggestedClick(city) }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{city.city}</p>
                    <p className="text-xs text-amber-600 mb-1">
                      Suggested stop along route
                    </p>
                    <button
                      className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                      onClick={() => handleSuggestedClick(city)}
                    >
                      + Add to itinerary
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Already-saved destinations */}
          {existingDestinations
            .filter((d) => d.lat && d.lng)
            .map((d) => (
              <Marker key={d._id} position={[d.lat, d.lng]}>
                <Popup>{d.displayName || `${d.city}, ${d.country}`}</Popup>
              </Marker>
            ))}

          {/* Newly picked pins */}
          {pending.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]} icon={selectedIcon}>
              <Popup>
                <span className="font-medium">
                  {p.city}, {p.country}
                </span>
                <br />
                <span className="text-xs text-gray-500">{p.displayName}</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Pending chips */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-1 rounded-full"
            >
              <MapPin size={12} />
              <span className="max-w-[200px] truncate">
                {p.city || p.displayName}, {p.country}
              </span>
              <button
                onClick={() => removePending(i)}
                className="text-blue-400 hover:text-red-500"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {(originCoords || destCoords || suggestedCities.length > 0) && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {originCoords && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Origin
            </span>
          )}
          {destCoords && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Main
              destination
            </span>
          )}
          {suggestedCities.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400" /> Suggested
              stop
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Selected
          </span>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={pending.length === 0}
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Check size={15} />
          Add {pending.length > 0 ? `${pending.length} ` : ""}Destination
          {pending.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
