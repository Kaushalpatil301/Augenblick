import { Trip } from "../models/trip.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Message from "../models/Message.js";

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
    createdBy: userId,
    members: [userId],
  });
    // ── Fire n8n webhook (fire-and-forget) ──────────────────────────────────
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.max(
      1,
      Math.round((end - start) / (1000 * 60 * 60 * 24))
    );
    const destinationName =
      mainDestination?.city ||
      mainDestination?.displayName ||
      destinations?.[0]?.city ||
      "Unknown";

    const query = `${durationDays} days in ${destinationName}. Trip: "${name}". ` +
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
          // If n8n returns the itinerary immediately in the response
          if (result && (result.days || result.activities)) {
            const t = await Trip.findById(trip._id);
            if (t) {
              t.itinerary = result;
              t.itineraryStatus = "done";
              await t.save();
              console.log("[n8n] Captured immediate itinerary from response");
            }
          }
        }
      })
      .catch((err) =>
        console.error(
          "[n8n webhook] Failed to fire travel-plan webhook:",
          err.message
        )
      );
  } catch (webhookErr) {
    console.error(
      "[n8n webhook] Error preparing webhook payload:",
      webhookErr.message
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

export {
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
};
