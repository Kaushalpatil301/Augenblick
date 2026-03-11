import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth.js";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [panCard, setPanCard] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [panFile, setPanFile] = useState(null);
  const [panPreview, setPanPreview] = useState(null);

  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!username || !email || !password || !phone) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        email,
        username,
        password,
        phone,
      });

      toast.success("Account created successfully!");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-white/10">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                Create <span className="text-emerald-400">Account</span>
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Join and start managing group expenses
              </p>
            </div>

            {!showOTP && (
              <div className="space-y-4">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <input
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-black"
                  style={{
                    background: "linear-gradient(90deg,#4ade80,#22c55e)",
                  }}
                >
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            )}

            <p className="text-center text-gray-400 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-emerald-400">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
