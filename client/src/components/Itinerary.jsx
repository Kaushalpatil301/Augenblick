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
  Sparkles 
} from "lucide-react";
import { Badge } from "./ui/badge";

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

export default function Itinerary({ trip }) {
  const itinerary = trip?.itinerary;

  // Convert trip data to timeline activities (original fallback logic)
  const fallbackActivities = useMemo(() => {
    if (!trip || itinerary) return [];
    const items = [];

    // 1. Add AI Suggestions (Picks)
    const agentData = trip.agents || {};
    const categories = [
      { key: "activities", type: "attraction", icon: Camera },
      { key: "accommodation", type: "accommodation", icon: Hotel },
      { key: "dining", type: "dining", icon: Utensils },
      { key: "transport", type: "transport", icon: Plane }
    ];

    categories.forEach(cat => {
      const data = agentData[cat.key]?.data || [];
      data.forEach((item, idx) => {
        items.push({
          id: `ai-${cat.key}-${idx}`,
          date: new Date(trip.startDate), // Default to start date if no date provided
          time: "AI Pick",
          title: item.name || item.hotel_name || item.restaurantName || "Recommended Spot",
          desc: item.insight || item.insider_tip || item.description || item.neighborhood || "",
          type: cat.type,
          icon: cat.icon,
          isAI: true
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
  }, [trip, itinerary]);

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
      case "attraction": return "text-pink-600 bg-pink-100";
      case "accommodation": return "text-indigo-600 bg-indigo-100";
      case "transport": return "text-teal-600 bg-teal-100";
      case "dining": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
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
        <h3 className="text-xl font-bold text-gray-800">AI is cooking your itinerary...</h3>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
          Our agents are busy researching Kodiak's best spots, history, and secret pro-tips. This usually takes about 30-60 seconds.
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
  if (itinerary && itinerary.days) {
    return (
      <div className="space-y-8 p-4 bg-white rounded-xl">
        <div className="border-b pb-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            {itinerary.itinerary_title || "Your Custom Itinerary"}
          </h2>
          <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
            <MapPin size={16} />
            <span>{itinerary.location}</span>
          </div>
        </div>

        {itinerary.days.map((day, dIdx) => (
          <div key={dIdx} className="relative pl-8 border-l-2 border-dashed border-indigo-100 last:border-0 pb-10">
            {/* Day Bubble */}
            <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
              {day.day}
            </div>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800">{day.theme}</h3>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mt-0.5">DAY {day.day}</p>
            </div>

            <div className="space-y-4">
              {day.slots?.map((slot, sIdx) => (
                <div key={sIdx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-indigo-600 flex items-center gap-1.5">
                      <Clock size={14} />
                      {slot.time}
                    </span>
                    {slot.transport && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100 font-medium uppercase tracking-tight">
                        {slot.transport}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-base font-bold text-gray-800 mb-2">{slot.activity}</h4>
                  
                  {slot.pro_tip && (
                    <div className="mt-3 flex gap-3 p-3 bg-white/60 rounded-xl border border-dashed border-amber-200">
                      <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 italic leading-relaxed">
                        <span className="font-bold text-amber-700 not-italic">Pro Tip: </span>
                        {slot.pro_tip}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {day.dining && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {day.dining.lunch && (
                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Coffee size={14} className="text-orange-600" />
                        <span className="text-xs font-bold text-orange-700 uppercase">Lunch</span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{day.dining.lunch}</p>
                    </div>
                  )}
                  {day.dining.dinner && (
                    <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Utensils size={14} className="text-violet-600" />
                        <span className="text-xs font-bold text-violet-700 uppercase">Dinner</span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{day.dining.dinner}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {itinerary.budget_summary && (
          <div className="mt-8 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Budget Summary</p>
              <p className="text-lg font-bold text-green-900">{itinerary.budget_summary}</p>
            </div>
          </div>
        )}

        {/* AI Recommendations Sidebar/Section */}
        <div className="mt-12 space-y-6 pt-12 border-t">
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">Expert Recommendations</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(trip.agents || {}).map(([key, agent]) => {
              if (!agent.data?.length) return null;
              return (
                <div key={key} className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 flex flex-col gap-2">
                  <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-tighter flex items-center gap-2">
                    {key.replace('accommodation', 'Hotels').replace('activities', 'Must Sees')}
                  </h4>
                  {agent.data.slice(0, 2).map((item, i) => (
                    <div key={i} className="text-sm font-bold text-indigo-900">
                      • {item.name || item.hotel_name || item.restaurantName}
                      <p className="text-[10px] font-normal text-indigo-600 leading-tight mt-0.5 line-clamp-2 italic">
                        {item.insight || item.insider_tip || item.description || item.neighborhood}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
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
                            <div className={`p-2 rounded-lg ${getIconColor(act.type)}`}>
                              <IconComp size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800 truncate">{act.title}</h4>
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
                        {act.desc && <p className="text-sm text-gray-500 pl-11">{act.desc}</p>}
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

