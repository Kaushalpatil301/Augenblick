// In-memory cache for Wikipedia image & description lookups
const _cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const entry = _cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  _cache.delete(key);
  return undefined;
}

function setCache(key, data) {
  if (_cache.size >= 500) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

/**
 * Fetch image URL and description from Wikipedia for a search term.
 * Returns { image: string|null, description: string }
 */
export async function fetchWikipediaInfo(searchTerm) {
  const cacheKey = searchTerm.trim().toLowerCase();
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srlimit=1&format=json&origin=*`,
    );
    const searchData = await searchRes.json();
    const pageTitle = searchData?.query?.search?.[0]?.title;
    if (!pageTitle) {
      const result = { image: null, description: "" };
      setCache(cacheKey, result);
      return result;
    }

    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
    );
    if (!res.ok) {
      const result = { image: null, description: "" };
      setCache(cacheKey, result);
      return result;
    }

    const data = await res.json();
    const result = {
      image: data.thumbnail?.source || data.originalimage?.source || null,
      description: data.extract || "",
    };
    setCache(cacheKey, result);
    return result;
  } catch {
    const result = { image: null, description: "" };
    setCache(cacheKey, result);
    return result;
  }
}
