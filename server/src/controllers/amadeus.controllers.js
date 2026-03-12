import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { WikiCache } from "../models/wikiCache.models.js";
import { PoiCache } from "../models/poiCache.models.js";

const AMADEUS_BASE = "https://test.api.amadeus.com";

// In-memory token cache
let _tokenCache = null;

// In-memory response cache (key → { data, expiresAt })
const _responseCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 200;

function getCached(key) {
  const entry = _responseCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  _responseCache.delete(key);
  return null;
}

function setCache(key, data) {
  // Evict oldest entries if cache is full
  if (_responseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = _responseCache.keys().next().value;
    _responseCache.delete(firstKey);
  }
  _responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

async function getAmadeusToken() {
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 30_000) {
    return _tokenCache.token;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "[Amadeus] Missing AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET env vars",
    );
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
    const body = await res.text().catch(() => "");
    console.error(`[Amadeus] Token fetch failed — HTTP ${res.status}:`, body);
    throw new ApiError(502, "Failed to authenticate with Amadeus API");
  }

  const data = await res.json();
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  console.log(
    "[Amadeus] Access token refreshed, expires in",
    data.expires_in,
    "s",
  );
  return _tokenCache.token;
}

// GET /api/v1/amadeus/cities?keyword=Paris
const searchCities = asyncHandler(async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.trim().length < 2) {
    throw new ApiError(400, "keyword query param required (min 2 chars)");
  }

  const cacheKey = `cities:${keyword.trim().toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached)
    return res.json(new ApiResponse(200, cached, "Cities fetched (cached)"));

  const token = await getAmadeusToken();
  const url = `${AMADEUS_BASE}/v1/reference-data/locations/cities?keyword=${encodeURIComponent(keyword)}&max=10`;

  const apiRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    const detail = err?.errors?.[0]?.detail || "City search failed";
    console.error(
      `[Amadeus] searchCities failed — HTTP ${apiRes.status} — keyword: "${keyword}" — ${detail}`,
    );
    throw new ApiError(apiRes.status, detail);
  }

  const data = await apiRes.json();
  const result = data.data || [];
  setCache(cacheKey, result);
  return res.json(new ApiResponse(200, result, "Cities fetched"));
});

// GET /api/v1/amadeus/hotels?cityCode=PAR
const getHotelsByCity = asyncHandler(async (req, res) => {
  const { cityCode } = req.query;
  if (!cityCode) {
    throw new ApiError(400, "cityCode query param required");
  }

  const cacheKey = `hotels:${cityCode.toUpperCase()}`;
  const cached = getCached(cacheKey);
  if (cached)
    return res.json(new ApiResponse(200, cached, "Hotels fetched (cached)"));

  const token = await getAmadeusToken();
  const url = `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(cityCode.toUpperCase())}&radius=20&radiusUnit=KM&hotelSource=ALL`;

  const apiRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    const detail = err?.errors?.[0]?.detail || "Hotel search failed";
    console.error(
      `[Amadeus] getHotelsByCity failed — HTTP ${apiRes.status} — cityCode: ${cityCode} — ${detail}`,
    );
    throw new ApiError(apiRes.status, detail);
  }

  const data = await apiRes.json();
  const result = data.data || [];
  setCache(cacheKey, result);
  return res.json(new ApiResponse(200, result, "Hotels fetched"));
});

// GET /api/v1/amadeus/hotel-offers?hotelIds=MCLONGHM&checkInDate=2026-04-01&checkOutDate=2026-04-05&adults=1
const getHotelOffers = asyncHandler(async (req, res) => {
  const { hotelIds, checkInDate, checkOutDate, adults = 1 } = req.query;
  if (!hotelIds || !checkInDate || !checkOutDate) {
    throw new ApiError(400, "hotelIds, checkInDate, checkOutDate are required");
  }

  const cacheKey = `offers:${hotelIds}:${checkInDate}:${checkOutDate}:${adults}`;
  const cached = getCached(cacheKey);
  if (cached)
    return res.json(
      new ApiResponse(200, cached, "Hotel offers fetched (cached)"),
    );

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
    const detail = err?.errors?.[0]?.detail || "Hotel offers fetch failed";
    console.error(
      `[Amadeus] getHotelOffers failed — HTTP ${apiRes.status} — hotelIds: ${hotelIds} — ${detail}`,
    );
    throw new ApiError(apiRes.status, detail);
  }

  const data = await apiRes.json();
  const result = data.data || [];
  setCache(cacheKey, result);
  return res.json(new ApiResponse(200, result, "Hotel offers fetched"));
});

// GET /api/v1/amadeus/pois?latitude=48.8566&longitude=2.3522&radius=10000
// Uses Overpass API (OpenStreetMap) for POI data
const getPointsOfInterest = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10000 } = req.query;
  if (!latitude || !longitude) {
    throw new ApiError(400, "latitude and longitude query params are required");
  }

  // Round coords to ~100m precision for better cache hits
  const lat = Number(latitude).toFixed(3);
  const lng = Number(longitude).toFixed(3);
  const cacheKey = `pois:${lat}:${lng}:${radius}`;
  const cached = getCached(cacheKey);
  if (cached)
    return res.json(
      new ApiResponse(200, cached, "Points of interest fetched (cached)"),
    );

  // Check MongoDB cache
  const dbCached = await PoiCache.findOne({ key: cacheKey });
  if (dbCached) {
    setCache(cacheKey, dbCached.pois);
    return res.json(
      new ApiResponse(
        200,
        dbCached.pois,
        "Points of interest fetched (db cached)",
      ),
    );
  }

  const query = [
    "[out:json][timeout:25];",
    "(",
    `  node["tourism"~"attraction|museum|gallery|viewpoint|artwork|theme_park|zoo"](around:${radius},${lat},${lng});`,
    `  node["historic"](around:${radius},${lat},${lng});`,
    `  node["leisure"~"park|garden|nature_reserve"](around:${radius},${lat},${lng});`,
    ");",
    "out body 50;",
  ].join("\n");

  console.log(
    `[POI] Querying Overpass — lat:${lat} lng:${lng} radius:${radius}`,
  );
  const apiRes = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TripApp/1.0",
    },
    body: "data=" + encodeURIComponent(query),
  });

  if (!apiRes.ok) {
    const body = await apiRes.text().catch(() => "");
    console.error(
      `[POI] Overpass API failed — HTTP ${apiRes.status}:`,
      body.slice(0, 300),
    );
    throw new ApiError(apiRes.status, "Overpass POI search failed");
  }

  const data = await apiRes.json();
  const elements = data.elements || [];
  const named = elements.filter((e) => e.tags?.name);
  console.log(
    `[POI] Overpass returned ${elements.length} elements, ${named.length} with names`,
  );

  // Map to a consistent POI shape
  const pois = elements
    .filter((el) => el.tags?.name)
    .map((el, idx) => {
      const t = el.tags;
      const type = t.tourism || t.historic || t.leisure || "attraction";
      // Map OSM types to categories
      let category = "SIGHTS";
      if (["park", "garden", "nature_reserve"].includes(type))
        category = "BEACH_PARK";
      else if (["museum", "gallery"].includes(type)) category = "SIGHTS";
      else if (["restaurant", "cafe", "bar"].includes(type))
        category = "RESTAURANT";
      else if (["nightclub"].includes(type)) category = "NIGHTLIFE";

      return {
        id: String(el.id),
        name: t.name,
        category,
        type,
        geoCode: { latitude: el.lat, longitude: el.lon },
        tags: [
          ...new Set(
            [
              type,
              t.tourism,
              t.historic,
              t.leisure,
              t.wikipedia ? "wikipedia" : null,
            ].filter(Boolean),
          ),
        ],
      };
    });

  setCache(cacheKey, pois);

  // Also persist to MongoDB
  await PoiCache.findOneAndUpdate(
    { key: cacheKey },
    { key: cacheKey, pois },
    { upsert: true },
  ).catch((err) =>
    console.error("[POI] MongoDB cache write failed:", err.message),
  );

  return res.json(new ApiResponse(200, pois, "Points of interest fetched"));
});

// GET /api/v1/amadeus/wiki?q=Taj+Mahal+Mumbai
const getWikipediaInfo = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    throw new ApiError(400, "q query param required (min 2 chars)");
  }

  const cacheKey = q.trim().toLowerCase();

  // Check MongoDB cache first
  const dbCached = await WikiCache.findOne({ key: cacheKey });
  if (dbCached && dbCached.image) {
    return res.json(
      new ApiResponse(
        200,
        { image: dbCached.image, description: dbCached.description },
        "Wiki info (cached)",
      ),
    );
  }

  // Check in-memory cache
  const memCached = getCached(`wiki:${cacheKey}`);
  if (memCached && memCached.image) {
    return res.json(new ApiResponse(200, memCached, "Wiki info (mem cached)"));
  }

  try {
    // Single search call — no fallbacks to avoid burning rate limits
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "TripApp/1.0 (travel planning app)" },
    });
    if (!searchRes.ok) {
      return res.json(
        new ApiResponse(
          200,
          { image: null, description: "" },
          "Wikipedia unavailable",
        ),
      );
    }
    const searchData = await searchRes.json();
    const pageTitle = searchData?.query?.search?.[0]?.title;

    if (!pageTitle) {
      return res.json(
        new ApiResponse(
          200,
          { image: null, description: "" },
          "No wiki page found",
        ),
      );
    }

    // Get image + description in one request (pageimages + extracts)
    const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&format=json`;
    const infoRes = await fetch(infoUrl, {
      headers: { "User-Agent": "TripApp/1.0 (travel planning app)" },
    });
    if (!infoRes.ok) {
      return res.json(
        new ApiResponse(
          200,
          { image: null, description: "" },
          "Wikipedia unavailable",
        ),
      );
    }
    const infoData = await infoRes.json();
    const page = Object.values(infoData?.query?.pages || {})[0];

    const image = page?.thumbnail?.source || null;
    const result = { image, description: page?.extract || "" };

    // Only cache if we got a valid image
    if (image) {
      setCache(`wiki:${cacheKey}`, result);
      await WikiCache.findOneAndUpdate(
        { key: cacheKey },
        { key: cacheKey, image, description: result.description },
        { upsert: true },
      ).catch((err) =>
        console.error("[Wiki] MongoDB cache write failed:", err.message),
      );
    }

    return res.json(new ApiResponse(200, result, "Wiki info fetched"));
  } catch (err) {
    console.error("[Wiki] Error fetching info for:", q, err.message);
    return res.json(
      new ApiResponse(
        200,
        { image: null, description: "" },
        "Wiki fetch failed",
      ),
    );
  }
});

