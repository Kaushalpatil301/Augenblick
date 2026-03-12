import React, { useState, useEffect, useRef } from "react";
import {
  searchAmadeusCities,
  getHotelsByCity,
  getHotelOffers,
} from "../api/amadeus";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Search,
  Loader2,
  Hotel,
  MapPin,
  DollarSign,
  Check,
  ChevronRight,
  X,
} from "lucide-react";

// Steps: city → hotels → offers → confirm
const STEP = { CITY: "city", HOTELS: "hotels", OFFERS: "offers" };

export default function HotelPicker({ trip, onAdd, onClose }) {
  const [step, setStep] = useState(STEP.CITY);

  // City search
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const cityTimeout = useRef(null);

  // Hotel list
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);

  // Offers
  const [checkIn, setCheckIn] = useState(
    trip?.startDate ? trip.startDate.slice(0, 10) : "",
  );
  const [checkOut, setCheckOut] = useState(
    trip?.endDate ? trip.endDate.slice(0, 10) : "",
  );
  const [adults, setAdults] = useState(1);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offersError, setOffersError] = useState("");

  // Pre-populate city from trip destination
  useEffect(() => {
    const dest = trip?.mainDestination?.city || trip?.destinations?.[0]?.city;
    if (dest) setCityQuery(dest);
  }, []);

  const handleCitySearch = (q) => {
    setCityQuery(q);
    clearTimeout(cityTimeout.current);
    setCityResults([]);
    if (q.trim().length < 2) return;
    cityTimeout.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const res = await searchAmadeusCities(q);
        setCityResults(res.data.data || []);
      } catch {
        setCityResults([]);
      } finally {
        setCityLoading(false);
      }
    }, 400);
  };

  const handleCitySelect = async (city) => {
    setSelectedCity(city);
    setCityQuery(
      `${city.name}${city.address?.countryCode ? `, ${city.address.countryCode}` : ""}`,
    );
    setCityResults([]);
    setStep(STEP.HOTELS);
    setHotelsLoading(true);
    try {
      const res = await getHotelsByCity(city.iataCode);
      setHotels(res.data.data || []);
    } catch {
      setHotels([]);
    } finally {
      setHotelsLoading(false);
    }
  };

  const handleHotelSelect = (hotel) => {
    setSelectedHotel(hotel);
    setSelectedOffer(null);
    setOffers([]);
    setOffersError("");
    setStep(STEP.OFFERS);
  };

  const fetchOffers = async () => {
    if (!checkIn || !checkOut) return;
    setOffersLoading(true);
    setOffersError("");
    setOffers([]);
    setSelectedOffer(null);
    try {
      const res = await getHotelOffers(
        selectedHotel.hotelId,
        checkIn,
        checkOut,
        adults,
      );
      setOffers(res.data.data || []);
      if ((res.data.data || []).length === 0) {
        setOffersError("No available offers for these dates.");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "No offers available for the selected dates.";
      // Strip "Amadeus Error - " / "Provider Error - " prefix for cleaner display
      setOffersError(
        msg.replace(/^(Amadeus Error|Provider Error)\s*-\s*/i, ""),
      );
    } finally {
      setOffersLoading(false);
    }
  };

  const handleConfirm = () => {
    const offer = selectedOffer?.offers?.[0];
    onAdd({
      name: selectedHotel.name,
      hotelId: selectedHotel.hotelId,
      address:
        selectedHotel.address?.lines?.join(", ") || selectedCity?.name || "",
      cityCode: selectedCity?.iataCode || "",
      latitude: selectedHotel.geoCode?.latitude,
      longitude: selectedHotel.geoCode?.longitude,
      priceTotal: offer?.price?.total || "",
      priceCurrency: offer?.price?.currency || "USD",
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
    });
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <button
          className={
            step !== STEP.CITY
              ? "text-blue-600 hover:underline"
              : "font-semibold text-gray-800"
          }
          onClick={() => step !== STEP.CITY && setStep(STEP.CITY)}
        >
          City
        </button>
        <ChevronRight size={12} />
        <button
          className={
            step === STEP.HOTELS
              ? "font-semibold text-gray-800"
              : step === STEP.OFFERS
                ? "text-blue-600 hover:underline"
                : "text-gray-400"
          }
          onClick={() => step === STEP.OFFERS && setStep(STEP.HOTELS)}
        >
          Hotels
        </button>
        <ChevronRight size={12} />
        <span
          className={
            step === STEP.OFFERS
              ? "font-semibold text-gray-800"
              : "text-gray-400"
          }
        >
          Offers
        </span>
      </div>

      {/* ── STEP 1: City ── */}
      {step === STEP.CITY && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Search for a city to find available hotels.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="e.g. Paris, Tokyo, New York…"
              className="pl-9"
              value={cityQuery}
              onChange={(e) => handleCitySearch(e.target.value)}
              autoFocus
            />
            {cityLoading && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          {cityResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y">
              {cityResults.map((city) => (
                <button
                  key={city.id}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3"
                  onClick={() => handleCitySelect(city)}
                >
                  <MapPin size={15} className="text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{city.name}</p>
                    <p className="text-xs text-gray-500">
                      {city.address?.stateCode
                        ? `${city.address.stateCode}, `
                        : ""}
                      {city.address?.countryCode} · IATA: {city.iataCode}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Quick-pick from trip destinations */}
          {trip?.destinations?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Trip destinations</p>
              <div className="flex flex-wrap gap-2">
                {trip.destinations.map((d) => (
                  <button
                    key={d._id}
                    className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100"
                    onClick={() => handleCitySearch(d.city)}
                  >
                    {d.city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Hotels ── */}
      {step === STEP.HOTELS && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Hotels in{" "}
            <span className="font-semibold">{selectedCity?.name}</span>
            {" · "}
            <span className="text-gray-400 text-xs">{hotels.length} found</span>
          </p>
          {hotelsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : hotels.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              No hotels found for this city.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y">
              {hotels.map((hotel) => (
                <button
                  key={hotel.hotelId}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3"
                  onClick={() => handleHotelSelect(hotel)}
                >
                  <Hotel size={15} className="text-indigo-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{hotel.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {hotel.address?.lines?.join(", ")}
                      {hotel.address?.cityName
                        ? ` · ${hotel.address.cityName}`
                        : ""}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-gray-300 flex-shrink-0"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Offers ── */}
      {step === STEP.OFFERS && selectedHotel && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <Hotel size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">{selectedHotel.name}</p>
              <p className="text-xs text-gray-500">
                {selectedHotel.address?.lines?.join(", ")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Check-in
              </label>
              <Input
                type="date"
                value={checkIn}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  setOffers([]);
                  setOffersError("");
                }}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Check-out
              </label>
              <Input
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  setOffers([]);
                  setOffersError("");
                }}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Adults
              </label>
              <Input
                type="number"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => {
                  setAdults(Number(e.target.value));
                  setOffers([]);
                  setOffersError("");
                }}
              />
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={fetchOffers}
            disabled={offersLoading || !checkIn || !checkOut}
          >
            {offersLoading ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <Search size={15} />
            )}
            Search Offers
          </Button>

          {offersError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <X size={15} className="mt-0.5 flex-shrink-0 text-red-400" />
              <span>{offersError}</span>
            </div>
          )}

          {offers.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {offers.map((offerData) => {
                const offer = offerData.offers?.[0];
                if (!offer) return null;
                const isSelected =
                  selectedOffer?.hotel?.hotelId === offerData.hotel?.hotelId;
                return (
                  <button
                    key={offerData.hotel?.hotelId || Math.random()}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedOffer(offerData)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {offer.room?.typeEstimated?.category ||
                            "Standard Room"}
                          {offer.room?.typeEstimated?.beds && (
                            <span className="text-xs text-gray-500 ml-1.5">
                              · {offer.room.typeEstimated.beds} bed
                              {offer.room.typeEstimated.beds > 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {offer.boardType || "Room Only"}
                          {offer.policies?.cancellations?.[0]?.description
                            ?.text && (
                            <span className="ml-2 text-green-600">
                              ·{" "}
                              {offer.policies.cancellations[0].description.text}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-blue-700 flex items-center gap-0.5">
                          <DollarSign size={14} />
                          {offer.price?.total}
                        </span>
                        <span className="text-xs text-gray-400">
                          {offer.price?.currency}
                        </span>
                        {isSelected && (
                          <Check size={16} className="text-blue-500" />
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
      <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 mt-auto">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {step === STEP.OFFERS && (
          <Button
            onClick={handleConfirm}
            disabled={!selectedHotel || !checkIn || !checkOut}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check size={15} />
            Add Hotel
          </Button>
        )}
      </div>
    </div>
  );
}
