import { Router } from "express";
import {
  searchCities,
  getHotelsByCity,
  getHotelOffers,
  getPointsOfInterest,
} from "../controllers/amadeus.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/cities", searchCities);
router.get("/hotels", getHotelsByCity);
router.get("/hotel-offers", getHotelOffers);
router.get("/pois", getPointsOfInterest);

export default router;
