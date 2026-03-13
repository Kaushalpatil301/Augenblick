import crypto from "crypto";

const stableId = (seed) =>
  crypto.createHash("sha1").update(String(seed)).digest("hex").slice(0, 12);

const coerceString = (value) => (typeof value === "string" ? value.trim() : "");

const ensureBaseId = (base, tripId) => {
  if (!base || typeof base !== "object") return base;
  if (coerceString(base.base_id)) return base;
  const name = coerceString(base.name);
  const neighborhood = coerceString(base.neighborhood);
  const seed = `base|${tripId}|${name}|${neighborhood}`;
  return { ...base, base_id: stableId(seed) };
};

const ensureDayId = (day, tripId, idx) => {
  if (!day || typeof day !== "object") return day;
  if (coerceString(day.day_id)) return day;
  const label = coerceString(day.day_label);
  const dayNumber = day.day_number ?? idx + 1;
  const seed = `day|${tripId}|${dayNumber}|${label}`;
  return { ...day, day_id: stableId(seed) };
};

const ensureSlotId = (slot, tripId, dayId, idx) => {
  if (!slot || typeof slot !== "object") return slot;
  if (coerceString(slot.slot_id)) return slot;
  const name = coerceString(slot.name);
  const time = coerceString(slot.time);
  const type = coerceString(slot.slot_type);
  const neighborhood = coerceString(slot.neighborhood);
  const seed = `slot|${tripId}|${dayId}|${idx}|${type}|${time}|${name}|${neighborhood}`;
  return { ...slot, slot_id: stableId(seed) };
};

export const normalizeItinerary = (itinerary, tripId) => {
  if (!itinerary || typeof itinerary !== "object") return itinerary;
  const normalized = { ...itinerary };

  if (normalized.base_accommodation) {
    normalized.base_accommodation = ensureBaseId(normalized.base_accommodation, tripId);
  }

  if (Array.isArray(normalized.days)) {
    normalized.days = normalized.days.map((day, dIdx) => {
      const dayWithId = ensureDayId(day, tripId, dIdx);
      const dayId = coerceString(dayWithId.day_id) || `day_${dIdx + 1}`;

      if (Array.isArray(dayWithId.slots)) {
        const slots = dayWithId.slots.map((slot, sIdx) =>
          ensureSlotId(slot, tripId, dayId, sIdx),
        );
        return { ...dayWithId, slots };
      }
      return dayWithId;
    });
  }

  return normalized;
};

export const ensureWorkingItinerary = (tripDoc) => {
  if (!tripDoc) return false;
  const base = tripDoc.itineraryWorking || tripDoc.itinerary;
  if (!base) return false;

  const normalized = normalizeItinerary(base, tripDoc._id?.toString?.() || "");
  const changed = JSON.stringify(normalized) !== JSON.stringify(base);
  if (changed) {
    tripDoc.itineraryWorking = normalized;
    tripDoc.markModified("itineraryWorking");
  } else if (!tripDoc.itineraryWorking && tripDoc.itinerary) {
    // Ensure we always have a working copy even if no normalization changes.
    tripDoc.itineraryWorking = tripDoc.itinerary;
    tripDoc.markModified("itineraryWorking");
  }
  return changed;
};

