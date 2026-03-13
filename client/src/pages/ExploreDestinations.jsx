import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Clock, Compass } from "lucide-react";
import { Button } from "../components/ui/button";

const DESTINATIONS = [
  {
    id: 1,
    name: "Kyoto, Japan",
    country: "Japan",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop",
    description:
      "Experience the magic of traditional temples, beautiful gardens, and geisha districts.",
    rating: 4.8,
    days: "5-7 Days",
    tags: ["Culture", "Nature", "Food"],
  },
  {
    id: 2,
    name: "Santorini, Greece",
    country: "Greece",
    image:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac542?q=80&w=800&auto=format&fit=crop",
    description:
      "Famous for its whitewashed, cubiform houses scattered above an underwater caldera.",
    rating: 4.9,
    days: "4-6 Days",
    tags: ["Beach", "Romance", "Views"],
  },
  {
    id: 3,
    name: "Machu Picchu, Peru",
    country: "Peru",
    image:
      "https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=800&auto=format&fit=crop",
    description:
      "An Incan citadel set high in the Andes Mountains showcasing incredible architecture.",
    rating: 4.9,
    days: "3-5 Days",
    tags: ["Adventure", "History", "Mountain"],
  },
  {
    id: 4,
    name: "Amalfi Coast, Italy",
    country: "Italy",
    image:
      "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop",
    description:
      "A 50-kilometer stretch of coastline featuring sheer cliffs and a rugged shoreline dotted with small beaches.",
    rating: 4.7,
    days: "5-8 Days",
    tags: ["Relaxation", "Food", "Scenic"],
  },
  {
    id: 5,
    name: "Bali, Indonesia",
    country: "Indonesia",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop",
    description:
      "Known for its forested volcanic mountains, iconic rice paddies, beaches and coral reefs.",
    rating: 4.6,
    days: "7-10 Days",
    tags: ["Tropical", "Culture", "Relaxation"],
  },
  {
    id: 6,
    name: "Banff National Park, Canada",
    country: "Canada",
    image:
      "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=800&auto=format&fit=crop",
    description:
      "Canada's oldest national park, encompassing rocky mountains peaks, turquoise glacial lakes, and dense forests.",
    rating: 4.8,
    days: "6-8 Days",
    tags: ["Nature", "Wildlife", "Hiking"],
  },
];

export default function ExploreDestinations() {
  return (
    <div className="font-['Lato'] text-[#2C2C2C]">
      {/* Header */}
      <div className="mb-10 text-center space-y-4 pt-4">
        <h1 className="text-4xl md:text-5xl font-bold font-['Playfair_Display']">
          Explore Your Next Horizon
        </h1>
        <p className="text-[#6D4C41] text-lg max-w-2xl mx-auto">
          Discover incredible places around the world curated for you. Add them
          to your trips or draw inspiration for your AI generated itineraries.
        </p>
      </div>

      {/* Grid of destinations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {DESTINATIONS.map((dest) => (
          <div
            key={dest.id}
            className="bg-white border border-[#E5E7EB] rounded-[14px] overflow-hidden shadow-sm hover:shadow-md transition-all group group-hover:border-[#2E7D32]/50"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={dest.image}
                alt={dest.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-bold text-[#2C2C2C]">
                <Star size={14} className="text-[#F4A261] fill-[#F4A261]" />{" "}
                {dest.rating}
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center text-xs font-bold uppercase tracking-wider text-[#6D4C41] mb-2 gap-1">
                <MapPin size={14} className="text-[#2E7D32]" /> {dest.country}
              </div>
              <h3 className="text-2xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-3">
                {dest.name}
              </h3>
              <p className="text-[#6D4C41] text-sm leading-relaxed mb-5 line-clamp-2">
                {dest.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {dest.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-[#F5F5F0] text-[#6D4C41] text-xs px-2.5 py-1 rounded-md font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-auto border-t border-[#E5E7EB] pt-4">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#2C2C2C]">
                  <Clock size={16} className="text-[#6D4C41]" /> {dest.days}
                </span>
                <Button
                  variant="outline"
                  className="border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white rounded-xl h-9 text-xs transition-colors"
                >
                  Add to Trip
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-[#2E7D32]/10 rounded-[14px] p-8 text-center border border-[#2E7D32]/20">
        <Compass size={40} className="text-[#2E7D32] mx-auto mb-4" />
        <h3 className="text-2xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-2">
          Can't decide where to go?
        </h3>
        <p className="text-[#6D4C41] mb-6 max-w-md mx-auto">
          Let our smart AI travel assistant build the perfect itinerary for you
          from scratch.
        </p>
        <Link to="/dashboard">
          <Button className="bg-[#2E7D32] text-white hover:bg-[#1b4b1e] rounded-xl px-8">
            Tell AI your interests
          </Button>
        </Link>
      </div>
    </div>
  );
}
