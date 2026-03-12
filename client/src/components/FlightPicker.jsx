import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Search,
  Loader2,
  Plane,
  MapPin,
  IndianRupee,
  Check,
  ChevronRight,
  X,
  ArrowRight,
  Clock,
} from "lucide-react";

const STEP = { SEARCH: "search", RESULTS: "results" };

export default function FlightPicker({ trip, onAdd, onClose }) {
  const [step, setStep] = useState(STEP.SEARCH);

  // Search parameters
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [departureDate, setDepartureDate] = useState(
    trip?.startDate ? trip.startDate.slice(0, 10) : "",
  );
  const [adults, setAdults] = useState(1);

  // Search inputs
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [originResults, setOriginResults] = useState([]);
  const [destResults, setDestResults] = useState([]);
  const [originLoading, setOriginLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const originTimeout = useRef(null);
  const destTimeout = useRef(null);

  // Results
  const [flights, setFlights] = useState([]);
  const [flightsLoading, setFlightsLoading] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [error, setError] = useState("");

  const makeLocation = (city, country) => {
    const iataCode = (city || "XXX")
      .replace(/[^a-z]/gi, "")
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, "X");
    return {
      id: `local-${city || "city"}-${country || "country"}`,
      name: city || "Unknown",
      iataCode,
      address: {
        cityName: city || "Unknown",
        countryCode: (country || "IN").toUpperCase().slice(0, 2),
      },
    };
  };

  // Pre-fill origin/destination from trip
  useState(() => {
    setDefaultRoute();
  });

  const setDefaultRoute = () => {
    if (trip?.origin) {
      const loc = makeLocation(trip.origin.city, trip.origin.country);
      setOrigin(loc);
      setOriginQuery(`${loc.name} (${loc.iataCode})`);
    }
    if (trip?.mainDestination) {
      const loc = makeLocation(
        trip.mainDestination.city,
        trip.mainDestination.country,
      );
      setDestination(loc);
      setDestQuery(`${loc.name} (${loc.iataCode})`);
    }
    setFlights([]);
    setStep(STEP.SEARCH);
  };

  const handleQuickPick = (city, type) => {
    const loc = makeLocation(city, "IN");
    if (type === "origin") {
      setOrigin(loc);
      setOriginQuery(`${loc.name} (${loc.iataCode})`);
    } else {
      setDestination(loc);
      setDestQuery(`${loc.name} (${loc.iataCode})`);
    }
  };

  const handleOriginSearch = (q) => {
    setOriginQuery(q);
    clearTimeout(originTimeout.current);
    setOriginResults([]);
    if (q.trim().length < 2) return;
    originTimeout.current = setTimeout(async () => {
      setOriginLoading(true);
      try {
        setOriginResults([makeLocation(q, "IN")]);
      } catch {
        setOriginResults([]);
      } finally {
        setOriginLoading(false);
      }
    }, 400);
  };

  const handleDestSearch = (q) => {
    setDestQuery(q);
    clearTimeout(destTimeout.current);
    setDestResults([]);
    if (q.trim().length < 2) return;
    destTimeout.current = setTimeout(async () => {
      setDestLoading(true);
      try {
        setDestResults([makeLocation(q, "IN")]);
      } catch {
        setDestResults([]);
      } finally {
        setDestLoading(false);
      }
    }, 400);
  };

  const formatIata = (query, fallback = "XXX") => {
    const letters = (query || "").replace(/[^a-z]/gi, "").toUpperCase();
    if (letters.length >= 3) return letters.slice(0, 3);
    return fallback;
  };

  const buildDemoFlights = (fromCode, toCode, date, pax) => {
    const carriers = ["AI", "EK", "QR", "LH", "BA"];
    const cabins = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS"];
    const base = new Date(`${date}T00:00:00`);

    const makeIso = (hours, minutes) => {
      const d = new Date(base);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    return Array.from({ length: 5 }).map((_, i) => {
      const stops = i % 2; // alternate direct and 1-stop options
      const depHour = 6 + i * 3;
      const durationMins = 140 + i * 25 + stops * 55;
      const arrDate = new Date(makeIso(depHour, 15));
      arrDate.setMinutes(arrDate.getMinutes() + durationMins);

      const firstSegment = {
        departure: { iataCode: fromCode, at: makeIso(depHour, 15) },
        arrival: {
          iataCode: stops ? "HUB" : toCode,
          at: makeIso(depHour + (stops ? 2 : 3), stops ? 5 : 0),
        },
        carrierCode: carriers[i % carriers.length],
        number: String(200 + i * 7),
      };

      const segments = stops
        ? [
            firstSegment,
            {
              departure: {
                iataCode: "HUB",
                at: makeIso(depHour + 3, 5),
              },
              arrival: { iataCode: toCode, at: arrDate.toISOString() },
              carrierCode: carriers[(i + 1) % carriers.length],
              number: String(300 + i * 5),
            },
          ]
        : [
            {
              ...firstSegment,
              arrival: { iataCode: toCode, at: arrDate.toISOString() },
            },
          ];

      const hours = Math.floor(durationMins / 60);
      const mins = durationMins % 60;

      return {
        id: `demo-${fromCode}-${toCode}-${i}`,
        oneWay: true,
        itineraries: [
          {
            duration: `PT${hours}H${mins}M`,
            segments,
          },
        ],
        travelerPricings: [
          {
            fareDetailsBySegment: [
              {
                cabin: cabins[i % cabins.length],
              },
            ],
          },
        ],
        price: {
          total: String(
            4500 +
              Math.round(Math.random() * 15500) +
              Math.max(0, pax - 1) * 2000,
          ),
          currency: "INR",
        },
      };
    });
  };

  const handleSearch = async () => {
    if (!departureDate) {
      setError("Please select a departure date.");
      return;
    }
    setFlightsLoading(true);
    setError("Showing demo flight options.");
    setFlights([]);
    try {
      const fromCode = origin?.iataCode || formatIata(originQuery, "ORG");
      const toCode = destination?.iataCode || formatIata(destQuery, "DST");
      const results = buildDemoFlights(fromCode, toCode, departureDate, adults);
      setFlights(results);
      setStep(STEP.RESULTS);
    } catch (e) {
      setError(e?.message || "Failed to generate demo flights");
    } finally {
      setFlightsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedFlight) return;

    // Format flight details for the trip transport object
    const itinerary = selectedFlight.itineraries[0];
    const firstSegment = itinerary.segments[0];
    const lastSegment = itinerary.segments[itinerary.segments.length - 1];

    const details = `${firstSegment.carrierCode}${firstSegment.number} · ${firstSegment.departure.iataCode} → ${lastSegment.arrival.iataCode} · ${selectedFlight.travelerPricings[0].fareDetailsBySegment[0].cabin}`;

    onAdd({
      type: "Flight",
      details: details,
      departureTime: firstSegment.departure.at,
      arrivalTime: lastSegment.arrival.at,
      priceTotal: selectedFlight.price.total,
      priceCurrency: selectedFlight.price.currency,
    });
    onClose();
  };

  const formatDuration = (duration) => {
    // PT2H35M -> 2h 35m
    return duration
      .replace("PT", "")
      .replace("H", "h ")
      .replace("M", "m")
      .toLowerCase();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── STEP 1: Search ── */}
      {step === STEP.SEARCH && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">From</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Origin City or Airport"
                  className="pl-9"
                  value={originQuery}
                  onChange={(e) => handleOriginSearch(e.target.value)}
                />
                {originLoading && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              {originResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-[280px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y">
                  {originResults.map(
                    (loc) =>
                      loc.iataCode && (
                        <button
                          key={loc.id}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 flex flex-col"
                          onClick={() => {
                            setOrigin(loc);
                            setOriginQuery(`${loc.name} (${loc.iataCode})`);
                            setOriginResults([]);
                          }}
                        >
                          <span className="text-sm font-medium">
                            {loc.name}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {loc.address?.cityName}, {loc.address?.countryCode}{" "}
                            ·{" "}
                            <Badge
                              variant="outline"
                              className="text-[9px] h-3 px-1"
                            >
                              {loc.iataCode}
                            </Badge>
                          </span>
                        </button>
                      ),
                  )}
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">To</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Destination City or Airport"
                  className="pl-9"
                  value={destQuery}
                  onChange={(e) => handleDestSearch(e.target.value)}
                />
                {destLoading && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              {destResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-[280px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y">
                  {destResults.map(
                    (loc) =>
                      loc.iataCode && (
                        <button
                          key={loc.id}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 flex flex-col"
                          onClick={() => {
                            setDestination(loc);
                            setDestQuery(`${loc.name} (${loc.iataCode})`);
                            setDestResults([]);
                          }}
                        >
                          <span className="text-sm font-medium">
                            {loc.name}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {loc.address?.cityName}, {loc.address?.countryCode}{" "}
                            ·{" "}
                            <Badge
                              variant="outline"
                              className="text-[9px] h-3 px-1"
                            >
                              {loc.iataCode}
                            </Badge>
                          </span>
                        </button>
                      ),
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Departure Date
              </label>
              <Input
                type="date"
                value={departureDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Adults
              </label>
              <Input
                type="number"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Quick pick from trip points */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Quick Pick from Trip
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                trip.origin && { label: "Origin", city: trip.origin.city },
                trip.mainDestination && {
                  label: "Destination",
                  city: trip.mainDestination.city,
                },
                ...(trip.destinations || []).map((d) => ({
                  label: "Stop",
                  city: d.city,
                })),
              ]
                .filter(Boolean)
                .map((pt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (origin?.iataCode && !destination?.iataCode)
                        handleQuickPick(pt.city, "dest");
                      else handleQuickPick(pt.city, "origin");
                    }}
                    className="text-[11px] bg-gray-100 hover:bg-gray-200 border border-gray-200 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <MapPin size={10} /> {pt.city}
                  </button>
                ))}
            </div>
          </div>

          <Button
            className="w-full gap-2 mt-2"
            onClick={handleSearch}
            disabled={
              flightsLoading || !origin || !destination || !departureDate
            }
          >
            {flightsLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Plane size={16} />
            )}
            Search Flights
          </Button>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* ── STEP 2: Results ── */}
      {step === STEP.RESULTS && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-blue-600">{origin?.iataCode}</span>
              <ArrowRight size={14} className="text-gray-400" />
              <span className="text-blue-600">{destination?.iataCode}</span>
              <span className="text-gray-400 font-normal">
                · {departureDate}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStep(STEP.SEARCH)}
            >
              Change
            </Button>
          </div>

          {flightsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-sm text-gray-500 animate-pulse">
                Finding the best deals...
              </p>
            </div>
          ) : flights.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <X className="mx-auto text-gray-300" size={32} />
              <p className="text-sm text-gray-500">
                No flights found for this search.
              </p>
              <Button variant="link" onClick={() => setStep(STEP.SEARCH)}>
                Try another date
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {flights.map((flight) => {
                const isSelected = selectedFlight?.id === flight.id;
                const itinerary = flight.itineraries[0];
                const departure = itinerary.segments[0].departure;
                const arrival =
                  itinerary.segments[itinerary.segments.length - 1].arrival;
                const stops = itinerary.segments.length - 1;

                return (
                  <button
                    key={flight.id}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 shadow-sm"
                    }`}
                    onClick={() => setSelectedFlight(flight)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold text-gray-900">
                              {departure.at.slice(11, 16)}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold">
                              {departure.iataCode}
                            </p>
                          </div>

                          <div className="flex-1 flex flex-col items-center px-2">
                            <span className="text-[10px] text-gray-400 font-medium mb-1 flex items-center gap-1">
                              <Clock size={10} />{" "}
                              {formatDuration(itinerary.duration)}
                            </span>
                            <div className="relative w-full h-[1px] bg-gray-200 flex items-center justify-center">
                              <div className="absolute w-1.5 h-1.5 rounded-full border border-gray-200 bg-white" />
                              {stops > 0 && (
                                <div className="absolute top-1 text-[9px] text-orange-600 font-bold">
                                  {stops} stop{stops > 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-tighter">
                              {itinerary.segments[0].carrierCode}{" "}
                              {itinerary.segments[0].number}
                            </span>
                          </div>

                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold text-gray-900">
                              {arrival.at.slice(11, 16)}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold">
                              {arrival.iataCode}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] h-4">
                            {
                              flight.travelerPricings[0].fareDetailsBySegment[0]
                                .cabin
                            }
                          </Badge>
                          {flight.oneWay && (
                            <Badge variant="outline" className="text-[9px] h-4">
                              One Way
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-right pl-4">
                        <p className="text-sm text-gray-400 mb-0.5">
                          Total price
                        </p>
                        <p className="text-xl font-black text-blue-700 flex items-center justify-end">
                          <IndianRupee size={16} />
                          {Math.round(flight.price.total)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          {flight.price.currency}
                        </p>
                        {isSelected && (
                          <div className="mt-2 flex justify-end">
                            <div className="bg-blue-600 text-white rounded-full p-1 shadow-lg">
                              <Check size={14} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-auto">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        {selectedFlight && (
          <Button
            onClick={handleConfirm}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 px-6"
          >
            <Check size={16} />
            Confirm Selection
          </Button>
        )}
      </div>
    </div>
  );
}
