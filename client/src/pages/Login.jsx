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
                Welcome Back <span className="text-emerald-400">👋</span>
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Login to manage your shared expenses
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
              />

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-black"
                style={{ background: "linear-gradient(90deg,#4ade80,#22c55e)" }}
              >
                {loading ? "Logging In..." : "Login"}
              </button>
            </div>

            <p className="text-center text-gray-400 text-sm">
              Don’t have an account?{" "}
              <Link
                to="/signup"
                className="text-emerald-400 hover:text-emerald-300"
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
