import { Trip } from "../models/trip.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";
import { ensureWorkingItinerary, normalizeItinerary } from "../utils/itinerary-normalize.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const formatDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const normalizeLocation = (location) => {
  if (!location) {
    return null;
  }

  if (typeof location === "string") {
    const label = location.trim();
    return label ? { city: label, country: "", displayName: label } : null;
  }

  const city = typeof location.city === "string" ? location.city.trim() : "";
  const country =
    typeof location.country === "string" ? location.country.trim() : "";
  const displayName =
    typeof location.displayName === "string" && location.displayName.trim()
      ? location.displayName.trim()
      : [city, country].filter(Boolean).join(", ");

  if (!city && !country && !displayName) {
    return null;
  }

  return {
    city,
    country,
    displayName,
  };
};

const getLocationKey = (location) => {
  if (!location) {
    return "";
  }

  return [location.city, location.country, location.displayName]
    .filter(Boolean)
    .join("|")
    .trim()
    .toLowerCase();
};

const coerceCoordinates = (location) => {
  if (!location) {
    return null;
  }

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  return {
    ...location,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
};

const parseJsonObject = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const extractGeminiText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

const normalizeTripDraft = (draft, prompt, currentLocation) => {
  const today = new Date();
  const defaultStartDate = addDays(today, 14);
  const defaultEndDate = addDays(defaultStartDate, 4);
  const requestedDuration = Number(draft?.durationDays);

  const startDate =
    formatDateOnly(draft?.startDate) || formatDateOnly(defaultStartDate);
  const parsedEndDate = formatDateOnly(draft?.endDate);
  const fallbackEndDate = formatDateOnly(
    addDays(
      startDate,
      Number.isFinite(requestedDuration) && requestedDuration > 0
        ? requestedDuration - 1
        : 4,
    ),
  );

  let endDate =
    parsedEndDate || fallbackEndDate || formatDateOnly(defaultEndDate);
  if (new Date(endDate) < new Date(startDate)) {
    endDate = fallbackEndDate || formatDateOnly(defaultEndDate);
  }

  const budgetValue = Number(draft?.budget);
  const budget =
    Number.isFinite(budgetValue) && budgetValue > 0
      ? Math.round(budgetValue)
      : 1500;

  const origin =
    coerceCoordinates(normalizeLocation(currentLocation)) ||
    normalizeLocation(
      draft?.origin ||
        draft?.source ||
        draft?.currentLocation ||
        draft?.startLocation,
    );
  const mainDestination = normalizeLocation(
    draft?.mainDestination ||
      draft?.finalDestination ||
      draft?.destination ||
      draft?.endLocation,
  );
  const endpointKeys = new Set(
    [getLocationKey(origin), getLocationKey(mainDestination)].filter(Boolean),
  );
  const destinations = (
    Array.isArray(draft?.destinations)
      ? draft.destinations.map(normalizeLocation).filter(Boolean)
      : Array.isArray(draft?.stops)
        ? draft.stops.map(normalizeLocation).filter(Boolean)
        : []
  ).filter((location) => !endpointKeys.has(getLocationKey(location)));

  return {
    name:
      (typeof draft?.name === "string" && draft.name.trim()) ||
      prompt.slice(0, 60) ||
      "AI Planned Trip",
    startDate,
    endDate,
    budget,
    origin,
    mainDestination,
    destinations,
  };
};

const generateTripDraft = asyncHandler(async (req, res) => {
  const prompt =
    typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const currentLocation = req.body?.currentLocation;

  if (!prompt) {
    throw new ApiError(400, "Prompt is required");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(500, "GEMINI_API_KEY is not configured on the server");
  }

  const today = new Date().toISOString().slice(0, 10);
  const instruction = [
    "Convert the user's travel request into a trip creation draft.",
    `Today is ${today}.`,
    "Return only valid JSON and no markdown.",
    "Schema:",
    '{"name":"string","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","budget":1200,"origin":{"city":"string","country":"string","displayName":"string"},"mainDestination":{"city":"string","country":"string","displayName":"string"},"destinations":[{"city":"string","country":"string","displayName":"string"}],"durationDays":5}',
    "Rules:",
    currentLocation
      ? `- origin is already fixed to the user's current location: ${JSON.stringify(currentLocation)}. Reuse it and do not infer another source from the prompt.`
      : "- origin must be the current place or starting/source location mentioned in the prompt.",
    "- mainDestination must be the final destination or ending place mentioned in the prompt.",
    "- Do not put origin or mainDestination inside destinations.",
    "- If the user does not specify dates, choose realistic future dates.",
    "- If the user does not specify a budget, infer a sensible USD budget.",
    "- Keep origin null if it is not mentioned.",
    "- Use mainDestination for the final or primary destination.",
    "- Put intermediate stops only in destinations.",
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${instruction}\n\nUser prompt: ${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(502, `Gemini request failed: ${errorText}`);
  }

  const payload = await response.json();
  const parsedDraft = parseJsonObject(extractGeminiText(payload));
  if (!parsedDraft) {
    throw new ApiError(502, "Gemini returned an invalid trip draft");
  }

  const draft = normalizeTripDraft(parsedDraft, prompt, currentLocation);

  return res
    .status(200)
    .json(new ApiResponse(200, draft, "Trip draft generated successfully"));
});

const createTrip = asyncHandler(async (req, res) => {
  const {
    name,
    startDate,
    endDate,
    budget,
    origin,
    mainDestination,
    destinations,
  } = req.body;
  const userId = req.user._id;

  if (!name || !startDate || !endDate || budget === undefined) {
    throw new ApiError(400, "All fields are required");
  }

  if (new Date(startDate) > new Date(endDate)) {
    throw new ApiError(400, "Start date must be before end date");
  }

  const trip = await Trip.create({
    name,
    startDate,
    endDate,
    budget,
    origin: origin || undefined,
    mainDestination: mainDestination || undefined,
    destinations: Array.isArray(destinations) ? destinations : [],
    itineraryStatus: "pending",
    itinerary: null,
    createdBy: userId,
    members: [userId],
  });
  // ── Fire n8n webhook (fire-and-forget) ──────────────────────────────────
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.max(
      1,
      Math.round((end - start) / (1000 * 60 * 60 * 24)),
    );
    const destinationName =
      mainDestination?.city ||
      mainDestination?.displayName ||
      destinations?.[0]?.city ||
      "Unknown";

    const query =
      `${durationDays} days in ${destinationName}. Trip: "${name}". ` +
      `Dates: ${startDate} to ${endDate}. ` +
      (origin?.city ? `Travelling from ${origin.city}. ` : "") +
      (destinations?.length > 0
        ? `Stops: ${destinations.map((d) => d.city || d.displayName).join(", ")}. `
        : "") +
      `Looking for activities, accommodation, dining and transport recommendations.`;

    const serverUrl = process.env.SERVER_URL || "http://localhost:8000";
    const webhookBody = {
      query,
      budget: Number(budget),
      currency: "USD",
      tripId: trip._id.toString(),
      callbackUrl: `${serverUrl}/api/v1/trips/${trip._id}/n8n-callback`,
    };

    const webhookUrl =
      process.env.N8N_WEBHOOK_URL ||
      "http://localhost:5678/webhook-test/travel-plan";

    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    })
      .then(async (r) => {
        if (r.ok) {
          const result = await r.json();
          console.log("hello", result);
          // If n8n returns the itinerary immediately in the response
          if (
            result &&
            (result.days ||
              result.activities ||
              result.accommodation ||
              result.dining ||
              result.transport)
          ) {
            console.log(trip._id);
            const t = await Trip.findById(trip._id);
            if (t) {
              const itineraryPayload = result?.days
                ? result
                : result?.data?.days
                  ? result.data
                  : null;

              if (itineraryPayload?.days) {
                t.itinerary = itineraryPayload;
                t.markModified("itinerary");
                t.itineraryStatus = "done";
              } else {
                const categories = [
                  "activities",
                  "accommodation",
                  "dining",
                  "transport",
                ];
                const incomingAgents = {};

                categories.forEach((cat) => {
                  const node = result?.[cat] ?? result?.data?.[cat];
                  if (Array.isArray(node) && node.length > 0) {
                    incomingAgents[cat] = { status: "success", data: node };
                    return;
                  }
                  if (
                    node?.data &&
                    Array.isArray(node.data) &&
                    node.data.length > 0
                  ) {
                    incomingAgents[cat] = {
                      status: "success",
                      data: node.data,
                    };
                  }
                });

                if (Object.keys(incomingAgents).length > 0) {
                  t.agents = { ...(t.agents || {}), ...incomingAgents };
                  t.markModified("agents");
                  t.itineraryStatus = "done";
                }
              }

              await t.save();
              console.log("[n8n] Captured immediate itinerary from response");
            }
          }
        }
      })
      .catch((err) =>
        console.error(
          "[n8n webhook] Failed to fire travel-plan webhook:",
          err.message,
        ),
      );
  } catch (webhookErr) {
    console.error(
      "[n8n webhook] Error preparing webhook payload:",
      webhookErr.message,
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  return res
    .status(201)
    .json(new ApiResponse(201, trip, "Trip created successfully"));
});

const getUserTrips = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const trips = await Trip.find({ members: userId })
    .populate("createdBy", "username avatar")
    .populate("members", "username avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, trips, "Trips fetched successfully"));
});

