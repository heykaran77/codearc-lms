import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Lock, BookOpen, GraduationCap } from "lucide-react";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "mentor">("student");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
      });
      // Use the response data structure which mimics login response or handles the "message" if mentor
      if (res.data.token) {
        login(res.data);
        navigate("/dashboard");
      } else {
        // Mentor account might not return token immediately if approval is needed,
        // but based on backend code it returns token with a message.
        // If approval logic is strict, we might just redirect to login with a message.
        // For now, let's assume it logs in or we just navigate.
        if (
          role === "mentor" &&
          res.data.message.includes("strictly needs admin approval")
        ) {
          navigate("/login");
          // Ideally show a success message on login page, but keeping simple.
          alert(res.data.message);
        } else {
          login(res.data);
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="CodeArc Logo"
            className="h-36 w-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-500 text-sm">Join the CodeArc community</p>
        </div>
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
                role === "student"
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              <GraduationCap size={20} />
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole("mentor")}
              className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
                role === "mentor"
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              <BookOpen size={20} />
              Mentor
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
