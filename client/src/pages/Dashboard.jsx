import React, { useState, useEffect, useRef } from "react";
import FriendsList from "../components/FriendsList";
import UserSearch from "../components/UserSearch";
import FriendRequests from "../components/FriendRequests";
import CreateTrip from "../components/CreateTrip";
import Trips from "./Trips";
import TripDetails from "./TripDetails";
import DashboardHome from "./DashboardHome";
import { Button } from "../components/ui/button";
import { Map, Users, Plane, Lock, LogOut, User, Pencil, RefreshCw, X, Check } from "lucide-react";
import VoiceChat from "../components/VoiceChat";
import FinalizedTrips from "./FinalizedTrips";
import FinalizedItinerary from "./FinalizedItinerary";
import BookingPage from "./BookingPage";
import { Link } from "react-router-dom";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { logoutUser, updateProfile } from "../api/auth";

function getRandomAvatar(seed) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed || Date.now())}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", email: "", phone: "" });
  const [previewAvatar, setPreviewAvatar] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user"));
      const user = stored?.data?.user || stored?.user || stored;
      if (user) {
        setCurrentUser(user);
        setEditForm({ username: user.username || "", email: user.email || "", phone: user.phone || "" });
        setPreviewAvatar(user.avatar?.url || getRandomAvatar(user.username));
      }
    } catch { /* ignore */ }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch { /* best-effort */ }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleRandomizeAvatar = () => {
    setPreviewAvatar(getRandomAvatar(Date.now()));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({
        username: editForm.username,
        email: editForm.email,
        phone: editForm.phone,
        avatarUrl: previewAvatar,
      });
      const updatedUser = res.data?.data?.user;
      if (updatedUser) {
        setCurrentUser(updatedUser);
        // Persist to localStorage
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        if (stored?.data?.user) {
          stored.data.user = updatedUser;
        } else if (stored?.user) {
          stored.user = updatedUser;
        } else {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
        localStorage.setItem("user", JSON.stringify(stored));
      }
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = currentUser?.avatar?.url || previewAvatar || getRandomAvatar("guest");
  const displayName = currentUser?.username || "User";

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-['Lato'] text-[#2C2C2C]">
      {/* Top Navigation */}
      <header className="bg-white border-b border-[#E5E7EB] shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2E7D32] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Map size={18} />
            </div>
            <h1 className="text-xl font-bold font-['Playfair_Display'] text-[#2C2C2C] tracking-wide">
              Planora
            </h1>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
           
            <NavLink
              to="/dashboard/friends"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? "bg-[#6D4C41]/10 text-[#6D4C41]"
                  : "text-[#6D4C41]/70 hover:bg-[#F5F5F0] hover:text-[#6D4C41]"
                }`
              }
            >
              <Users size={18} />
              <span className="hidden sm:inline">Friends</span>
            </NavLink>
            <NavLink
              to="/dashboard/trips"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                  : "text-[#6D4C41]/70 hover:bg-[#F5F5F0] hover:text-[#2E7D32]"
                }`
              }
            >
              <Plane size={18} />
              <span className="hidden sm:inline">Trips</span>
            </NavLink>
            <NavLink
              to="/dashboard/finalized"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? "bg-[#6D4C41]/10 text-[#6D4C41]"
                  : "text-[#6D4C41]/70 hover:bg-[#F5F5F0] hover:text-[#6D4C41]"
                }`
              }
            >
              <Lock size={18} />
              <span className="hidden sm:inline">Finalized</span>
            </NavLink>

            <div className="h-6 w-[1px] bg-[#E5E7EB] mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <CreateTrip onTripCreated={() => navigate("/dashboard/trips")} />
              <UserSearch />
              <FriendRequests />

              {/* ── Profile Avatar Dropdown ── */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => { setDropdownOpen((v) => !v); setEditing(false); }}
                  className="w-9 h-9 rounded-full border-2 border-[#2E7D32]/30 hover:border-[#2E7D32] transition-colors overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/40"
                  title={displayName}
                >
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full bg-[#F5F5F0]"
                    onError={(e) => { e.target.src = `https://i.pravatar.cc/150?u=${displayName}`; }}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-[#E5E7EB] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-[#2E7D32]/10 to-[#F4A261]/10 px-5 py-4 flex items-center gap-3">
                      <div className="relative group">
                        <img
                          src={editing ? previewAvatar : avatarUrl}
                          alt={displayName}
                          className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover bg-[#F5F5F0]"
                          onError={(e) => { e.target.src = `https://i.pravatar.cc/150?u=${displayName}`; }}
                        />
                        {editing && (
                          <button
                            onClick={handleRandomizeAvatar}
                            className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#F4A261] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#e8944f] transition-colors"
                            title="Randomize avatar"
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#2C2C2C] font-['Playfair_Display'] truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-[#6D4C41]/70 font-['Lato'] truncate">
                          {currentUser?.email || ""}
                        </p>
                      </div>
                      {!editing && (
                        <button
                          onClick={() => {
                            setEditing(true);
                            setEditForm({
                              username: currentUser?.username || "",
                              email: currentUser?.email || "",
                              phone: currentUser?.phone || "",
                            });
                            setPreviewAvatar(avatarUrl);
                          }}
                          className="p-1.5 rounded-lg bg-white/80 text-[#6D4C41] hover:bg-white transition-colors"
                          title="Edit profile"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>

                    {/* Edit Form */}
                    {editing && (
                      <div className="px-5 py-4 space-y-3 border-t border-[#E5E7EB]">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#6D4C41]/60 font-['Lato']">Username</label>
                          <input
                            type="text"
                            value={editForm.username}
                            onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                            className="w-full mt-1 px-3 py-1.5 text-sm font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#6D4C41]/60 font-['Lato']">Email</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                            className="w-full mt-1 px-3 py-1.5 text-sm font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#6D4C41]/60 font-['Lato']">Phone</label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                            className="w-full mt-1 px-3 py-1.5 text-sm font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32]"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="flex-1 bg-[#2E7D32] hover:bg-[#1b4b1e] text-white text-xs font-['Lato'] rounded-lg"
                            size="sm"
                          >
                            <Check size={14} className="mr-1" />
                            {saving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            onClick={() => setEditing(false)}
                            variant="outline"
                            className="flex-1 border-[#E5E7EB] text-[#6D4C41] hover:bg-[#F5F5F0] text-xs font-['Lato'] rounded-lg"
                            size="sm"
                          >
                            <X size={14} className="mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Logout */}
                    <div className="border-t border-[#E5E7EB]">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-5 py-3 text-sm font-medium font-['Lato'] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="friends" element={<FriendsList />} />
          <Route path="trips" element={<Trips />} />
          <Route path="finalized" element={<FinalizedTrips />} />
          <Route path="finalized/:tripId" element={<FinalizedItinerary />} />
          <Route path="trip/:tripId" element={<TripDetails />} />
          <Route path="voice/:tripId" element={<VoiceChat />} />
          <Route path="book/:type/:id" element={<BookingPage />} />
          <Route index element={<DashboardHome />} />
        </Routes>
      </main>
    </div>
  );
}