/**
 * Utility to fix malformed n8n data stored as root-level string keys
 * Example: {"$set": {"agents.activities": {...}}}: null
 */
const repairTripAgentsData = (trip, rawDoc) => {
  if (!rawDoc) return false;
  let needsRepair = false;
  const repairedAgents = { ...(trip.agents || {}) };

  Object.keys(rawDoc).forEach((key) => {
    // Look for keys that start with JSON or contain $set
    if (
      key.trim().startsWith("{") &&
      (key.includes("$set") || key.includes("agents."))
    ) {
      try {
        // Clean key if it has spaces or escaped chars (common with n8n/mongo shell issues)
        const cleanKey = key.replace(/\\"/g, '"').trim();
        const parsed = JSON.parse(cleanKey);

        // n8n often puts the whole update command as a key
        const setData = parsed["$set"] || parsed;

        if (setData) {
          Object.keys(setData).forEach((innerKey) => {
            // Handle "agents.activities" or just "activities" etc.
            let category = null;
            if (innerKey.startsWith("agents.")) {
              category = innerKey.split(".")[1];
            } else if (
              ["activities", "accommodation", "dining", "transport"].includes(
                innerKey,
              )
            ) {
              category = innerKey;
            }

            if (category && setData[innerKey]) {
              // Extract the data array if it's wrapped in { status, data }
              const incoming = setData[innerKey];
              repairedAgents[category] = {
                status: "success",
                data:
                  incoming?.data || (Array.isArray(incoming) ? incoming : []),
              };
              needsRepair = true;
            }
          });
        }
      } catch (e) {
        console.error("[Repair] Failed to parse key:", key.substring(0, 50));
      }
    }
  });

  if (needsRepair) {
    trip.agents = repairedAgents;
    trip.markModified("agents");
  }
  return needsRepair;
};

const getTripById = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findOne({
    _id: tripId,
    members: userId,
  })
    .populate("createdBy", "username avatar")
    .populate("members", "username avatar email")
    .populate("invitations", "username avatar email");

  if (!trip) {
    throw new ApiError(404, "Trip not found or you are not a member");
  }

  // ── REPAIR DATA (LOCAL & EXTERNAL COLLECTIONS) ───────────────────────
  // We MUST fetch the raw document using the native driver because Mongoose
  // strips out fields (like the shredded keys) that aren't in the schema.
  const rawTrip = await mongoose.connection.db.collection("trips").findOne({
    _id: new mongoose.Types.ObjectId(tripId),
  });

  // 1. Fix malformed keys in the trip document itself
  const fixed = repairTripAgentsData(trip, rawTrip);

  // 2. Scavenge from separate n8n collections
  const externalAgents = {
    activities: [],
    accommodation: [],
    dining: [],
    transport: [],
  };

  const collectionMap = {
    activities: "activities",
    accommodation: "accommodations",
    dining: "dining",
    transport: "transportation",
  };

  for (const [key, colName] of Object.entries(collectionMap)) {
    try {
      const collection = mongoose.connection.db.collection(colName);

      // 1. Fetch valid schema docs natively
      const validDocs = await collection.find({ trip_id: tripId }).toArray();
      if (validDocs.length > 0) {
        externalAgents[key].push(...validDocs);
      }

      // 2. Fetch all other docs to scavenge malformed strings
      const docs = await collection.find({}).toArray();

      docs.forEach((doc) => {
        // Find if this doc belongs to our trip (tripId is inside a broken key)
        const brokenKey = Object.keys(doc).find((k) => k.includes(tripId));
        if (brokenKey) {
          try {
            const cleanKey = brokenKey.replace(/\\"/g, '"').trim();
            const parsed = JSON.parse(cleanKey);
            const setData = parsed["$set"] || parsed;

            Object.keys(setData).forEach((innerKey) => {
              // Extract the data array
              let val = setData[innerKey];
              if (val && val.data && Array.isArray(val.data)) {
                externalAgents[key].push(...val.data);
              } else if (Array.isArray(val)) {
                externalAgents[key].push(...val);
              }
            });
          } catch (e) {}
        }
      });
    } catch (err) {}
  }

  // Merge external findings into the trip object for the UI
  let merged = false;
  Object.keys(externalAgents).forEach((cat) => {
    if (externalAgents[cat].length > 0) {
      if (!trip.agents) trip.agents = {};
      if (!trip.agents[cat]) trip.agents[cat] = { status: "success", data: [] };

      const existingNames = new Set(
        trip.agents[cat].data.map((d) =>
          (d.name || d.hotel_name || d.restaurantName || "").toLowerCase(),
        ),
      );

      externalAgents[cat].forEach((item) => {
        const name = (
          item.name ||
          item.hotel_name ||
          item.restaurantName ||
          ""
        ).toLowerCase();
        if (name && !existingNames.has(name)) {
          trip.agents[cat].data.push(item);
          merged = true;
        }
      });
    }
  });

  if (fixed || merged) {
    trip.markModified("agents");
    await trip.save();
    console.log(
      "[Repair] Healed agent data from native driver for trip:",
      tripId,
    );
  }
  // ──────────────────────────────────────────────────────────────────────

  // Ensure itineraryWorking exists and has stable ids (migration-on-read).
  const normalizedChanged = ensureWorkingItinerary(trip);
  if (normalizedChanged) {
    await trip.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip fetched successfully"));
});

const updateTripDetails = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { type, data } = req.body; // type: 'attractions', 'accommodations', 'transport', 'dining'
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, members: userId });

  if (!trip) {
    throw new ApiError(404, "Trip not found or you are not a member");
  }

  if (
    !["attractions", "accommodations", "transport", "dining"].includes(type)
  ) {
    throw new ApiError(400, "Invalid update type");
  }

  if (type === "transport") {
    const payload = {
      type: data?.type || "Flight",
      details: data?.details || "Demo route",
      departureTime: data?.departureTime || null,
      arrivalTime: data?.arrivalTime || null,
      priceTotal: data?.priceTotal ? String(data.priceTotal) : null,
      priceCurrency: data?.priceCurrency || "INR",
    };
    trip.transport.push(payload);
  } else {
    trip[type].push(data);
  }
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip, `${type} added successfully`));
});

