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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F5F5F0] relative overflow-hidden font-['Lato'] text-[#2C2C2C]">
      {/* Decorative background element for map-like texture */}
      <div className="absolute top-[10%] left-[-5%] w-[30%] h-[30%] rounded-full border border-[#E5E7EB]/60 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full border border-[#E5E7EB]/60 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-white rounded-[14px] shadow-xl border border-[#E5E7EB]">
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold font-['Playfair_Display'] text-[#2C2C2C] tracking-tight">
                Start your <span className="text-[#2E7D32]">Journey</span>
              </h2>
              <p className="text-[#6D4C41] text-sm">
                Join our travel community today
              </p>
            </div>

            {!showOTP && (
              <div className="space-y-4">
                <input
                  className="w-full bg-[#F5F5F0] border border-[#E5E7EB] text-[#2C2C2C] placeholder-[#6D4C41]/60 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <input
                  className="w-full bg-[#F5F5F0] border border-[#E5E7EB] text-[#2C2C2C] placeholder-[#6D4C41]/60 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  className="w-full bg-[#F5F5F0] border border-[#E5E7EB] text-[#2C2C2C] placeholder-[#6D4C41]/60 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <input
                  type="password"
                  className="w-full bg-[#F5F5F0] border border-[#E5E7EB] text-[#2C2C2C] placeholder-[#6D4C41]/60 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="w-full py-3 rounded-[12px] font-semibold text-white bg-[#2E7D32] hover:bg-[#2E7D32]/90 shadow-sm transition-colors mt-2"
                >
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            )}

            <p className="text-center text-[#6D4C41] text-sm mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-[#F4A261] hover:text-[#F4A261]/80 font-medium ml-1 transition-colors">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
