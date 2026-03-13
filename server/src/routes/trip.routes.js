import { Router } from "express";
import {
  generateTripDraft,
  createTrip,
  getUserTrips,
  getTripById,
  updateTripFromN8n,
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
} from "../controllers/trip.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// n8n callback must be public so workflow can push itinerary updates.
router.post("/:tripId/n8n-callback", updateTripFromN8n);

router.use(verifyJWT);

router.post("/draft", generateTripDraft);
router.post("/", createTrip);
router.get("/", getUserTrips);
router.get("/invitations", getTripInvitations);
router.get("/:tripId", getTripById);
router.post("/:tripId/destinations", addDestination);
router.delete("/:tripId/destinations/:destId", removeDestination);
router.patch("/:tripId/details", updateTripDetails);
router.post("/:tripId/invite", inviteToTrip);
router.post("/:tripId/respond", respondToTripInvitation);
router.patch("/:tripId/route", updateTripRoute);
router.get("/:tripId/messages", getTripMessages);
router.post("/:tripId/leave", leaveTrip);
router.delete("/:tripId", deleteTrip);
router.get("/:tripId/activities", getTripActivities);

export default router;
