import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const currentUserId = req.user._id;
  if (!query) {
    throw new ApiError(400, "Search query is required");
  }

  // Find users matching query, excluding current user
  const users = await User.find({
    username: { $regex: query, $options: "i" },
    _id: { $ne: currentUserId },
  }).select("username avatar email friends friendRequests");

  console.log(users);
  // Add status for each user (none, pending, friends)
  const usersWithStatus = users.map((user) => {
    let status = "none";
    if (user.friendRequests.includes(currentUserId)) {
      status = "pending";
    } else if (user.friends.includes(currentUserId)) {
      status = "friends";
    }
    // Check if the current user has a request from this user
    const hasIncomingRequest = req.user.friendRequests.includes(user._id);
    if (hasIncomingRequest) {
      status = "incoming";
    }

    return {
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      status,
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, usersWithStatus, "Users fetched successfully"));
});

const sendFriendRequest = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const currentUserId = req.user._id;

  if (targetUserId === currentUserId.toString()) {
    throw new ApiError(400, "You cannot send a friend request to yourself");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  if (targetUser.friends.includes(currentUserId)) {
    throw new ApiError(400, "You are already friends with this user");
  }

  if (targetUser.friendRequests.includes(currentUserId)) {
    throw new ApiError(400, "Friend request already sent");
  }

  targetUser.friendRequests.push(currentUserId);
  await targetUser.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Friend request sent successfully"));
});

const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { senderId } = req.params;
  const currentUserId = req.user._id;

  const currentUser = await User.findById(currentUserId);

  if (!currentUser.friendRequests.includes(senderId)) {
    throw new ApiError(400, "No friend request found from this user");
  }

  const sender = await User.findById(senderId);
  if (!sender) {
    throw new ApiError(404, "Sender not found");
  }

  // Add each other as friends
  currentUser.friends.push(senderId);
  sender.friends.push(currentUserId);

  // Remove request
  currentUser.friendRequests = currentUser.friendRequests.filter(
    (id) => id.toString() !== senderId.toString(),
  );

  await currentUser.save();
  await sender.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Friend request accepted successfully"));
});

const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { senderId } = req.params;
  const currentUserId = req.user._id;

  const currentUser = await User.findById(currentUserId);

  currentUser.friendRequests = currentUser.friendRequests.filter(
    (id) => id.toString() !== senderId.toString(),
  );

  await currentUser.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Friend request rejected successfully"));
});

const getFriendRequests = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  const user = await User.findById(currentUserId).populate(
    "friendRequests",
    "username avatar email",
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.friendRequests,
        "Friend requests fetched successfully",
      ),
    );
});

const getFriends = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  const user = await User.findById(currentUserId).populate(
    "friends",
    "username avatar email",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user.friends, "Friends fetched successfully"));
});

export {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
};
