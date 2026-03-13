import mongoose, { Schema } from "mongoose";

const transportSchema = new Schema(
  {
    type: { type: String }, // Flight, Train, Bus, etc.
    details: { type: String },
    departureTime: { type: Date },
    arrivalTime: { type: Date },
    priceTotal: { type: String },
    priceCurrency: { type: String },
  },
  { _id: false },
);

const itineraryChangeRequestSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ["slot", "day", "base"],
      required: true,
    },
    entityId: { type: String, required: true, trim: true },
    patch: { type: Schema.Types.Mixed, required: true, default: {} },
    message: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["open", "accepted", "rejected"],
      default: "open",
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const tripSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      city: { type: String, trim: true },
      country: { type: String, trim: true },
      displayName: { type: String, trim: true },
      lat: { type: Number },
      lng: { type: Number },
    },
    mainDestination: {
      city: { type: String, trim: true },
      country: { type: String, trim: true },
      displayName: { type: String, trim: true },
      lat: { type: Number },
      lng: { type: Number },
    },
    destinations: [
      {
        city: { type: String, trim: true },
        country: { type: String, trim: true },
        displayName: { type: String, trim: true },
        lat: { type: Number },
        lng: { type: Number },
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attractions: [
      {
        name: String,
        description: String,
        location: String,
        date: Date,
      },
    ],
    accommodations: [
      {
        name: String,
        hotelId: String,
        address: String,
        cityCode: String,
        latitude: Number,
        longitude: Number,
        priceTotal: String,
        priceCurrency: String,
        checkIn: Date,
        checkOut: Date,
      },
    ],
    transport: [transportSchema],
    dining: [
      {
        restaurantName: String,
        cuisine: String,
        dateTime: Date,
      },
    ],
    invitations: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    itineraryStatus: {
      type: String,
      enum: ["none", "pending", "done", "error"],
      default: "none",
    },
    itinerary: {
      type: Schema.Types.Mixed,
      default: null,
    },
    itineraryWorking: {
      type: Schema.Types.Mixed,
      default: null,
    },
    itineraryFinal: {
      type: Schema.Types.Mixed,
      default: null,
    },
    itineraryFinalizedAt: {
      type: Date,
      default: null,
    },
    itineraryFinalizedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    itineraryIsFinal: {
      type: Boolean,
      default: false,
    },
    itineraryVotes: {
      // Map of entityId -> Map(userId -> voteValue)
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    itineraryChangeRequests: {
      type: [itineraryChangeRequestSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["Planning", "Active", "Completed"],
      default: "Planning",
    },
  },
  { timestamps: true },
);

export const Trip = mongoose.model("Trip", tripSchema);
