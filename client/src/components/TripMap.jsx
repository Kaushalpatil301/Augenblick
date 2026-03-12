import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { Filter } from "lucide-react";

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

export default function TripMap({ trip }) {
  const [filters, setFilters] = useState({
    origin: true,
    destination: true,
    attractions: true,
    accommodations: true,
    dining: true,
    transport: true,
    route: true,
  });

  const [center, setCenter] = useState([20, 0]);

  useEffect(() => {
    // Calculate center based on trip coordinates
    const markers = [];
    if (trip?.origin?.lat && trip?.origin?.lng) {
      markers.push([trip.origin.lat, trip.origin.lng]);
    }
    if (trip?.mainDestination?.lat && trip?.mainDestination?.lng) {
      markers.push([trip.mainDestination.lat, trip.mainDestination.lng]);
    }
    trip?.attractions?.forEach((a) => {
      if (a.lat && a.lng) markers.push([a.lat, a.lng]);
    });
    trip?.accommodations?.forEach((a) => {
      if (a.latitude && a.longitude) markers.push([a.latitude, a.longitude]);
    });
    trip?.dining?.forEach((d) => {
      if (d.lat && d.lng) markers.push([d.lat, d.lng]);
    });

    if (markers.length > 0) {
      const avgLat = markers.reduce((sum, m) => sum + m[0], 0) / markers.length;
      const avgLng = markers.reduce((sum, m) => sum + m[1], 0) / markers.length;
      setCenter([avgLat, avgLng]);
    }
  }, [trip]);

  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
        <Filter size={16} className="text-gray-600 flex-shrink-0" />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleFilter("origin")}
            className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
              filters.origin
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            🟢 Origin
          </button>
          <button
            onClick={() => toggleFilter("destination")}
            className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
              filters.destination
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            🔴 Destination
          </button>
          <button
            onClick={() => toggleFilter("route")}
            className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
              filters.route
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            Route
          </button>
          <button
            onClick={() => toggleFilter("attractions")}
            className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
              filters.attractions
                ? "bg-pink-100 text-pink-700 border border-pink-300"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            📸 Attractions
          </button>
          <button
            onClick={() => toggleFilter("accommodations")}
            className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
              filters.accommodations
                ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            🏨 Hotels
          </button>
          <button
            onClick={() => toggleFilter("dining")}
            className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
              filters.dining
                ? "bg-orange-100 text-orange-700 border border-orange-300"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            🍽️ Dining
          </button>
          <button
            onClick={() => toggleFilter("transport")}
            className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
              filters.transport
                ? "bg-teal-100 text-teal-700 border border-teal-300"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            ✈️ Transport
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={19}
          />

          {/* Origin Marker */}
          {filters.origin && trip?.origin?.lat && trip?.origin?.lng && (
            <Marker
              position={[trip.origin.lat, trip.origin.lng]}
              icon={createEmojiIcon("🟢", 40)}
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

          {/* Main Destination Marker */}
          {filters.destination &&
            trip?.mainDestination?.lat &&
            trip?.mainDestination?.lng && (
              <Marker
                position={[trip.mainDestination.lat, trip.mainDestination.lng]}
                icon={createEmojiIcon("🔴", 40)}
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

          {/* Route Line */}
          {filters.route &&
            trip?.origin?.lat &&
            trip?.origin?.lng &&
            trip?.mainDestination?.lat &&
            trip?.mainDestination?.lng && (
              <Polyline
                positions={[
                  [trip.origin.lat, trip.origin.lng],
                  [trip.mainDestination.lat, trip.mainDestination.lng],
                ]}
                color="#3b82f6"
                weight={3}
                opacity={0.7}
                dashArray="5, 5"
              />
            )}

          {/* Attractions Markers */}
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

          {/* Accommodations Markers */}
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
                        {new Date(acc.checkIn).toLocaleDateString()} -{" "}
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

          {/* Dining Markers */}
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

          {/* Transport Start/End Points */}
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

      {/* Info */}
      <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded-lg">
        Click on any marker to see more details. Use the filter buttons to
        show/hide different trip elements.
      </div>
    </div>
  );
}