const addDestination = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { city, country, displayName, lat, lng } = req.body;
  const userId = req.user._id;

  if (!city || !country) {
    throw new ApiError(400, "City and country are required");
  }

  const trip = await Trip.findOne({ _id: tripId, members: userId });
  if (!trip) throw new ApiError(404, "Trip not found or you are not a member");

  trip.destinations.push({ city, country, displayName, lat, lng });
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip.destinations, "Destination added"));
});

const removeDestination = asyncHandler(async (req, res) => {
  const { tripId, destId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, members: userId });
  if (!trip) throw new ApiError(404, "Trip not found or you are not a member");

  trip.destinations = trip.destinations.filter(
    (d) => d._id.toString() !== destId,
  );
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip.destinations, "Destination removed"));
});

const inviteToTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { friendId } = req.body;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, members: userId });

  if (!trip) {
    throw new ApiError(404, "Trip not found or you are not a member");
  }

  if (trip.members.includes(friendId)) {
    throw new ApiError(400, "User is already a member of this trip");
  }

  if (trip.invitations.includes(friendId)) {
    throw new ApiError(400, "User is already invited to this trip");
  }

  trip.invitations.push(friendId);
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Invitation sent successfully"));
});

const getTripInvitations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const trips = await Trip.find({ invitations: userId })
    .populate("createdBy", "username avatar")
    .select("name destination startDate endDate createdBy");

  return res
    .status(200)
    .json(new ApiResponse(200, trips, "Trip invitations fetched successfully"));
});

