import { Router } from "express";
import {
  searchCities,
  getHotelsByCity,
  getHotelOffers,
  getPointsOfInterest,
  getWikipediaInfo,
  searchLocations,
  getFlightOffers,
} from "../controllers/amadeus.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/cities", searchCities);
router.get("/locations", searchLocations);
router.get("/flight-offers", getFlightOffers);
router.get("/hotels", getHotelsByCity);
router.get("/hotel-offers", getHotelOffers);
router.get("/pois", getPointsOfInterest);
router.get("/wiki", getWikipediaInfo);

export default router;
