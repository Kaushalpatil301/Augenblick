import { Router } from "express";
import {
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
} from "../controllers/trip.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

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

export default router;
