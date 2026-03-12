import { getWikiInfo } from "../api/amadeus";

// Fallback data for popular destinations when API returns nothing
const FALLBACKS = {
  paris: {
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600",
    description:
      "Paris, the capital of France, is known for the Eiffel Tower, world-class museums like the Louvre, and its vibrant café culture.",
  },
  london: {
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600",
    description:
      "London, the capital of the United Kingdom, is a global city famous for Big Ben, Buckingham Palace, and the River Thames.",
  },
  "new york": {
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600",
    description:
      "New York City, the largest city in the United States, is known for Times Square, Central Park, and the Statue of Liberty.",
  },
  tokyo: {
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600",
    description:
      "Tokyo, Japan's bustling capital, blends ultramodern skyscrapers with historic temples and a world-renowned food scene.",
  },
  mumbai: {
    image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600",
    description:
      "Mumbai, India's largest city, is the financial capital known for the Gateway of India, Bollywood, and Marine Drive.",
  },
  delhi: {
    image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600",
    description:
      "Delhi, India's capital territory, is a city rich in history with landmarks like the Red Fort, India Gate, and Qutub Minar.",
  },
  dubai: {
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600",
    description:
      "Dubai is a modern metropolis in the UAE known for the Burj Khalifa, luxury shopping, and ambitious architectural landmarks.",
  },
  rome: {
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600",
    description:
      "Rome, Italy's capital, is a sprawling city with nearly 3,000 years of history, home to the Colosseum, Vatican City, and the Pantheon.",
  },
  barcelona: {
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600",
    description:
      "Barcelona, Spain's cosmopolitan capital of Catalonia, is known for Gaudí's Sagrada Família, vibrant nightlife, and Mediterranean beaches.",
  },
  madrid: {
    image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600",
    description:
      "Madrid, the capital of Spain, is known for grand boulevards, the Prado Museum, Retiro Park, and its lively plazas and tapas culture.",
  },
  sydney: {
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600",
    description:
      "Sydney, Australia's largest city, is famous for its iconic Opera House, Harbour Bridge, and beautiful coastal beaches like Bondi.",
  },
  singapore: {
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600",
    description:
      "Singapore is a modern city-state in Southeast Asia known for Marina Bay Sands, Gardens by the Bay, and diverse street food.",
  },
  istanbul: {
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600",
    description:
      "Istanbul, straddling Europe and Asia, is Turkey's largest city, known for the Hagia Sophia, Blue Mosque, and the Grand Bazaar.",
  },
  bangkok: {
    image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600",
    description:
      "Bangkok, Thailand's vibrant capital, is known for ornate temples, bustling street markets, and its lively nightlife scene.",
  },
  cairo: {
    image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600",
    description:
      "Cairo, Egypt's sprawling capital, sits on the Nile River and is home to the iconic Pyramids of Giza and the Egyptian Museum.",
  },
  amsterdam: {
    image: "https://images.unsplash.com/photo-1534351590666-13e3e96b5571?w=600",
    description:
      "Amsterdam, the capital of the Netherlands, is known for its artistic heritage, canal system, and the Anne Frank House.",
  },
  berlin: {
    image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600",
    description:
      "Berlin, Germany's capital, is known for its history, vibrant arts scene, the Brandenburg Gate, and remnants of the Berlin Wall.",
  },
  "san francisco": {
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600",
    description:
      "San Francisco, on the California coast, is famous for the Golden Gate Bridge, Alcatraz Island, and its hilly streets.",
  },
  lisbon: {
    image: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600",
    description:
      "Lisbon, Portugal's hilly coastal capital, is known for its pastel-colored buildings, historic trams, and Belém Tower.",
  },
  prague: {
    image: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=600",
    description:
      "Prague, the capital of the Czech Republic, is known for its Old Town Square, Charles Bridge, and Gothic architecture.",
  },
  "kuala lumpur": {
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600",
    description:
      "Kuala Lumpur, Malaysia's capital, is known for the iconic Petronas Twin Towers, diverse cuisine, and vibrant markets.",
  },
};

function getFallback(searchTerm) {
  const lower = searchTerm.trim().toLowerCase();
  for (const [key, val] of Object.entries(FALLBACKS)) {
    if (lower.includes(key) || key.includes(lower.split(" ")[0])) return val;
  }
  return null;
}

// Light in-memory cache to avoid redundant network calls within one session
const _cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key, data) {
  if (_cache.size >= 500) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// Serialize requests to avoid flooding the server
let _queue = Promise.resolve();

/**
 * Fetch image URL and description from Wikipedia via our server proxy.
 * Server handles caching in MongoDB. Client keeps a light in-memory cache.
 * Returns { image: string|null, description: string }
 */
export async function fetchWikipediaInfo(searchTerm) {
  const cacheKey = searchTerm.trim().toLowerCase();
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  return new Promise((resolve) => {
    _queue = _queue.then(async () => {
      // Re-check cache after waiting in queue
      const c = getCached(cacheKey);
      if (c !== undefined) {
        resolve(c);
        return;
      }

      try {
        const res = await getWikiInfo(searchTerm);
        const result = res.data?.data || { image: null, description: "" };

        // If API returned a real image, cache and return
        if (result.image) {
          setCache(cacheKey, result);
          resolve(result);
          return;
        }

        // Fall back to placeholder for known destinations
        const fallback = getFallback(searchTerm);
        if (fallback) {
          setCache(cacheKey, fallback);
          resolve(fallback);
          return;
        }

        resolve(result);
      } catch (err) {
        console.error("[Wiki] Error fetching info for:", searchTerm, err);
        // Try fallback even on error
        const fallback = getFallback(searchTerm);
        resolve(fallback || { image: null, description: "" });
      }
    });
  });
}