const respondToTripInvitation = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { accept } = req.body;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, invitations: userId });

  if (!trip) {
    throw new ApiError(404, "Invitation not found");
  }

  // Remove from invitations
  trip.invitations = trip.invitations.filter(
    (id) => id.toString() !== userId.toString(),
  );

  if (accept) {
    trip.members.push(userId);
  }

  await trip.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `Trip invitation ${accept ? "accepted" : "rejected"} successfully`,
      ),
    );
});

const updateTripRoute = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { origin, mainDestination } = req.body;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, members: userId });
  if (!trip) throw new ApiError(404, "Trip not found or you are not a member");

  if (origin !== undefined) trip.origin = origin;
  if (mainDestination !== undefined) trip.mainDestination = mainDestination;
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip route updated successfully"));
});
const getTripMessages = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, members: userId });
  if (!trip) {
    throw new ApiError(404, "Trip not found or you are not a member");
  }

  const messages = await Message.find({ tripId })
    .sort({ createdAt: 1 })
    .limit(50);

  return res
    .status(200)
    .json(new ApiResponse(200, messages, "Messages fetched successfully"));
});

const leaveTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, members: userId });
  if (!trip) throw new ApiError(404, "Trip not found or you are not a member");

  if (trip.createdBy.toString() === userId.toString()) {
    throw new ApiError(
      400,
      "Trip creator cannot leave. Delete the trip instead.",
    );
  }

  trip.members = trip.members.filter(
    (id) => id.toString() !== userId.toString(),
  );
  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "You have left the trip"));
});

const deleteTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId });
  if (!trip) throw new ApiError(404, "Trip not found");

  if (trip.createdBy.toString() !== userId.toString()) {
    throw new ApiError(403, "Only the trip creator can delete this trip");
  }

  await Message.deleteMany({ tripId });
  await Trip.findByIdAndDelete(tripId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Trip deleted successfully"));
});

