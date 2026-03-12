import { Router } from "express";
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTripDetails,
  inviteToTrip,
  getTripInvitations,
  respondToTripInvitation,
  getTripMessages,
} from "../controllers/trip.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/", createTrip);
router.get("/", getUserTrips);
router.get("/invitations", getTripInvitations);
router.get("/:tripId", getTripById);
router.patch("/:tripId/details", updateTripDetails);
router.post("/:tripId/invite", inviteToTrip);
router.post("/:tripId/respond", respondToTripInvitation);
router.get("/:tripId/messages", getTripMessages);

export default router;
