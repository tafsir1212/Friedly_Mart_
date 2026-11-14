"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import Link from "next/link";

const API = "http://localhost:3000/manager";

const ManagerLoginPage = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API}/login`, form);
      Cookies.set("token", res.data.access_token, { expires: 1 });
      Cookies.set("role", "manager", { expires: 1 });
      Cookies.set("managerId", String(res.data.manager.id), { expires: 1 });
      toast.success("Welcome back, Manager!");
      window.location.href = "/dashboard/manager";
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 min-h-screen">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/10 shadow-2xl backdrop-blur-xl p-8 border border-white/20 rounded-3xl">
          {/* Logo / Icon */}
          <div className="mb-8 text-center">
            <div className="flex justify-center items-center bg-gradient-to-br from-blue-500 to-cyan-400 shadow-blue-500/30 shadow-lg mx-auto mb-4 rounded-2xl w-16 h-16">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="font-black text-white text-3xl">Manager Portal</h1>
            <p className="mt-2 text-slate-400">Freindly Mart Operations Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 font-semibold text-slate-300 text-sm">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="manager@nexcart.com"
                className="bg-white/10 px-4 py-3 border border-white/20 focus:border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-white transition placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-slate-300 text-sm">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="bg-white/10 px-4 py-3 border border-white/20 focus:border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-white transition placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 hover:from-blue-600 to-cyan-500 hover:to-cyan-600 disabled:opacity-60 shadow-blue-500/30 shadow-lg px-6 py-3 rounded-xl w-full font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:cursor-not-allowed transform"
            >
              {loading ? (
                <span className="flex justify-center items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-slate-400 text-sm text-center">
            Don&apos;t have an account?{" "}
            <Link href="/login/manager/register" className="font-semibold text-blue-400 hover:text-blue-300 transition">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManagerLoginPage;
