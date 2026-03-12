import { Router } from "express";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
} from "../controllers/friend.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/search", searchUsers);
router.post("/request/:targetUserId", sendFriendRequest);
router.post("/accept/:senderId", acceptFriendRequest);
router.post("/reject/:senderId", rejectFriendRequest);
router.get("/requests", getFriendRequests);
router.get("/all", getFriends);

export default router;