const updateTripFromN8n = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const rawData = { ...req.query, ...req.body };

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");

  console.log("[n8n Callback] Received payload for trip:", tripId);

  // ── 1. THE AGGRESSIVE SCAVENGER ──────────────────────────────────────────
  // Reconstruct "shredded" payloads where JSON fragments are stuck in keys
  let agentsFound = {};
  let fullPayloadString = "";

  // 1. Join keys WITHOUT spaces to reconstruct split JSON fragments
  const keys = Object.keys(rawData);
  const nullCount = keys.filter((k) => rawData[k] === null).length;

  if (nullCount > 5 || keys.some((k) => k.includes("agents."))) {
    // Join with nothing so split property names/values reconnect
    fullPayloadString = keys
      .join("")
      .replace(/\\n/g, "")
      .replace(/\\"/g, '"')
      .replace(/""/g, '"');
  } else {
    fullPayloadString = JSON.stringify(rawData);
  }

  // Define categories to look for
  const categories = ["activities", "accommodation", "dining", "transport"];

  categories.forEach((cat) => {
    try {
      // Look for the category and the data array following it
      // This regex handles escaped quotes and newlines common in these broken payloads
      const regex = new RegExp(
        `["'\\\\]*${cat}["'\\\\]*[:\\s]*{[^}]*["'\\\\]*data["'\\\\]*\\s*:\\s*(\\[[\\s\\S]*?\\])`,
        "i",
      );
      const match = fullPayloadString.match(regex);

      if (match && match[1]) {
        let cleanJson = match[1]
          .replace(/\\n/g, "") // remove newlines
          .replace(/\\"/g, '"') // unescape quotes
          .replace(/""/g, '"') // fix double quotes
          .trim();

        // Ensure it ends correctly
        if (cleanJson.endsWith("}]")) {
          const parsedData = JSON.parse(cleanJson);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            agentsFound[cat] = { status: "success", data: parsedData };
          }
        }
      }
    } catch (e) {
      console.log(`[Scavenger] Failed to parse category ${cat}:`, e.message);
    }
  });

  // Fallback to standard object scanning if regex didn't find everything
  if (Object.keys(agentsFound).length === 0) {
    const scan = (obj) => {
      if (!obj || typeof obj !== "object") return;
      if (obj.category && obj.data) {
        agentsFound[obj.category] = { status: "success", data: obj.data };
      }
      Object.keys(obj).forEach((key) => {
        if (obj[key] && typeof obj[key] === "object") scan(obj[key]);
      });
    };
    scan(rawData);
  }

  // Support "days" (The Itinerary format)
  if (rawData.days || (rawData.data && rawData.data.days)) {
    const itData = rawData.days || rawData.data;
    const normalized = normalizeItinerary(itData, tripId);
    trip.itinerary = normalized;
    trip.markModified("itinerary");
    trip.itineraryStatus = "done";

    // Keep working itinerary in sync unless user already finalized.
    if (!trip.itineraryIsFinal) {
      trip.itineraryWorking = normalized;
      trip.markModified("itineraryWorking");
    }
  }

  // ── 2. APPLY UPDATES ─────────────────────────────────────────────────────
  if (Object.keys(agentsFound).length > 0) {
    trip.agents = { ...trip.agents, ...agentsFound };
    trip.markModified("agents");
    trip.itineraryStatus = "done"; // Mark as done so UI stops loading
    console.log(
      "[n8n Callback] Successfully merged agents:",
      Object.keys(agentsFound),
    );
  }

  await trip.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Trip updated from n8n"));
});