// GET /api/v1/amadeus/locations?keyword=Paris
const searchLocations = asyncHandler(async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.trim().length < 2) {
    throw new ApiError(400, "keyword query param required (min 2 chars)");
  }

  const cacheKey = `locations:${keyword.trim().toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached)
    return res.json(new ApiResponse(200, cached, "Locations fetched (cached)"));

  const token = await getAmadeusToken();
  const url = `${AMADEUS_BASE}/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(keyword)}&max=10`;

  const apiRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    const detail = err?.errors?.[0]?.detail || "Location search failed";
    throw new ApiError(apiRes.status, detail);
  }

  const data = await apiRes.json();
  const result = data.data || [];
  setCache(cacheKey, result);
  return res.json(new ApiResponse(200, result, "Locations fetched"));
});

// GET /api/v1/amadeus/flight-offers?originCode=PAR&destinationCode=LON&departureDate=2026-04-01&adults=1
const getFlightOffers = asyncHandler(async (req, res) => {
  const { originCode, destinationCode, departureDate, adults = 1 } = req.query;

  if (!originCode || !destinationCode || !departureDate) {
    throw new ApiError(
      400,
      "originCode, destinationCode, and departureDate are required",
    );
  }

  const cacheKey = `flights:${originCode}:${destinationCode}:${departureDate}:${adults}`;
  const cached = getCached(cacheKey);
  if (cached)
    return res.json(
      new ApiResponse(200, cached, "Flight offers fetched (cached)"),
    );

  const token = await getAmadeusToken();
  const params = new URLSearchParams({
    originLocationCode: originCode,
    destinationLocationCode: destinationCode,
    departureDate,
    adults: String(adults),
    max: "10",
    currencyCode: "USD",
  });

  const url = `${AMADEUS_BASE}/v2/shopping/flight-offers?${params.toString()}`;

  const apiRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    const detail = err?.errors?.[0]?.detail || "Flight search failed";
    console.error(`[Amadeus] getFlightOffers failed — HTTP ${apiRes.status}`);
    throw new ApiError(apiRes.status, detail);
  }

  const data = await apiRes.json();
  const result = data.data || [];
  setCache(cacheKey, result);
  return res.json(new ApiResponse(200, result, "Flight offers fetched"));
});

export {
  searchCities,
  getHotelsByCity,
  getHotelOffers,
  getPointsOfInterest,
  getWikipediaInfo,
  searchLocations,
  getFlightOffers,
};
