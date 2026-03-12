import mongoose, { Schema } from "mongoose";

const wikiCacheSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  image: { type: String, default: null },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // TTL: 7 days
});

export const WikiCache = mongoose.model("WikiCache", wikiCacheSchema);
