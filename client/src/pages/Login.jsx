import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      localStorage.setItem("user", JSON.stringify(res.data));

      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F5F5F0] relative overflow-hidden font-['Lato'] text-[#2C2C2C]">
      {/* Decorative background element for map-like texture */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full border border-[#E5E7EB]/50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full border border-[#E5E7EB]/50 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-white rounded-[14px] shadow-xl border border-[#E5E7EB]">
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold font-['Playfair_Display'] text-[#2C2C2C] tracking-tight">
                Welcome Back <span className="text-[#6D4C41]">🧭</span>
              </h2>
              <p className="text-[#6D4C41] text-sm">
                Continue your travel adventure
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-[#E5E7EB] text-[#2C2C2C] placeholder-[#6D4C41]/60 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-[#E5E7EB] text-[#2C2C2C] placeholder-[#6D4C41]/60 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-colors"
              />

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#2E7D32] hover:bg-[#2E7D32]/90 shadow-sm transition-colors mt-2"
              >
                {loading ? "Logging In..." : "Login"}
              </button>
            </div>

            <p className="text-center text-[#6D4C41] text-sm mt-4">
              Don’t have an account?{" "}
              <Link
                to="/signup"
                className="text-[#F4A261] hover:text-[#F4A261]/80 font-medium ml-1 transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
