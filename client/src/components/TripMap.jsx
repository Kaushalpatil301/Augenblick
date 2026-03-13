import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Eye, EyeOff } from "lucide-react";

// Helper to create emoji markers
const createEmojiIcon = (emoji, size = 32) => {
  return L.divIcon({
    html: `<div style="font-size: ${size}px; line-height: 1; text-shadow: 2px 2px 3px rgba(0,0,0,0.3);">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    className: "emoji-marker",
  });
};

// Helper to create map pin markers
const createMapPin = (color, label = "") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 36px; height: 36px; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3" fill="white"></circle>
  </svg>`;
  return L.divIcon({
    html: `<div style="position: relative; display: flex; align-items: center; justify-content: center;">
             ${svg}
             ${label ? `<span style="position: absolute; top: 6px; font-size: 11px; font-weight: bold; color: #1f2937;">${label}</span>` : ""}
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    className: "custom-pin",
  });
};

// Auto-fit bounds when points change
function AutoFitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 10 });
    } else if (points.length === 1) {
      map.setView(points[0], 8);
    }
  }, [points, map]);
  return null;
}

const FILTER_CONFIG = [
  {
    key: "origin",
    label: "Origin",
    emoji: "🟢",
    active: "bg-green-100 text-green-700 ring-green-400",
    dot: "bg-green-500",
  },
  {
    key: "destination",
    label: "Destination",
    emoji: "🔴",
    active: "bg-red-100 text-red-700 ring-red-400",
    dot: "bg-red-500",
  },
  {
    key: "stops",
    label: "Stops",
    emoji: "🔵",
    active: "bg-blue-100 text-blue-700 ring-blue-400",
    dot: "bg-blue-500",
  },
  {
    key: "route",
    label: "Route",
    emoji: "- -",
    active: "bg-sky-100 text-sky-700 ring-sky-400",
    dot: "bg-sky-500",
  },
  {
    key: "attractions",
    label: "Attractions",
    emoji: "📸",
    active: "bg-pink-100 text-pink-700 ring-pink-400",
    dot: "bg-pink-500",
  },
  {
    key: "accommodations",
    label: "Hotels",
    emoji: "🏨",
    active: "bg-indigo-100 text-indigo-700 ring-indigo-400",
    dot: "bg-indigo-500",
  },
  {
    key: "dining",
    label: "Dining",
    emoji: "🍽️",
    active: "bg-orange-100 text-orange-700 ring-orange-400",
    dot: "bg-orange-500",
  },
  {
    key: "transport",
    label: "Transport",
    emoji: "✈️",
    active: "bg-teal-100 text-teal-700 ring-teal-400",
    dot: "bg-teal-500",
  },
];

export default function TripMap({ trip, mapHeightClass = "h-[520px]" }) {
  const [drawnRoute, setDrawnRoute] = useState([]);
  const [filters, setFilters] = useState({
    origin: true,
    destination: true,
    stops: true,
    attractions: true,
    accommodations: true,
    dining: true,
    transport: true,
    route: true,
  });

  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allOn = Object.values(filters).every(Boolean);
  const toggleAll = () => {
    const next = !allOn;
    setFilters(Object.fromEntries(Object.keys(filters).map((k) => [k, next])));
  };

  // Build route polyline: origin → stops → destination
  const routePoints = useMemo(() => {
    const pts = [];
    if (trip?.origin?.lat && trip?.origin?.lng)
      pts.push([trip.origin.lat, trip.origin.lng]);
    trip?.destinations
      ?.filter((d) => d.lat && d.lng)
      .forEach((d) => pts.push([d.lat, d.lng]));
    if (trip?.mainDestination?.lat && trip?.mainDestination?.lng)
      pts.push([trip.mainDestination.lat, trip.mainDestination.lng]);
    return pts;
  }, [trip]);
  // Fetch actual route via OSRM
  useEffect(() => {
    if (routePoints.length < 2) {
      setDrawnRoute([]);
      return;
    }
    const fetchRoute = async () => {
      try {
        const coordsStr = routePoints.map((p) => `${p[1]},${p[0]}`).join(";");
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`,
        );
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates; // [[lng, lat]]
          setDrawnRoute(coords.map((c) => [c[1], c[0]]));
        } else {
          setDrawnRoute(routePoints);
        }
      } catch (err) {
        setDrawnRoute(routePoints);
      }
    };
    fetchRoute();
  }, [routePoints]);
  // All points for auto-fit
  const fitPoints = useMemo(() => {
    const pts = [];
    if (filters.origin && trip?.origin?.lat)
      pts.push([trip.origin.lat, trip.origin.lng]);
    if (filters.destination && trip?.mainDestination?.lat)
      pts.push([trip.mainDestination.lat, trip.mainDestination.lng]);
    if (filters.stops) {
      trip?.destinations
        ?.filter((d) => d.lat && d.lng)
        .forEach((d) => pts.push([d.lat, d.lng]));
    }
    if (filters.attractions) {
      trip?.attractions
        ?.filter((a) => a.lat && a.lng)
        .forEach((a) => pts.push([a.lat, a.lng]));
    }
    if (filters.accommodations) {
      trip?.accommodations
        ?.filter((a) => a.latitude && a.longitude)
        .forEach((a) => pts.push([a.latitude, a.longitude]));
    }
    if (filters.dining) {
      trip?.dining
        ?.filter((d) => d.lat && d.lng)
        .forEach((d) => pts.push([d.lat, d.lng]));
    }
    return pts;
  }, [trip, filters]);

  // Count items per filter
  const counts = useMemo(() => {
    const c = {};
    c.origin = trip?.origin?.lat ? 1 : 0;
    c.destination = trip?.mainDestination?.lat ? 1 : 0;
    c.stops = trip?.destinations?.filter((d) => d.lat && d.lng).length || 0;
    c.route = routePoints.length >= 2 ? 1 : 0;
    c.attractions =
      trip?.attractions?.filter((a) => a.lat && a.lng).length || 0;
    c.accommodations =
      trip?.accommodations?.filter((a) => a.latitude && a.longitude).length ||
      0;
    c.dining = trip?.dining?.filter((d) => d.lat && d.lng).length || 0;
    c.transport =
      trip?.transport?.filter(
        (t) => t.departureLocation?.lat || t.departureLocation?.latitude,
      ).length || 0;
    return c;
  }, [trip, routePoints]);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Map Layers
          </span>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {allOn ? <EyeOff size={13} /> : <Eye size={13} />}
            {allOn ? "Hide all" : "Show all"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_CONFIG.map(({ key, label, emoji, active, dot }) => (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                filters[key]
                  ? `${active} ring-1 shadow-sm`
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${filters[key] ? dot : "bg-gray-300"}`}
              />
              {label}
              {counts[key] > 0 && (
                <span
                  className={`text-[10px] ml-0.5 ${filters[key] ? "opacity-70" : "opacity-50"}`}
                >
                  ({counts[key]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Route summary strip */}
      {routePoints.length >= 2 && (
        <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-green-50 via-blue-50 to-red-50 rounded-lg px-4 py-2.5 border border-gray-200">
          <span className="flex items-center gap-1.5 text-green-700 font-semibold shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            {trip.origin?.city || "Origin"}
          </span>
          {(trip.destinations?.length || 0) > 0 && (
            <>
              <span className="border-t-2 border-dashed border-blue-300 flex-1 mx-1" />
              {trip.destinations
                .filter((d) => d.city)
                .map((d, i) => (
                  <React.Fragment key={i}>
                    <span className="flex items-center gap-1 text-blue-700 font-medium shrink-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {d.city}
                    </span>
                    {i <
                      trip.destinations.filter((dd) => dd.city).length - 1 && (
                      <span className="border-t-2 border-dashed border-blue-300 w-3 mx-0.5" />
                    )}
                  </React.Fragment>
                ))}
            </>
          )}
          <span className="border-t-2 border-dashed border-red-300 flex-1 mx-1" />
          <span className="flex items-center gap-1.5 text-red-700 font-semibold shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            {trip.mainDestination?.city || "Destination"}
          </span>
        </div>
      )}

      {/* Map */}
      <div
        className={`${mapHeightClass} rounded-xl overflow-hidden border border-gray-200 shadow-sm`}
      >
        <MapContainer
          center={[20, 0]}
          zoom={3}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={19}
          />
          <AutoFitBounds points={fitPoints} />

          {/* Origin */}
          {filters.origin && trip?.origin?.lat && trip?.origin?.lng && (
            <Marker
              position={[trip.origin.lat, trip.origin.lng]}
              icon={createMapPin("#22c55e", "")}
            >
              <Popup>
                <div className="text-sm font-semibold">
                  Origin: {trip.origin.city}
                </div>
                <div className="text-xs text-gray-600">
                  {trip.origin.country}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Main Destination */}
          {filters.destination &&
            trip?.mainDestination?.lat &&
            trip?.mainDestination?.lng && (
              <Marker
                position={[trip.mainDestination.lat, trip.mainDestination.lng]}
                icon={createMapPin("#ef4444", "")}
              >
                <Popup>
                  <div className="text-sm font-semibold">
                    Destination: {trip.mainDestination.city}
                  </div>
                  <div className="text-xs text-gray-600">
                    {trip.mainDestination.country}
                  </div>
                </Popup>
              </Marker>
            )}

          {/* Intermediate Stops */}
          {filters.stops &&
            trip?.destinations
              ?.filter((d) => d.lat && d.lng)
              .map((d, idx) => (
                <Marker
                  key={`stop-${idx}`}
                  position={[d.lat, d.lng]}
                  icon={createMapPin("#3b82f6", String(idx + 1))}
                >
                  <Popup>
                    <div className="text-sm font-semibold">
                      Stop {idx + 1}: {d.city}
                    </div>
                    <div className="text-xs text-gray-600">{d.country}</div>
                    {d.displayName && (
                      <div className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">
                        {d.displayName}
                      </div>
                    )}
                  </Popup>
                </Marker>
              ))}

          {/* Route Polyline — through all waypoints */}
          {filters.route && routePoints.length >= 2 && (
            <Polyline
              positions={drawnRoute.length >= 2 ? drawnRoute : routePoints} pathOptions={{ color: "#3b82f6", weight: 4, dashArray: drawnRoute.length >= 2 ? "none" : "8 6", opacity: 0.8, }}
            />
          )}

          {/* Attractions */}
          {filters.attractions &&
            trip?.attractions?.map(
              (attr, idx) =>
                attr.lat &&
                attr.lng && (
                  <Marker
                    key={`attraction-${idx}`}
                    position={[attr.lat, attr.lng]}
                    icon={createEmojiIcon("📸", 32)}
                  >
                    <Popup>
                      <div className="text-sm font-semibold">{attr.name}</div>
                      <div className="text-xs text-gray-600">
                        {attr.location}
                      </div>
                      {attr.date && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(attr.date).toLocaleDateString()}
                        </div>
                      )}
                    </Popup>
                  </Marker>
                ),
            )}

          {/* Accommodations */}
          {filters.accommodations &&
            trip?.accommodations?.map(
              (acc, idx) =>
                acc.latitude &&
                acc.longitude && (
                  <Marker
                    key={`accommodation-${idx}`}
                    position={[acc.latitude, acc.longitude]}
                    icon={createEmojiIcon("🏨", 32)}
                  >
                    <Popup>
                      <div className="text-sm font-semibold">{acc.name}</div>
                      <div className="text-xs text-gray-600">{acc.address}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(acc.checkIn).toLocaleDateString()} –{" "}
                        {new Date(acc.checkOut).toLocaleDateString()}
                      </div>
                      {acc.priceTotal && (
                        <div className="text-xs text-green-600 font-semibold mt-1">
                          {acc.priceCurrency} {acc.priceTotal}
                        </div>
                      )}
                    </Popup>
                  </Marker>
                ),
            )}

          {/* Dining */}
          {filters.dining &&
            trip?.dining?.map(
              (dine, idx) =>
                dine.lat &&
                dine.lng && (
                  <Marker
                    key={`dining-${idx}`}
                    position={[dine.lat, dine.lng]}
                    icon={createEmojiIcon("🍽️", 32)}
                  >
                    <Popup>
                      <div className="text-sm font-semibold">
                        {dine.restaurantName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {dine.cuisine}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(dine.dateTime).toLocaleString()}
                      </div>
                    </Popup>
                  </Marker>
                ),
            )}

          {/* Transport */}
          {filters.transport &&
            trip?.transport?.map(
              (trans, idx) =>
                (trans.departureLocation?.lat ||
                  trans.departureLocation?.latitude) &&
                (trans.departureLocation?.lng ||
                  trans.departureLocation?.longitude) && (
                  <Marker
                    key={`transport-${idx}`}
                    position={[
                      trans.departureLocation?.lat ||
                        trans.departureLocation?.latitude,
                      trans.departureLocation?.lng ||
                        trans.departureLocation?.longitude,
                    ]}
                    icon={createEmojiIcon("✈️", 32)}
                  >
                    <Popup>
                      <div className="text-sm font-semibold capitalize">
                        {trans.type}
                      </div>
                      <div className="text-xs text-gray-600">
                        {trans.details}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Departs:{" "}
                        {new Date(trans.departureTime).toLocaleString()}
                      </div>
                    </Popup>
                  </Marker>
                ),
            )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        <span className="italic">
          Click any marker for details. Toggle layers above to filter the map.
        </span>
        <span className="font-medium text-gray-600">
          {fitPoints.length} point{fitPoints.length !== 1 ? "s" : ""} shown
        </span>
      </div>
    </div>
  );
}



