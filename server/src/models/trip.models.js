import mongoose, { Schema } from "mongoose";

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
        lat: Number,
        lng: Number,
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
    transport: [
      {
        type: String, // Flight, Train, Bus, etc.
        details: String,
        departureTime: Date,
        arrivalTime: Date,
        departureLocation: {
          lat: Number,
          lng: Number,
          name: String,
        },
        arrivalLocation: {
          lat: Number,
          lng: Number,
          name: String,
        },
      },
    ],
    dining: [
      {
        restaurantName: String,
        cuisine: String,
        lat: Number,
        lng: Number,
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
    // ── Multi-Agent Results (Discovery) ──────────────────────────────────
    agents: {
      type: Schema.Types.Mixed,
      default: {
        accommodation: { status: "none", data: [] },
        activities: { status: "none", data: [] },
        dining: { status: "none", data: [] },
        transport: { status: "none", data: [] }
      }
    },
    // ──────────────────────────────────────────────────────────────────────
  },
  { timestamps: true },
);

export const Trip = mongoose.model("Trip", tripSchema);
