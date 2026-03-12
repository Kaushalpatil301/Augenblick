import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import  Dashboard  from "./pages/Dashboard";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";



function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