const getAgentPlaygroundData = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const results = {
    activities: [],
    accommodation: [],
    dining: [],
    transport: [],
  };

  const normalizeText = (text) =>
    String(text || "")
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\s+/g, " ")
      .trim();

  const extractItemsFromParsed = (parsed, bucket) => {
    const setData = parsed?.$set || parsed;
    if (!setData || typeof setData !== "object") return;

    Object.values(setData).forEach((val) => {
      if (val && Array.isArray(val.data)) {
        bucket.push(...val.data);
        return;
      }
      if (Array.isArray(val)) {
        bucket.push(...val);
      }
    });
  };

  const extractRegexItems = (payload, key) => {
    const list = [];

    const pullPairs = (nameField, extraFieldMap = {}) => {
      const re = new RegExp(`"${nameField}"\\s*:\\s*"([^"]+)"`, "g");
      let match;
      while ((match = re.exec(payload)) !== null) {
        const obj = {};
        const value = (match[1] || "").trim();
        if (!value) continue;

        if (key === "dining") {
          obj.restaurantName = value;
          obj.name = value;
        } else if (key === "accommodation") {
          obj.hotel_name = value;
          obj.name = value;
        } else if (key === "transport") {
          obj.provider = value;
          obj.name = value;
        } else {
          obj.name = value;
        }

        Object.entries(extraFieldMap).forEach(([src, dst]) => {
          const extraRe = new RegExp(`"${src}"\\s*:\\s*"([^"]+)"`, "g");
          const slice = payload.slice(
            match.index,
            Math.min(payload.length, match.index + 1200),
          );
          const extraMatch = extraRe.exec(slice);
          if (extraMatch?.[1]) obj[dst] = extraMatch[1].trim();
        });

        list.push(obj);
      }
    };

    if (key === "activities") {
      pullPairs("name", { neighborhood: "neighborhood", pic_url: "pic_url" });
    } else if (key === "accommodation") {
      pullPairs("hotel_name", {
        neighborhood: "neighborhood",
        pic_url: "pic_url",
      });
      pullPairs("name", { neighborhood: "neighborhood", pic_url: "pic_url" });
    } else if (key === "dining") {
      pullPairs("name", { vibe: "vibe", image_url: "image_url" });
    } else if (key === "transport") {
      pullPairs("provider", {
        mode: "mode",
        estimated_total_cost: "estimated_total_cost",
      });
    }

    return list;
  };

  const dedupeItems = (arr, key) => {
    const seen = new Set();
    return arr.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const signature = (
        item.name ||
        item.hotel_name ||
        item.restaurantName ||
        item.provider ||
        item.id ||
        JSON.stringify(item)
      )
        .toString()
        .toLowerCase()
        .trim();

      if (!signature) return false;
      const scoped = `${key}:${signature}`;
      if (seen.has(scoped)) return false;
      seen.add(scoped);
      return true;
    });
  };

  const collectionMap = {
    activities: "activities",
    accommodation: "accommodations",
    dining: "dining",
    transport: "transportation",
  };

  for (const [key, colName] of Object.entries(collectionMap)) {
    try {
      const collection = mongoose.connection.db.collection(colName);
      const docs = await collection.find({}).toArray();

      docs.forEach((doc) => {
        const docKeys = Object.keys(doc).filter(
          (k) => k !== "_id" && k !== "__v",
        );
        const tripKey = docKeys.find((k) => k.includes(tripId));

        // Keep strict trip binding where available.
        if (!tripKey) return;

        // 1) Parse the exact key containing tripId (required path).
        try {
          const parsed = JSON.parse(tripKey);
          extractItemsFromParsed(parsed, results[key]);
        } catch (e) {
          // ignore and continue with fallback strategies
        }

        // 2) Parse any additional JSON-like keys in the same document.
        docKeys.forEach((docKey) => {
          if (!docKey.trim().startsWith("{")) return;
          try {
            const parsed = JSON.parse(docKey);
            extractItemsFromParsed(parsed, results[key]);
          } catch (e) {
            // ignore malformed JSON chunks
          }
        });

        // 3) Last-resort recovery: rebuild payload from shredded keys and regex-extract item fields.
        const payload = normalizeText(docKeys.join(""));
        if (payload) {
          const fallbackItems = extractRegexItems(payload, key);
          if (fallbackItems.length > 0) {
            results[key].push(...fallbackItems);
          }
        }
      });

      // If no strict trip-bound records were recovered, run a guarded fallback
      // against malformed docs that still contain this agent category payload.
      if (results[key].length === 0) {
        docs.forEach((doc) => {
          const docKeys = Object.keys(doc).filter(
            (k) => k !== "_id" && k !== "__v",
          );
          const payload = normalizeText(docKeys.join(""));
          if (
            !payload.includes(`agents.${key}`) &&
            !payload.includes(`"category":"${key}"`)
          ) {
            return;
          }

          const fallbackItems = extractRegexItems(payload, key);
          if (fallbackItems.length > 0) {
            results[key].push(...fallbackItems);
          }
        });
      }

      results[key] = dedupeItems(results[key], key);
    } catch (err) {
      console.error(`[Playground] Failed to query ${colName}:`, err.message);
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        results,
        "Agent playground data fetched successfully",
      ),
    );
});
const getTripActivities = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findOne({ _id: tripId, members: userId });
  if (!trip) {
    throw new ApiError(404, "Trip not found or you are not a member");
  }
  const trip_id=trip.itinerary.trip_id;
  const collection_activities = mongoose.connection.db.collection("activities");
  const collection_accomodations = mongoose.connection.db.collection("accomodations");
  const collection_dining = mongoose.connection.db.collection("dining");
  const collection_transport = mongoose.connection.db.collection("transportation");

  const activities = await collection_activities.find({ trip_id: trip_id }).toArray();
  const accomodations = await collection_accomodations.find({ trip_id: trip_id }).toArray();
  const dining = await collection_dining.find({ trip_id: trip_id }).toArray();
  const transport = await collection_transport.find({ trip_id: trip_id }).toArray();
  return res
    .status(200)
    .json(new ApiResponse(200, {activities, accomodations, dining, transport}, "Activities fetched successfully"));
});

const assertTripMember = (trip, userId) => {
  const uid = userId?.toString?.();
  if (!uid) return false;
  return Array.isArray(trip?.members)
    ? trip.members.some((m) => m?.toString?.() === uid)
    : false;
};

