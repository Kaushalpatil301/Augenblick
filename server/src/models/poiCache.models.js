import mongoose, { Schema } from "mongoose";

const poiCacheSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  pois: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 3 }, // TTL: 3 days
});

export const PoiCache = mongoose.model("PoiCache", poiCacheSchema);
