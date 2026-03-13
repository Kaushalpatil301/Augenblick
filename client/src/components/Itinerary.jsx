import React, { useState, useMemo } from "react";
import {
  Camera,
  Hotel,
  Utensils,
  Plane,
  MapPin,
  Clock,
  Lightbulb,
  Coffee,
  ChevronRight,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Edit3,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "react-hot-toast";
import {
  createItineraryChange,
  decideItineraryChange,
  finalizeItinerary,
  voteItineraryItem,
} from "../api/trips";

// Helper to format date to readable day label
const formatDayLabel = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

// Helper to format time from date
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Itinerary({ trip, currentUserId, onTripUpdated }) {
  const itinerary = trip?.itinerary;
  const hasRichItinerary = Array.isArray(itinerary?.days);
  const isFinal = Boolean(trip?.itineraryIsFinal);
  const isCreator = Boolean(
    currentUserId && trip?.createdBy?._id === currentUserId,
  );
  const votes = trip?.itineraryVotes || {};
  const changeRequests = Array.isArray(trip?.itineraryChangeRequests)
    ? trip.itineraryChangeRequests
    : [];

  const [savingVoteKey, setSavingVoteKey] = useState(null);
  const [proposingSlot, setProposingSlot] = useState(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    name: "",
    time: "",
    duration: "",
    neighborhood: "",
    insight: "",
    cost: "",
  });
  const [finalizing, setFinalizing] = useState(false);
  const [decidingId, setDecidingId] = useState(null);

  const tripTitle = useMemo(() => {
    const location = itinerary?.location?.trim();
    if (!location) return "Your Custom Itinerary";

    const daysCount = Array.isArray(itinerary?.days)
      ? itinerary.days.length
      : undefined;
    const isShort = typeof daysCount === "number" ? daysCount <= 3 : false;
    return isShort ? `${location} Getaway` : `Adventure in ${location}`;
  }, [itinerary?.location, itinerary?.days]);

  const heroVitals = useMemo(() => {
    const durationText = itinerary?.duration?.trim();
    const nightsCount =
      typeof itinerary?.nights_count === "number"
        ? itinerary.nights_count
        : undefined;

    const daysFromArray = Array.isArray(itinerary?.days)
      ? itinerary.days.length
      : undefined;
    const daysLabel =
      typeof daysFromArray === "number"
        ? `${daysFromArray} day${daysFromArray === 1 ? "" : "s"}`
        : durationText || undefined;

    const nightsLabel =
      typeof nightsCount === "number"
        ? `${nightsCount} night${nightsCount === 1 ? "" : "s"}`
        : undefined;

    const currency = itinerary?.currency?.trim() || "USD";

    return { daysLabel, nightsLabel, currency };
  }, [
    itinerary?.duration,
    itinerary?.nights_count,
    itinerary?.days,
    itinerary?.currency,
  ]);

  const baseNeighborhoodContext = useMemo(() => {
    const base = itinerary?.base_accommodation;
    if (!base) return "";
    return (
      base.neighborhood_context ||
      base.why_here ||
      base.reason ||
      base.insight ||
      base.description ||
      ""
    );
  }, [itinerary?.base_accommodation]);

  const getVoteMeta = (entityType, entityId) => {
    const key = `${entityType}:${entityId}`;
    const entityVotes = votes?.[key] || {};
    const score = Object.values(entityVotes).reduce(
      (sum, v) => sum + Number(v || 0),
      0,
    );
    const myVote = currentUserId
      ? Number(entityVotes?.[currentUserId] || 0)
      : 0;
    return { key, score, myVote };
  };

  const handleVote = async (entityType, entityId, value) => {
    if (!trip?._id) return;
    if (!currentUserId) {
      toast.error("Please log in again to vote.");
      return;
    }
    if (isFinal) {
      toast.error("This itinerary is finalized.");
      return;
    }

    const { key, myVote } = getVoteMeta(entityType, entityId);
    const nextValue = myVote === value ? 0 : value;
    setSavingVoteKey(key);
    try {
      await voteItineraryItem(trip._id, {
        entityType,
        entityId,
        value: nextValue,
      });
      await onTripUpdated?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save vote");
    } finally {
      setSavingVoteKey(null);
    }
  };

  const openSlotProposal = (slot) => {
    setProposingSlot(slot);
    setProposalForm({
      name: slot?.name || "",
      time: slot?.time || "",
      duration: slot?.duration || "",
      neighborhood: slot?.neighborhood || "",
      insight: slot?.insight || "",
      cost: slot?.cost != null ? String(slot.cost) : "",
    });
    setProposalOpen(true);
  };

  const submitSlotProposal = async () => {
    if (!trip?._id || !proposingSlot?.slot_id) return;
    if (isFinal) {
      toast.error("This itinerary is finalized.");
      return;
    }

    const patch = {};
    ["name", "time", "duration", "neighborhood", "insight"].forEach((k) => {
      if (proposalForm[k] !== undefined) patch[k] = proposalForm[k];
    });
    const costNum = Number(proposalForm.cost);
    if (proposalForm.cost !== "" && Number.isFinite(costNum))
      patch.cost = costNum;

    try {
      await createItineraryChange(trip._id, {
        entityType: "slot",
        entityId: proposingSlot.slot_id,
        patch,
        message: "Suggested edit",
      });
      toast.success("Suggestion sent");
      setProposalOpen(false);
      setProposingSlot(null);
      await onTripUpdated?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send suggestion");
    }
  };

  const decideChange = async (changeId, accept) => {
    if (!trip?._id) return;
    setDecidingId(changeId);
    try {
      await decideItineraryChange(trip._id, changeId, accept);
      await onTripUpdated?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to decide change");
    } finally {
      setDecidingId(null);
    }
  };

  const handleFinalize = async () => {
    if (!trip?._id) return;
    if (!isCreator) {
      toast.error("Only the trip creator can finalize.");
      return;
    }
    if (isFinal) return;
    if (!window.confirm("Finalize this itinerary? It will become read-only."))
      return;

    setFinalizing(true);
    try {
      await finalizeItinerary(trip._id);
      toast.success("Itinerary finalized");
      await onTripUpdated?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to finalize itinerary",
      );
    } finally {
      setFinalizing(false);
    }
  };

  // Convert trip data to timeline activities (original fallback logic)
  const fallbackActivities = useMemo(() => {
    if (!trip || hasRichItinerary) return [];
    const items = [];

    // 1. Add AI Suggestions (Picks)
    const agentData = trip.agents || {};
    const categories = [
      { key: "activities", type: "attraction", icon: Camera },
      { key: "accommodation", type: "accommodation", icon: Hotel },
      { key: "dining", type: "dining", icon: Utensils },
      { key: "transport", type: "transport", icon: Plane },
    ];

    categories.forEach((cat) => {
      const data = agentData[cat.key]?.data || [];
      data.forEach((item, idx) => {
        items.push({
          id: `ai-${cat.key}-${idx}`,
          date: new Date(trip.startDate), // Default to start date if no date provided
          time: "AI Pick",
          title:
            item.name ||
            item.hotel_name ||
            item.restaurantName ||
            "Recommended Spot",
          desc:
            item.insight ||
            item.insider_tip ||
            item.description ||
            item.neighborhood ||
            "",
          type: cat.type,
          icon: cat.icon,
          isAI: true,
        });
      });
    });

    // 2. Add User Attractions
    trip.attractions?.forEach((attr, idx) => {
      if (attr.date) {
        items.push({
          id: `attraction-${idx}`,
          date: new Date(attr.date),
          time: formatTime(attr.date),
          title: attr.name || "Attraction",
          desc: attr.description || attr.location || "",
          type: "attraction",
          icon: Camera,
        });
      }
    });

    // 3. Add User Accommodations (check-in/out)
    trip.accommodations?.forEach((acc, idx) => {
      if (acc.checkIn) {
        items.push({
          id: `accommodation-in-${idx}`,
          date: new Date(acc.checkIn),
          time: formatTime(acc.checkIn),
          title: `Check-in: ${acc.name || "Hotel"}`,
          desc: acc.address || "",
          type: "accommodation",
          icon: Hotel,
        });
      }
      if (acc.checkOut) {
        items.push({
          id: `accommodation-out-${idx}`,
          date: new Date(acc.checkOut),
          time: formatTime(acc.checkOut),
          title: `Check-out: ${acc.name || "Hotel"}`,
          desc: acc.address || "",
          type: "accommodation",
          icon: Hotel,
        });
      }
    });

    // 4. Add User Transport
    trip.transport?.forEach((trans, idx) => {
      if (trans.departureTime) {
        items.push({
          id: `transport-${idx}`,
          date: new Date(trans.departureTime),
          time: formatTime(trans.departureTime),
          title: `${trans.type || "Transport"}: ${trans.details || ""}`,
          desc: trans.arrivalTime
            ? `Arrives: ${formatTime(trans.arrivalTime)}`
            : "",
          type: "transport",
          icon: Plane,
        });
      }
    });

    // 5. Add User Dining
    trip.dining?.forEach((dine, idx) => {
      if (dine.dateTime) {
        items.push({
          id: `dining-${idx}`,
          date: new Date(dine.dateTime),
          time: formatTime(dine.dateTime),
          title: dine.restaurantName || "Dining",
          desc: dine.cuisine || "",
          type: "dining",
          icon: Utensils,
        });
      }
    });

    // Sort by date/time, but keep "AI Picks" together at top if on same date
    return items.sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
      if (a.isAI && !b.isAI) return -1;
      if (!a.isAI && b.isAI) return 1;
      return 0;
    });
  }, [trip, hasRichItinerary]);

  // Group activities by day for fallback
  const groupedFallbackActivities = useMemo(() => {
    return fallbackActivities.reduce((acc, curr) => {
      const dayLabel = formatDayLabel(curr.date);
      if (!acc[dayLabel]) acc[dayLabel] = [];
      acc[dayLabel].push(curr);
      return acc;
    }, {});
  }, [fallbackActivities]);

  // Icon colors based on type
  const getIconColor = (type) => {
    switch (type) {
      case "attraction":
        return "text-pink-600 bg-pink-100";
      case "accommodation":
        return "text-indigo-600 bg-indigo-100";
      case "transport":
        return "text-teal-600 bg-teal-100";
      case "dining":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (!trip) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
        <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-800">No Trip Selected</h3>
        <p className="text-sm text-gray-500 mt-2">
          We couldn't find the details for this trip. Try refreshing the page.
        </p>
      </div>
    );
  }

  // ── Render Loading State (AI is cooking) ────────────────────────────────
  if (trip.itineraryStatus === "pending") {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-indigo-200 animate-pulse">
        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6 relative">
          <Sparkles size={32} className="text-indigo-500 animate-spin-slow" />
          <div className="absolute inset-0 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">
          AI is cooking your itinerary...
        </h3>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
          Our agents are busy researching Kodiak's best spots, history, and
          secret pro-tips. This usually takes about 30-60 seconds.
        </p>
        <div className="mt-8 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
        </div>
      </div>
    );
  }

  // ── Render Rich Itinerary (n8n Payload) ──────────────────────────────────
  if (hasRichItinerary) {
    return (
      <div className="space-y-8 p-2 sm:p-4 bg-[#F5F5F0] rounded-xl font-['Lato']">
        <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Suggest a change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={proposalForm.name}
                  onChange={(e) =>
                    setProposalForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    value={proposalForm.time}
                    onChange={(e) =>
                      setProposalForm((p) => ({ ...p, time: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={proposalForm.duration}
                    onChange={(e) =>
                      setProposalForm((p) => ({
                        ...p,
                        duration: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Est. cost</Label>
                  <Input
                    value={proposalForm.cost}
                    onChange={(e) =>
                      setProposalForm((p) => ({ ...p, cost: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Neighborhood</Label>
                <Input
                  value={proposalForm.neighborhood}
                  onChange={(e) =>
                    setProposalForm((p) => ({
                      ...p,
                      neighborhood: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Why (insight)</Label>
                <Input
                  value={proposalForm.insight}
                  onChange={(e) =>
                    setProposalForm((p) => ({ ...p, insight: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setProposalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitSlotProposal}
                  className="bg-[#2E7D32] hover:bg-[#256628] text-white"
                >
                  Send suggestion
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="border-b border-[#E5E7EB] pb-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold text-[#2C2C2C] font-['Playfair_Display']">
                {tripTitle}
              </h2>
              {isFinal && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#6D4C41] bg-white px-3 py-1.5 rounded-full border border-[#E5E7EB]">
                  <Lock size={14} className="text-[#6D4C41]" /> Finalized
                  itinerary
                </div>
              )}
            </div>

            {isCreator && !isFinal && (
              <Button
                onClick={handleFinalize}
                disabled={finalizing}
                className="bg-[#2E7D32] hover:bg-[#256628] text-white"
              >
                {finalizing ? "Finalizing..." : "Finalize itinerary"}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-[#6D4C41] text-sm font-medium bg-white px-3 py-1.5 rounded-full border border-[#E5E7EB] shadow-sm">
              <MapPin size={16} className="text-[#2E7D32]" />
              <span>
                {heroVitals.daysLabel}
                {heroVitals.nightsLabel ? ` • ${heroVitals.nightsLabel}` : ""}
                {" • "}
                {heroVitals.currency}
              </span>
            </div>
            {itinerary.estimated_total_cost > 0 && (
              <div className="flex items-center gap-1.5 text-[#2E7D32] text-sm font-bold bg-[#2E7D32]/10 px-3 py-1.5 rounded-full border border-[#2E7D32]/20 shadow-sm">
                Total estimated spend: {heroVitals.currency}{" "}
                {itinerary.estimated_total_cost}
              </div>
            )}
          </div>
        </div>

        {isCreator &&
          !isFinal &&
          changeRequests.filter((c) => c.status === "open").length > 0 && (
            <div className="p-5 bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-bold text-[#2C2C2C] font-['Playfair_Display']">
                  Pending suggestions
                </h3>
                <Badge className="bg-[#F4A261]/10 text-[#6D4C41] border-[#F4A261]/20">
                  {changeRequests.filter((c) => c.status === "open").length}{" "}
                  open
                </Badge>
              </div>
              <div className="space-y-3">
                {changeRequests
                  .filter((c) => c.status === "open")
                  .slice(0, 10)
                  .map((c) => (
                    <div
                      key={c._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#E5E7EB] bg-[#F5F5F0]/60"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#6D4C41] uppercase tracking-wide">
                          {c.entityType} • {c.entityId}
                        </div>
                        <div className="text-sm text-[#4b5563] mt-1 truncate">
                          {c.message || "Suggested edit"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          disabled={decidingId === c._id}
                          onClick={() => decideChange(c._id, false)}
                        >
                          Reject
                        </Button>
                        <Button
                          disabled={decidingId === c._id}
                          onClick={() => decideChange(c._id, true)}
                          className="bg-[#2E7D32] hover:bg-[#256628] text-white"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {itinerary.base_accommodation && (
          <div className="mb-8 p-6 bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col justify-center flex-1">
              <div className="flex items-center gap-2 mb-2 text-[#F4A261] font-bold text-xs tracking-wider uppercase">
                <Hotel size={16} /> Home Base
              </div>
              <h3 className="text-2xl font-bold text-[#2C2C2C] font-['Playfair_Display'] mb-2">
                {itinerary.base_accommodation.name}
              </h3>
              {itinerary.base_accommodation.neighborhood && (
                <p className="text-sm text-[#6D4C41] flex items-center gap-1.5 mb-4">
                  <MapPin size={14} />{" "}
                  {itinerary.base_accommodation.neighborhood}
                </p>
              )}
              {baseNeighborhoodContext && (
                <p className="text-sm text-[#4b5563] leading-relaxed mb-4">
                  {baseNeighborhoodContext}
                </p>
              )}

              {(itinerary.base_accommodation.check_in_time ||
                itinerary.base_accommodation.check_out_time) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {itinerary.base_accommodation.check_in_time && (
                    <span className="text-xs font-bold text-[#6D4C41] bg-[#6D4C41]/5 px-2.5 py-1 rounded-md border border-[#6D4C41]/10 flex items-center gap-1.5">
                      <Clock size={12} /> Check-in:{" "}
                      {itinerary.base_accommodation.check_in_time}
                    </span>
                  )}
                  {itinerary.base_accommodation.check_out_time && (
                    <span className="text-xs font-bold text-[#6D4C41] bg-[#6D4C41]/5 px-2.5 py-1 rounded-md border border-[#6D4C41]/10 flex items-center gap-1.5">
                      <Clock size={12} /> Check-out:{" "}
                      {itinerary.base_accommodation.check_out_time}
                    </span>
                  )}
                </div>
              )}
              {itinerary.base_accommodation.cost_per_night > 0 && (
                <p className="text-sm font-bold text-[#2E7D32] bg-[#2E7D32]/10 w-fit px-3 py-1 rounded-md">
                  {heroVitals.currency}{" "}
                  {itinerary.base_accommodation.cost_per_night} / night
                </p>
              )}
            </div>
          </div>
        )}

        {itinerary.days.map((day, dIdx) => (
          <div
            key={dIdx}
            className="relative pl-8 border-l-2 border-dashed border-[#2E7D32]/30 last:border-0 pb-12"
          >
            {/* Day Bubble */}
            <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#2E7D32] flex items-center justify-center text-white font-bold shadow-md">
              {day.day_number}
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-[#2C2C2C] font-['Playfair_Display'] leading-tight">
                {day.day_label}
              </h3>
              {day.neighborhood_focus && (
                <p className="text-sm font-semibold text-[#6D4C41] mt-1.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#F4A261]" /> Focus:{" "}
                  {day.neighborhood_focus}
                </p>
              )}
            </div>

            <div className="space-y-5">
              {day.slots?.map((slot, sIdx) => {
                let SlotIcon = Clock;
                let bgTypeClass =
                  "bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/20";
                let typeLabel = slot.slot_type || "slot";

                if (slot.slot_type === "dining") {
                  SlotIcon = Utensils;
                  bgTypeClass =
                    "bg-[#F4A261]/10 text-[#E67E22] border-[#F4A261]/20";
                  typeLabel = "Dining";
                } else if (slot.slot_type === "activity") {
                  SlotIcon = Camera;
                  bgTypeClass = "bg-blue-50 text-blue-600 border-blue-200";
                  typeLabel = "Activity";
                } else if (slot.slot_type === "transport") {
                  SlotIcon = Plane;
                  bgTypeClass = "bg-teal-50 text-teal-600 border-teal-200";
                  typeLabel = "Transport";
                } else if (
                  slot.slot_type === "check-in" ||
                  slot.slot_type === "check-out"
                ) {
                  SlotIcon = Hotel;
                  bgTypeClass =
                    "bg-purple-50 text-purple-600 border-purple-200";
                  typeLabel =
                    slot.slot_type === "check-in" ? "Check-in" : "Check-out";
                }

                const slotId =
                  slot?.slot_id || `${day.day_number || dIdx + 1}-${sIdx}`;
                const voteMeta = getVoteMeta("slot", slotId);

                return (
                  <div
                    key={sIdx}
                    className="bg-white rounded-[14px] overflow-hidden border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row group"
                  >
                    <div className="p-5 flex-1 flex flex-col justify-center">
                      <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                        <span className="text-sm font-bold text-[#2E7D32] flex items-center gap-1.5">
                          <SlotIcon size={14} />
                          {slot.time}{" "}
                          {slot.duration ? (
                            <span className="text-[#6D4C41] font-medium text-xs ml-1">
                              • {slot.duration}
                            </span>
                          ) : (
                            ""
                          )}
                        </span>
                        {slot.slot_type && (
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-md border font-bold uppercase tracking-wider ${bgTypeClass}`}
                          >
                            {typeLabel}
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-bold text-[#2C2C2C] mb-1.5 font-['Playfair_Display'] leading-tight">
                        {slot.name}
                      </h4>
                      {slot.neighborhood && (
                        <p className="text-xs font-semibold text-gray-500 mb-2.5 flex items-center gap-1.5">
                          <MapPin size={12} className="text-[#6D4C41]" />{" "}
                          {slot.neighborhood}
                        </p>
                      )}

                      {slot.insight && (
                        <p className="text-sm text-[#4b5563] leading-relaxed flex-1">
                          {slot.insight}
                        </p>
                      )}

                      {!isFinal && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingVoteKey === voteMeta.key}
                              onClick={() => handleVote("slot", slotId, 1)}
                              className={
                                voteMeta.myVote === 1
                                  ? "border-[#2E7D32] text-[#2E7D32]"
                                  : ""
                              }
                            >
                              <ThumbsUp size={14} /> Upvote
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingVoteKey === voteMeta.key}
                              onClick={() => handleVote("slot", slotId, -1)}
                              className={
                                voteMeta.myVote === -1
                                  ? "border-[#6D4C41] text-[#6D4C41]"
                                  : ""
                              }
                            >
                              <ThumbsDown size={14} /> Downvote
                            </Button>
                            <span className="text-xs font-bold text-[#6D4C41] bg-[#6D4C41]/5 px-2 py-1 rounded-md border border-[#6D4C41]/10">
                              Score: {voteMeta.score}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openSlotProposal({ ...slot, slot_id: slotId })
                            }
                          >
                            <Edit3 size={14} /> Suggest change
                          </Button>
                        </div>
                      )}

                      {slot.cost > 0 && (
                        <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center">
                          <span className="text-xs font-bold text-[#2E7D32] bg-[#2E7D32]/5 px-2 py-1 rounded border border-[#2E7D32]/10">
                            Est. Cost: {heroVitals.currency}{" "}
                            {slot.cost.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Render Fallback (Automatic Timeline) ────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 p-4">
      {Object.keys(groupedFallbackActivities).length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No scheduled activities yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add attractions, hotels, or transport to build your timeline.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {Object.entries(groupedFallbackActivities).map(([day, acts]) => (
            <div key={day} className="mb-10 last:mb-0">
              <h3 className="text-lg font-bold text-gray-800 mb-5 inline-block bg-gray-50 px-3.5 py-1.5 rounded-full shadow-sm border border-gray-100">
                {day}
              </h3>
              <div className="ml-4 border-l-2 border-indigo-100 space-y-6 pl-6 pt-1">
                {acts.map((act) => {
                  const IconComp = act.icon;
                  return (
                    <div key={act.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-[14px] h-[14px] rounded-full bg-indigo-500 border-[3px] border-white shadow-sm" />
                      <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl hover:shadow-md hover:bg-white transition-all">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${getIconColor(act.type)}`}
                            >
                              <IconComp size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800 truncate">
                                  {act.title}
                                </h4>
                                {act.isAI && (
                                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[8px] h-4 flex items-center gap-0.5 px-1 font-bold">
                                    <Sparkles size={6} /> AI PICK
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                            {act.time}
                          </span>
                        </div>
                        {act.desc && (
                          <p className="text-sm text-gray-500 pl-11">
                            {act.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