const assertTripCreator = (trip, userId) => {
  const uid = userId?.toString?.();
  if (!uid) return false;
  return trip?.createdBy?.toString?.() === uid;
};

const findDayById = (itinerary, dayId) => {
  if (!itinerary?.days || !Array.isArray(itinerary.days)) return null;
  return itinerary.days.find((d) => d?.day_id === dayId) || null;
};

const findSlotById = (itinerary, slotId) => {
  if (!itinerary?.days || !Array.isArray(itinerary.days)) return null;
  for (const day of itinerary.days) {
    if (!Array.isArray(day?.slots)) continue;
    const slot = day.slots.find((s) => s?.slot_id === slotId);
    if (slot) return { day, slot };
  }
  return null;
};

const voteItineraryItem = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;
  const entityType = req.body?.entityType;
  const entityId = typeof req.body?.entityId === "string" ? req.body.entityId.trim() : "";
  const value = Number(req.body?.value);

  if (!["slot", "day", "base"].includes(entityType)) {
    throw new ApiError(400, "Invalid entityType");
  }
  if (!entityId) throw new ApiError(400, "entityId is required");
  if (![1, -1, 0].includes(value)) {
    throw new ApiError(400, "value must be 1, -1, or 0");
  }

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");
  if (!assertTripMember(trip, userId)) {
    throw new ApiError(403, "You are not a member of this trip");
  }
  if (trip.itineraryIsFinal) {
    throw new ApiError(409, "Itinerary is finalized");
  }

  // Ensure working itinerary exists (for stable IDs).
  ensureWorkingItinerary(trip);

  const voteKey = `${entityType}:${entityId}`;
  const existing = trip.itineraryVotes?.get?.(voteKey) ?? {};
  const userKey = userId.toString();
  const next = { ...(existing || {}) };

  if (value === 0) {
    delete next[userKey];
  } else {
    next[userKey] = value;
  }

  trip.itineraryVotes.set(voteKey, next);
  trip.markModified("itineraryVotes");
  await trip.save();

  const score = Object.values(next).reduce((sum, v) => sum + Number(v || 0), 0);
  return res.status(200).json(
    new ApiResponse(
      200,
      { entityType, entityId, score, myVote: next[userKey] || 0 },
      "Vote saved",
    ),
  );
});

const createItineraryChange = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;
  const entityType = req.body?.entityType;
  const entityId = typeof req.body?.entityId === "string" ? req.body.entityId.trim() : "";
  const patch = req.body?.patch;
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!["slot", "day", "base"].includes(entityType)) {
    throw new ApiError(400, "Invalid entityType");
  }
  if (!entityId) throw new ApiError(400, "entityId is required");
  if (!patch || typeof patch !== "object") throw new ApiError(400, "patch must be an object");

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");
  if (!assertTripMember(trip, userId)) {
    throw new ApiError(403, "You are not a member of this trip");
  }
  if (trip.itineraryIsFinal) {
    throw new ApiError(409, "Itinerary is finalized");
  }

  ensureWorkingItinerary(trip);

  trip.itineraryChangeRequests.push({
    entityType,
    entityId,
    patch,
    message,
    createdBy: userId,
    status: "open",
  });
  trip.markModified("itineraryChangeRequests");
  await trip.save();

  const created = trip.itineraryChangeRequests[trip.itineraryChangeRequests.length - 1];
  return res
    .status(201)
    .json(new ApiResponse(201, created, "Change request created"));
});

const decideItineraryChange = asyncHandler(async (req, res) => {
  const { tripId, changeId } = req.params;
  const userId = req.user._id;
  const accept = Boolean(req.body?.accept);

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");
  if (!assertTripMember(trip, userId)) {
    throw new ApiError(403, "You are not a member of this trip");
  }
  if (!assertTripCreator(trip, userId)) {
    throw new ApiError(403, "Only the trip creator can decide changes");
  }
  if (trip.itineraryIsFinal) {
    throw new ApiError(409, "Itinerary is finalized");
  }

  ensureWorkingItinerary(trip);
  const change = trip.itineraryChangeRequests?.id?.(changeId);
  if (!change) throw new ApiError(404, "Change request not found");
  if (change.status !== "open") throw new ApiError(409, "Change request already decided");

  if (accept) {
    const working = trip.itineraryWorking;
    if (!working) throw new ApiError(409, "No working itinerary to modify");

    if (change.entityType === "base") {
      if (!working.base_accommodation?.base_id || working.base_accommodation.base_id !== change.entityId) {
        throw new ApiError(404, "Base accommodation not found");
      }
      working.base_accommodation = { ...working.base_accommodation, ...change.patch };
    } else if (change.entityType === "day") {
      const day = findDayById(working, change.entityId);
      if (!day) throw new ApiError(404, "Day not found");
      Object.assign(day, change.patch);
    } else if (change.entityType === "slot") {
      const found = findSlotById(working, change.entityId);
      if (!found) throw new ApiError(404, "Slot not found");
      Object.assign(found.slot, change.patch);
    }

    trip.itineraryWorking = normalizeItinerary(working, tripId);
    trip.markModified("itineraryWorking");

    change.status = "accepted";
  } else {
    change.status = "rejected";
  }

  change.decidedBy = userId;
  change.decidedAt = new Date();
  trip.markModified("itineraryChangeRequests");
  await trip.save();

  return res.status(200).json(new ApiResponse(200, change, "Decision saved"));
});

