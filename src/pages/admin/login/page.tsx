"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { adminAuthApi } from "../../../utils/api"

const AdminLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail")
    if (rememberedEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }))
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await adminAuthApi.login(formData.email, formData.password)

      if (response.success) {
        // Store admin data and token
        const adminData = {
          ...response.admin,
          token: response.token,
          userType: "admin",
        }

        localStorage.setItem("userInfo", JSON.stringify(adminData))
        localStorage.setItem("adminToken", response.token)

        // If remember me is checked, store email for auto-fill
        if (formData.rememberMe) {
          localStorage.setItem("rememberedEmail", formData.email)
        } else {
          localStorage.removeItem("rememberedEmail")
        }

        // Dispatch auth state change event
        window.dispatchEvent(new Event("authStateChanged"))

        // Navigate to admin dashboard
        navigate("/admin/dashboard")
      } else {
        setError(response.message || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-blue-300/30 to-indigo-300/30 rounded-full blur-2xl animate-bounce delay-500"></div>

        {/* Floating dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-300"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-indigo-400 rounded-full animate-ping delay-700"></div>
        <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping delay-1000"></div>

        {/* Geometric shapes */}
        <div className="absolute top-1/3 left-10 w-8 h-8 border border-blue-300/40 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-1/3 right-16 w-6 h-6 border border-indigo-300/40 rounded-full animate-pulse delay-500"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mb-4 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
            <i className="ri-shield-user-line text-3xl text-white relative z-10"></i>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
              <i className="ri-check-line text-xs text-white"></i>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
            Admin Portal
          </h1>
          <p className="text-gray-600 font-medium">SoteROS Emergency Management System</p>

          <div className="flex justify-center items-center gap-4 mt-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <i className="ri-shield-check-line text-green-500"></i>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <i className="ri-lock-line text-blue-500"></i>
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <i className="ri-verified-badge-line text-indigo-500"></i>
              <span>Verified</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden">
          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-br-full"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-indigo-400/20 to-transparent rounded-tl-full"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl p-4 animate-shake">
                <div className="flex items-center">
                  <i className="ri-error-warning-line text-red-500 mr-2"></i>
                  <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-mail-line text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70"
                  placeholder="admin@example.com"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-transparent group-focus-within:to-indigo-500/10 transition-all duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-lock-line text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70"
                  placeholder="Enter your password"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-transparent group-focus-within:to-indigo-500/10 transition-all duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 font-medium">
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700"></div>
              {loading ? (
                <div className="flex items-center justify-center relative z-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center relative z-10">
                  <i className="ri-login-box-line mr-2"></i>
                  Sign In to Admin Portal
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center relative z-10">
            <p className="text-sm text-gray-600">Need help? Contact your system administrator</p>
          </div>
        </div>

       

        <div className="mt-6 flex justify-center items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <i className="ri-shield-check-line text-green-500"></i>
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center gap-1">
            <i className="ri-time-line text-blue-500"></i>
            <span>24/7 Monitoring</span>
          </div>
          <div className="flex items-center gap-1">
            <i className="ri-user-settings-line text-indigo-500"></i>
            <span>Admin Access</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
