"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../../components/base/Button"
import Card from "../../components/base/Card"
import Navbar from "../../components/Navbar"
import { getAuthState, type UserData } from "../../utils/auth"
import { feedbackApi } from "../../utils/api"
import { useToast } from "../../components/base/Toast"

export default function FeedbackPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)

  useEffect(() => {
    const authState = getAuthState()
    if (!authState.isAuthenticated) {
      navigate("/auth/login")
      return
    }
    
    // Only allow user type to access this page
    if (authState.userType !== 'user') {
      // Redirect admin/staff users to their respective dashboards
      if (authState.userType === 'admin') {
        navigate("/admin")
        return
      } else if (authState.userType === 'staff') {
        navigate("/staff")
        return
      }
    }
    
    setIsAuthenticated(true)
    setUserData(authState.userData)
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!feedback.trim()) {
      showToast({
        type: "error",
        title: "Feedback Required",
        message: "Please enter your feedback",
        durationMs: 4000
      })
      return
    }

    if (feedback.trim().length < 10) {
      showToast({
        type: "error",
        title: "Invalid Feedback",
        message: "Please provide at least 10 characters of feedback",
        durationMs: 4000
      })
      return
    }

    if (feedback.trim().length > 1000) {
      showToast({
        type: "error",
        title: "Feedback Too Long",
        message: "Feedback must be less than 1000 characters",
        durationMs: 4000
      })
      return
    }

    setIsSubmitting(true)

    try {
      await feedbackApi.submitFeedback({
        message: feedback.trim(),
        rating: rating,
      })

      showToast({
        type: "success",
        title: "Thank You!",
        message: "Your feedback has been submitted successfully. We appreciate your input!",
        durationMs: 4000
      })

      setFeedback("")
      setRating(null)
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Submission Failed",
        message: error.message || "Failed to submit feedback. Please try again.",
        durationMs: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingClick = (value: number) => {
    setRating(value === rating ? null : value)
  }

  const getRatingLabel = (rating: number) => {
    const labels = ["Poor", "Fair", "Good", "Very Good", "Excellent"]
    return labels[rating - 1]
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <i className="ri-loader-4-line text-2xl text-white animate-spin"></i>
          </div>
          <p className="text-gray-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navbar isAuthenticated={isAuthenticated} userData={userData} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i className="ri-feedback-line text-2xl text-white"></i>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Submit Feedback
            </h1>
            <p className="text-gray-600 text-lg">Help us improve by sharing your thoughts and suggestions</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  How would you rate your experience?
                </label>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(null)}
                      className={`group relative w-14 h-14 rounded-full border-2 transition-all duration-200 flex items-center justify-center transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-yellow-200 ${
                        (hoveredRating ? value <= hoveredRating : rating && value <= rating)
                          ? "bg-gradient-to-r from-yellow-400 to-amber-400 border-yellow-400 text-white shadow-lg"
                          : "bg-gray-50 border-gray-300 text-gray-400 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-500"
                      }`}
                      aria-label={`Rate ${value} star${value > 1 ? "s" : ""} - ${getRatingLabel(value)}`}
                    >
                      <i className="ri-star-fill text-xl"></i>
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {getRatingLabel(value)}
                      </div>
                    </button>
                  ))}
                </div>
                {rating && (
                  <p className="text-sm text-gray-600 font-medium">
                    You rated: {rating} star{rating > 1 ? "s" : ""} - {getRatingLabel(rating)}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="feedback" className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Feedback
                </label>
                <div className="relative">
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what you think about the application, suggest improvements, or report any issues..."
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-vertical min-h-[140px] text-gray-700 placeholder-gray-400"
                    rows={6}
                    maxLength={1000}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                    {feedback.length}/1000
                  </div>
                </div>
                {feedback.length > 0 && feedback.length < 10 && (
                  <p className="text-xs text-amber-600 mt-1">Please provide at least 10 characters</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting || feedback.trim().length < 10}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line mr-2"></i>
                      Submit Feedback
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                  className="border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transform hover:scale-[1.02] transition-all duration-200"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Back
                </Button>
              </div>
            </form>
          </Card>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <i className="ri-heart-line text-red-400"></i>
              <p>Your feedback helps us make ProteQ better for everyone in Rosario, Batangas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