const finalizeItinerary = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");
  if (!assertTripMember(trip, userId)) {
    throw new ApiError(403, "You are not a member of this trip");
  }
  if (!assertTripCreator(trip, userId)) {
    throw new ApiError(403, "Only the trip creator can finalize");
  }

  ensureWorkingItinerary(trip);
  if (!trip.itineraryWorking) throw new ApiError(409, "No itinerary to finalize");

  trip.itineraryFinal = trip.itineraryWorking;
  trip.itineraryIsFinal = true;
  trip.itineraryFinalizedAt = new Date();
  trip.itineraryFinalizedBy = userId;
  trip.markModified("itineraryFinal");
  await trip.save();

  return res.status(200).json(new ApiResponse(200, trip, "Itinerary finalized"));
});

const unfinalizeItinerary = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");
  if (!assertTripMember(trip, userId)) {
    throw new ApiError(403, "You are not a member of this trip");
  }
  if (!assertTripCreator(trip, userId)) {
    throw new ApiError(403, "Only the trip creator can unfinalize");
  }

  trip.itineraryIsFinal = false;
  trip.itineraryFinalizedAt = null;
  trip.itineraryFinalizedBy = null;
  await trip.save();

  return res.status(200).json(new ApiResponse(200, trip, "Itinerary unfinalized"));
});

const chatItineraryWithGemini = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { message } = req.body;
  const userId = req.user._id;

  if (!message) {
    throw new ApiError(400, "Message is required");
  }

  const trip = await Trip.findOne({ _id: tripId, members: userId });
  if (!trip) {
    throw new ApiError(404, "Trip not found or you are not a member");
  }

  ensureWorkingItinerary(trip);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(500, "GEMINI_API_KEY is not configured");
  }

  const instruction = [
    "You are an AI travel assistant. The user wants to modify their current itinerary.",
    "Below is the current JSON representation of the itinerary.",
    "Please apply the user's requested changes to this JSON.",
    "Output ONLY a valid JSON object matching this exact schema:",
    "{",
    '  "updatedItinerary": { /* THE COMPLETE, UPDATED ITINERARY JSON matching the exact same schema structure as the input */ },',
    '  "explanation": "A friendly message explaining to the user exactly what was changed and why based on their request."',
    "}",
    "Do not include any markdown formatting, or text outside the JSON block."
  ].join("\n");

  const baseItinerary = trip.itineraryIsFinal ? trip.itineraryFinal : trip.itineraryWorking;
  const inputJson = JSON.stringify(baseItinerary || {}, null, 2);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${instruction}\n\nCurrent Itinerary JSON:\n${inputJson}\n\nUser Request: ${message}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(502, `Gemini request failed: ${errorText}`);
  }

  const payload = await response.json();
  const parsedResponse = parseJsonObject(extractGeminiText(payload));
  if (!parsedResponse || !parsedResponse.updatedItinerary) {
    throw new ApiError(502, "Gemini returned an invalid itinerary JSON format");
  }

  const parsedItinerary = parsedResponse.updatedItinerary;
  const explanation = parsedResponse.explanation || "I've updated your itinerary based on your request!";

  trip.itineraryWorking = parsedItinerary;
  trip.markModified("itineraryWorking");

  if (trip.itineraryIsFinal) {
    trip.itineraryFinal = parsedItinerary;
    trip.markModified("itineraryFinal");
  }

  await trip.save();

  return res.status(200).json(new ApiResponse(200, { 
    itineraryWorking: parsedItinerary, 
    itineraryFinal: trip.itineraryIsFinal ? parsedItinerary : undefined,
    explanation 
  }, "Itinerary updated by AI"));
});

export {
  generateTripDraft,
  createTrip,
  getUserTrips,
  getTripById,
  updateTripDetails,
  addDestination,
  removeDestination,
  inviteToTrip,
  getTripInvitations,
  respondToTripInvitation,
  updateTripRoute,
  getTripMessages,
  leaveTrip,
  deleteTrip,
  getTripActivities,
  updateTripFromN8n,
  getAgentPlaygroundData,
  voteItineraryItem,
  createItineraryChange,
  decideItineraryChange,
  finalizeItinerary,
  unfinalizeItinerary,
  chatItineraryWithGemini,
};
