"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../../../components/base/Button"
import Card from "../../../components/base/Card"
import { getAuthState, type UserData } from "../../../utils/auth"
import { feedbackApi } from "../../../utils/api"

export default function FeedbackPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [charCount, setCharCount] = useState(0)

  const maxChars = 1000

  useEffect(() => {
    const authState = getAuthState()
    if (!authState.isAuthenticated) {
      navigate("/auth/login")
      return
    }
    setIsAuthenticated(true)
    setUserData(authState.userData)
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!feedback.trim()) {
      setErrorMessage("Please enter your feedback")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
      return
    }

    if (feedback.trim().length < 10) {
      setErrorMessage("Please provide more detailed feedback (at least 10 characters)")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
      return
    }

    setIsSubmitting(true)
    setShowError(false)

    try {
      await feedbackApi.submitFeedback({
        message: feedback.trim(),
        rating: rating,
      })

      setShowSuccess(true)
      setFeedback("")
      setRating(null)
      setCharCount(0)
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to submit feedback. Please try again.")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingClick = (value: number) => {
    setRating(value === rating ? null : value)
  }

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxChars) {
      setFeedback(value)
      setCharCount(value.length)
    }
  }

  const getRatingLabel = (rating: number) => {
    const labels = {
      1: "Poor",
      2: "Fair",
      3: "Good",
      4: "Very Good",
      5: "Excellent",
    }
    return labels[rating as keyof typeof labels]
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <i className="ri-loader-4-line text-2xl text-white animate-spin"></i>
          </div>
          <p className="text-gray-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl">
              <i className="ri-feedback-line text-3xl text-white"></i>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Share Your Feedback
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Your insights help us create a better experience for everyone in our ProteQ community
            </p>

            {userData && (
              <div className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-white border border-blue-100 rounded-2xl shadow-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-white"></i>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">
                    {userData.name || `${userData.first_name} ${userData.last_name}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {userData.position && userData.department
                      ? `${userData.position} • ${userData.department}`
                      : userData.position || userData.department || "Team Member"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="ri-check-circle-line text-2xl text-green-600"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 text-lg">Thank you for your feedback!</h3>
                  <p className="text-green-700 mt-1">
                    Your input has been successfully submitted and will help us improve.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {showError && (
            <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="ri-error-warning-line text-2xl text-red-600"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 text-lg">Oops! Something went wrong</h3>
                  <p className="text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Form */}
          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Rating Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-2">
                    How would you rate your experience?
                  </label>
               
                </div>

                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(null)}
                      className={`group relative w-14 h-14 rounded-full border-2 transition-all duration-200 flex items-center justify-center transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-200 ${
                        (hoveredRating ? value <= hoveredRating : value <= (rating || 0))
                          ? "bg-gradient-to-br from-yellow-400 to-orange-400 border-yellow-400 text-white shadow-lg"
                          : "bg-white border-gray-300 text-gray-400 hover:bg-yellow-50 hover:border-yellow-300 shadow-sm"
                      }`}
                      aria-label={`Rate ${value} star${value > 1 ? "s" : ""} - ${getRatingLabel(value)}`}
                    >
                      <i className="ri-star-fill text-xl"></i>

                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {getRatingLabel(value)}
                      </div>
                    </button>
                  ))}
                </div>

                {(rating || hoveredRating) && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`ri-star-fill ${star <= (hoveredRating || rating || 0) ? "text-yellow-400" : "text-gray-300"}`}
                        ></i>
                      ))}
                    </div>
                    <span className="text-gray-700 font-medium">
                      {getRatingLabel((hoveredRating || rating) as number)}
                      {rating && !hoveredRating && ` (${rating}/5)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Feedback Message */}
              <div className="space-y-3">
                <label htmlFor="feedback" className="block text-lg font-semibold text-gray-900">
                  Your Feedback <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={handleFeedbackChange}
                    placeholder="Share your thoughts, suggestions, or report any issues you've encountered. The more specific you are, the better we can help improve the experience..."
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 resize-none min-h-[140px] text-gray-900 placeholder-gray-500 bg-white/50"
                    rows={6}
                    maxLength={maxChars}
                    required
                    aria-describedby="char-count feedback-help"
                  />
                  <div className="absolute bottom-4 right-4 text-sm text-gray-500" id="char-count">
                    {charCount}/{maxChars}
                  </div>
                </div>
                <p id="feedback-help" className="text-sm text-gray-600">
                  Please provide at least 10 characters to help us understand your feedback better.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting || !feedback.trim() || feedback.trim().length < 10}
                  className="flex-1 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-3 text-xl"></i>
                      Submitting Feedback...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line mr-3 text-xl"></i>
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
                  className="sm:w-auto h-14 text-lg font-semibold border-2 hover:bg-gray-50 transition-all duration-200"
                >
                  <i className="ri-arrow-left-line mr-3 text-xl"></i>
                  Back
                </Button>
              </div>
            </form>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-sm rounded-full border border-gray-200">
              <i className="ri-shield-check-line text-blue-600"></i>
              <span className="text-gray-700 font-medium">
                Your feedback helps us make ProteQ better for everyone in Rosario, Batangas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
