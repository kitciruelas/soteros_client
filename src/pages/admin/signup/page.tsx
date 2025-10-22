"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { adminAuthApi } from "../../../utils/api"

const AdminSignup: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await adminAuthApi.register(formData.name, formData.email, formData.password)

      if (response.success) {
        // Navigate to login page
        navigate("/admin/login")
      } else {
        setError(response.message || "Registration failed")
      }
    } catch (error) {
      console.error("Registration error:", error)
      setError(error instanceof Error ? error.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-br from-indigo-400/30 to-blue-600/30 rounded-full blur-2xl animate-bounce delay-500"></div>
        <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-400/30 to-purple-600/30 rounded-full blur-2xl animate-bounce delay-700"></div>

        {/* Animated Dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-indigo-500 rounded-full animate-ping delay-300"></div>
        <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping delay-700"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-blue-500 rounded-full animate-ping delay-1000"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mb-4 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
            <i className="ri-shield-user-line text-3xl text-white relative z-10"></i>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-2">
            Create Admin Account
          </h1>
          <p className="text-gray-600 font-medium">ProteQ Emergency Management System</p>

          {/* Trust Badges */}
          <div className="flex justify-center items-center space-x-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center">
              <i className="ri-shield-check-line text-green-500 mr-1"></i>
              <span>Secure</span>
            </div>
            <div className="flex items-center">
              <i className="ri-lock-line text-blue-500 mr-1"></i>
              <span>Encrypted</span>
            </div>
            <div className="flex items-center">
              <i className="ri-verified-badge-line text-purple-500 mr-1"></i>
              <span>Verified</span>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative">
          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-tl-3xl"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-indigo-400/20 to-transparent rounded-br-3xl"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 animate-shake">
                <div className="flex items-center">
                  <i className="ri-error-warning-line text-red-500 mr-2"></i>
                  <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Name Field */}
            <div className="group">
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-user-line text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="group">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-mail-line text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-lock-line text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70"
                  placeholder="Create a strong password"
                  required
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="group">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-lock-line text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/70"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              {loading ? (
                <div className="flex items-center justify-center relative z-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center justify-center relative z-10">
                  <i className="ri-user-add-line mr-2"></i>
                  Create Account
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Footer Trust Indicators */}
        <div className="text-center mt-6">
          <div className="flex justify-center items-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center">
              <i className="ri-shield-check-line text-green-500 mr-1"></i>
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center">
              <i className="ri-time-line text-blue-500 mr-1"></i>
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center">
              <i className="ri-global-line text-purple-500 mr-1"></i>
              <span>Global Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSignup
