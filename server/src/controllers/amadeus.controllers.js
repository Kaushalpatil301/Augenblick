import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

const AMADEUS_BASE = "https://test.api.amadeus.com";

// In-memory token cache
let _tokenCache = null;

async function getAmadeusToken() {
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 30_000) {
    return _tokenCache.token;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ApiError(503, "Amadeus API credentials not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new ApiError(502, "Failed to authenticate with Amadeus API");
  }

  const data = await res.json();
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return _tokenCache.token;
}

// GET /api/v1/amadeus/cities?keyword=Paris
const searchCities = asyncHandler(async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.trim().length < 2) {
    throw new ApiError(400, "keyword query param required (min 2 chars)");
  }

  const token = await getAmadeusToken();
  const url = `${AMADEUS_BASE}/v1/reference-data/locations/cities?keyword=${encodeURIComponent(keyword)}&max=10`;

  const apiRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    throw new ApiError(
      apiRes.status,
      err?.errors?.[0]?.detail || "City search failed",
    );
  }

  const data = await apiRes.json();
  return res.json(new ApiResponse(200, data.data || [], "Cities fetched"));
});

// GET /api/v1/amadeus/hotels?cityCode=PAR
const getHotelsByCity = asyncHandler(async (req, res) => {
  const { cityCode } = req.query;
  if (!cityCode) {
    throw new ApiError(400, "cityCode query param required");
  }

  const token = await getAmadeusToken();
  const url = `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(cityCode.toUpperCase())}&radius=20&radiusUnit=KM&hotelSource=ALL`;

  const apiRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    throw new ApiError(
      apiRes.status,
      err?.errors?.[0]?.detail || "Hotel search failed",
    );
  }

  const data = await apiRes.json();
  return res.json(new ApiResponse(200, data.data || [], "Hotels fetched"));
});

// GET /api/v1/amadeus/hotel-offers?hotelIds=MCLONGHM&checkInDate=2026-04-01&checkOutDate=2026-04-05&adults=1
const getHotelOffers = asyncHandler(async (req, res) => {
  const { hotelIds, checkInDate, checkOutDate, adults = 1 } = req.query;
  if (!hotelIds || !checkInDate || !checkOutDate) {
    throw new ApiError(400, "hotelIds, checkInDate, checkOutDate are required");
  }

  const token = await getAmadeusToken();
  const params = new URLSearchParams({
    hotelIds,
    checkInDate,
    checkOutDate,
    adults: String(adults),
    roomQuantity: "1",
    currency: "USD",
    bestRateOnly: "true",
  });

  const url = `${AMADEUS_BASE}/v3/shopping/hotel-offers?${params.toString()}`;

  const apiRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    throw new ApiError(
      apiRes.status,
      err?.errors?.[0]?.detail || "Hotel offers fetch failed",
    );
  }

  const data = await apiRes.json();
  return res.json(
    new ApiResponse(200, data.data || [], "Hotel offers fetched"),
  );
});

export { searchCities, getHotelsByCity, getHotelOffers };
