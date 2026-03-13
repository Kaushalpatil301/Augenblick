import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Map,
  Plane,
  Compass,
  Sparkles,
  MapPin,
  Plus,
  ArrowRight,
  Route,
  Users,
  Globe,
  Briefcase,
  Activity,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "react-hot-toast";
import CreateTrip from "../components/CreateTrip";
import { generateTripDraft, getUserTrips } from "../api/trips";

const getCurrentLocationDraft = () =>
  new Promise((resolve) => {
    const fallbackMumbai = {
      city: "Mumbai",
      country: "India",
      displayName: "Mumbai, Maharashtra, India",
      lat: 19.076,
      lng: 72.8777,
    };

    if (!navigator.geolocation) {
      resolve(fallbackMumbai);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const addr = data.address || {};
          resolve({
            city:
              addr.city ||
              addr.town ||
              addr.village ||
              addr.county ||
              addr.state ||
              "",
            country: addr.country || "",
            displayName:
              data.display_name ||
              `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
            lat: coords.latitude,
            lng: coords.longitude,
          });
        } catch {
          resolve(fallbackMumbai);
        }
      },
      () => resolve(fallbackMumbai),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  });

export default function DashboardHome() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [createTripOpen, setCreateTripOpen] = useState(false);

  const fetchTrips = async () => {
    try {
      const res = await getUserTrips();
      setTrips(res.data.data.slice(0, 4)); // Get up to 4 upcoming trips
    } catch (error) {
      console.error("Failed to fetch trips", error);
    } finally {
      setLoadingTrips(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleGeneratePlan = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Enter a trip prompt first");
      return;
    }

    setAiLoading(true);
    try {
      const currentLocation = await getCurrentLocationDraft();
      const res = await generateTripDraft(aiPrompt.trim(), currentLocation);
      setAiDraft(res.data.data);
      setCreateTripOpen(true);
      toast.success("Trip draft is ready");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to generate trip draft",
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-12 font-['Lato'] text-[#2C2C2C] text-lg">
      <CreateTrip
        hideTrigger
        open={createTripOpen}
        onOpenChange={setCreateTripOpen}
        initialDraft={aiDraft}
        onTripCreated={fetchTrips}
      />

      {/* 1. Hero Section */}
      <section
        className="relative overflow-hidden rounded-[14px] border border-[#E5E7EB] shadow-sm p-10 md:p-14"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=2000&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#F5F5F0]/90 backdrop-blur-[2px]" />
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[140%] rounded-full border border-[#2E7D32]/20 pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-5xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-5">
            Plan smarter trips together.
          </h2>
          <p className="text-[#6D4C41] text-xl font-['Lato'] mb-10 leading-relaxed">
            Experience collaborative AI travel planning. Build your ultimate
            itinerary, manage your budget, and explore the world with your
            friends seamlessly.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setCreateTripOpen(true)}
              className="bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white font-['Lato'] rounded-xl px-6 py-2"
            >
              Create New Trip
            </Button>
            <Button
              onClick={() => navigate("/dashboard/explore")}
              variant="outline"
              className="border-[#2E7D32] text-[#2E7D32] hover:bg-[#F5F5F0] font-['Lato'] rounded-xl px-6 py-2"
            >
              Explore Destinations
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Quick Start Section */}
      <section>
        <h3 className="text-3xl font-semibold font-['Playfair_Display'] text-[#2C2C2C] mb-8">
          Quick Start
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Create Trip",
              icon: <Plus size={24} />,
              bg: "bg-[#F5F5F0]",
              onClick: () => setCreateTripOpen(true),
            },
            {
              title: "Join Trip",
              icon: <Users size={24} />,
              bg: "bg-[#F5F5F0]",
              onClick: () => navigate("/dashboard/friends"),
            },
            {
              title: "AI Trip Generator",
              icon: <Sparkles size={24} />,
              bg: "bg-[#F5F5F0]",
              onClick: () => {
                document
                  .getElementById("ai-assistant")
                  ?.scrollIntoView({ behavior: "smooth" });
                // If it's already in view, maybe give it a little pulse effect
                const el = document.getElementById("ai-assistant");
                if (el) {
                  el.classList.add(
                    "ring-4",
                    "ring-[#F4A261]",
                    "ring-opacity-50",
                  );
                  setTimeout(
                    () =>
                      el.classList.remove(
                        "ring-4",
                        "ring-[#F4A261]",
                        "ring-opacity-50",
                      ),
                    1000,
                  );
                }
              },
            },
            {
              title: "Explore Destinations",
              icon: <Compass size={24} />,
              bg: "bg-[#F5F5F0]",
              onClick: () => navigate("/dashboard/explore"),
            },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={item.onClick}
              className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div
                className={`w-12 h-12 rounded-full ${item.bg} text-[#2E7D32] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                {item.icon}
              </div>
              <h4 className="font-medium font-['Lato'] text-[#2C2C2C]">
                {item.title}
              </h4>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {/* 3. Upcoming Trips Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-semibold font-['Playfair_Display'] text-[#2C2C2C]">
                Upcoming Trips
              </h3>
              <Link
                to="/dashboard/trips"
                className="text-[#F4A261] hover:text-[#F4A261]/80 font-['Lato'] font-medium flex items-center gap-1 text-base"
              >
                View All <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {loadingTrips ? (
                <div className="col-span-1 md:col-span-2 text-center text-[#6D4C41] py-8">
                  Loading trips...
                </div>
              ) : trips.length > 0 ? (
                trips.map((trip) => (
                  <Link
                    to={`/dashboard/trip/${trip._id}`}
                    key={trip._id}
                    className="block group"
                  >
                    <div
                      className={`bg-white border-2 ${trip.status === "Active" ? "border-[#2E7D32]" : "border-[#E5E7EB] group-hover:border-[#2E7D32]/50"} rounded-[14px] p-6 shadow-sm relative overflow-hidden h-full transition-colors`}
                    >
                      {trip.status === "Active" && (
                        <div className="absolute top-0 right-0 bg-[#2E7D32] text-white text-xs font-bold px-3 py-1 rounded-bl-lg tracking-wide uppercase">
                          Active
                        </div>
                      )}
                      <h4 className="text-2xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-2">
                        {trip.name}
                      </h4>
                      <p className="text-[#6D4C41] text-base flex items-center gap-2 mb-6">
                        <MapPin size={16} />{" "}
                        {new Date(trip.startDate).toLocaleDateString()} -{" "}
                        {new Date(trip.endDate).toLocaleDateString()}
                      </p>

                      <div className="flex items-center justify-between mt-auto border-t border-[#E5E7EB] pt-5">
                        <div className="flex -space-x-3">
                          {trip.members &&
                            trip.members.map((m, i) => (
                              <div
                                key={i}
                                className="w-10 h-10 rounded-full bg-[#E5E7EB] border-2 border-white flex items-center justify-center text-sm font-bold text-[#6D4C41]"
                              >
                                {m.username ? m.username[0].toUpperCase() : "U"}
                              </div>
                            ))}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#6D4C41]">
                            Status:{" "}
                            <span
                              className={`font-semibold ${trip.status === "Planned" || trip.status === "Planning" ? "text-[#F4A261]" : "text-[#2E7D32]"}`}
                            >
                              {trip.status || "Planning"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 text-center py-10 bg-white rounded-[14px] border border-[#E5E7EB]">
                  <p className="text-[#6D4C41] mb-3">No trips planned yet.</p>
                  <Button className="bg-[#2E7D32] text-white rounded-xl">
                    Create your first trip
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* 5. Recommended Destinations */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-semibold font-['Playfair_Display'] text-[#2C2C2C]">
                Recommended Destinations
              </h3>
              <Link
                to="/dashboard/explore"
                className="text-[#F4A261] hover:text-[#F4A261]/80 font-['Lato'] font-medium flex items-center gap-1 text-base"
              >
                Explore More <ArrowRight size={18} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  name: "Kyoto, Japan",
                  desc: "Historic temples and traditional gardens.",
                  image:
                    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop",
                },
                {
                  name: "Santorini, Greece",
                  desc: "Whitewashed houses and stunning sunsets.",
                  image:
                    "https://images.unsplash.com/photo-1570077188670-e3a8d69ac542?q=80&w=600&auto=format&fit=crop",
                },
                {
                  name: "Bali, Indonesia",
                  desc: "Iconic rice paddies and volcanic mountains.",
                  image:
                    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=600&auto=format&fit=crop",
                },
                {
                  name: "Machu Picchu, Peru",
                  desc: "An Incan citadel set high in the Andes Mountains.",
                  image:
                    "https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=600&auto=format&fit=crop",
                },
              ].map((dest, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden shadow-sm group hover:shadow-md transition-all group-hover:border-[#2E7D32]/50 cursor-pointer"
                  onClick={() => navigate("/dashboard/explore")}
                >
                  <div className="h-32 bg-[#F5F5F0] overflow-hidden relative">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-1">
                      {dest.name}
                    </h4>
                    <p className="text-[#6D4C41] text-sm mb-4 line-clamp-1">
                      {dest.desc}
                    </p>
                    <button className="text-sm font-medium text-[#F4A261] group-hover:text-[#F4A261]/80 transition-colors">
                      + View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Route Inspiration Section */}
          <section>
            <h3 className="text-3xl font-semibold font-['Playfair_Display'] text-[#2C2C2C] mb-8">
              Route Inspiration
            </h3>
            <div className="space-y-3">
              {[
                { route: "Mumbai → Goa", icon: <Route size={16} /> },
                { route: "Delhi → Manali", icon: <Route size={16} /> },
                { route: "Paris → Rome", icon: <Route size={16} /> },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 flex items-center justify-between shadow-sm hover:border-[#F4A261] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-[#F5F5F0] p-2 rounded-full text-[#6D4C41]">
                      {item.icon}
                    </div>
                    <span className="font-medium font-['Lato'] text-[#2C2C2C]">
                      {item.route}
                    </span>
                  </div>
                  <ArrowRight size={16} className="text-[#E5E7EB]" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* 4. AI Travel Assistant Panel */}
          <section
            id="ai-assistant"
            className="scroll-mt-24 transition-all duration-500 rounded-[14px]"
          >
            <div className="bg-[#2E7D32] rounded-[14px] p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full border border-white/20 pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-[#F4A261]" />
                <h3 className="text-xl font-semibold font-['Playfair_Display']">
                  AI Travel Assistant
                </h3>
              </div>
              <p className="text-white/80 text-sm mb-4 font-['Lato']">
                Describe your dream trip, and let our AI craft the perfect
                itinerary.
              </p>
              <textarea
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#F4A261] resize-none h-24 mb-4"
                placeholder="e.g., Plan a 7-day road trip from Mumbai to Goa focusing on beaches and local cuisine."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              ></textarea>
              <Button
                className="w-full bg-[#F4A261] hover:bg-[#F4A261]/90 text-white font-['Lato'] rounded-xl"
                onClick={handleGeneratePlan}
                disabled={aiLoading}
              >
                {aiLoading ? "Generating..." : "Generate Plan"}
              </Button>
            </div>
          </section>

          {/* 7. Travel Statistics */}
          <section>
            <h3 className="text-2xl font-semibold font-['Playfair_Display'] text-[#2C2C2C] mb-6">
              Your Travel Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#E5E7EB] p-4 rounded-[12px] shadow-sm flex flex-col items-center text-center">
                <Briefcase size={20} className="text-[#2E7D32] mb-2" />
                <span className="text-2xl font-bold text-[#2C2C2C]">4</span>
                <span className="text-xs text-[#6D4C41]">Trips Planned</span>
              </div>
              <div className="bg-white border border-[#E5E7EB] p-4 rounded-[12px] shadow-sm flex flex-col items-center text-center">
                <Globe size={20} className="text-[#F4A261] mb-2" />
                <span className="text-2xl font-bold text-[#2C2C2C]">12</span>
                <span className="text-xs text-[#6D4C41]">Cities Visited</span>
              </div>
            </div>
          </section>

          {/* 8. Collaboration Activity Feed */}
          <section>
            <h3 className="text-2xl font-semibold font-['Playfair_Display'] text-[#2C2C2C] mb-6">
              Recent Activity
            </h3>
            <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-sm space-y-4">
              {[
                {
                  name: "Alex",
                  action: "added a destination",
                  time: "2h ago",
                  color: "bg-[#2E7D32]",
                },
                {
                  name: "Sarah",
                  action: "booked a hotel",
                  time: "5h ago",
                  color: "bg-[#F4A261]",
                },
                {
                  name: "John",
                  action: "voted for an attraction",
                  time: "1d ago",
                  color: "bg-[#6D4C41]",
                },
              ].map((act, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div
                    className={`w-8 h-8 rounded-full ${act.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                  >
                    {act.name[0]}
                  </div>
                  <div>
                    <p className="text-sm text-[#2C2C2C] font-['Lato']">
                      <span className="font-semibold">{act.name}</span>{" "}
                      {act.action}
                    </p>
                    <span className="text-xs text-[#6D4C41]">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
