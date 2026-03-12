import mongoose, { Schema } from "mongoose";

const flightCacheSchema = new Schema({
  tripId: {
    type: Schema.Types.ObjectId,
    ref: "Trip",
    required: true,
    index: true,
  },
  fingerprint: { type: String, required: true },
  origin: { type: Schema.Types.Mixed },
  destination: { type: Schema.Types.Mixed },
  departureDate: { type: String },
  adults: { type: Number, default: 1 },
  results: { type: Schema.Types.Mixed, default: [] },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // TTL: 7 days
});

// One cache entry per trip
flightCacheSchema.index({ tripId: 1 }, { unique: true });

export const FlightCache = mongoose.model("FlightCache", flightCacheSchema);
