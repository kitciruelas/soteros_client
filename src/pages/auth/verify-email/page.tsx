"use client"

import type React from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import Button from "../../../components/base/Button"
import Input from "../../../components/base/Input"
import useForm from "../../../hooks/useForm"
import Navbar from "../../../components/Navbar"
import { useToast } from "../../../components/base/Toast"
import { apiRequest } from "../../../utils/api"

interface VerifyEmailFormData {
  otp: string
}

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  // Get email from location state or query params
  const email = location.state?.email || new URLSearchParams(location.search).get("email") || ""

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<VerifyEmailFormData>(
    {
      otp: "",
    },
    {
      otp: {
        required: true,
        pattern: /^\d{6}$/,
        custom: (value: string) => {
          if (!value) return "Verification code is required"
          if (!/^\d{6}$/.test(value)) return "Please enter a valid 6-digit code"
          return null
        },
      },
    },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) return

    const formData = getValues()

    setIsSubmitting(true)

    try {
      // Verify email with backend
      const data = await apiRequest("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: email.toLowerCase(),
          otp: formData.otp,
        }),
      })

      if (data && data.success) {
        // Show success toast
        showToast({
          type: "success",
          title: "Email Verified!",
          message: "Your account has been activated. Redirecting to login...",
          durationMs: 3000,
        })

        // Store email for login page
        sessionStorage.setItem("lastRegisteredEmail", email)

        // Redirect to login page after successful verification
        setTimeout(() => {
          navigate("/auth/login")
        }, 2000)
      } else {
        throw new Error(data?.message || "Invalid verification code")
      }
    } catch (error: any) {
      console.error("Email verification failed:", error)
      const errorMessage = error?.message || "Invalid verification code. Please try again."
      showToast({
        type: "error",
        title: "Verification Failed",
        message: errorMessage,
        durationMs: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendCode = async () => {
    setIsSubmitting(true)

    try {
      // For resend, we would need a resend-verification endpoint
      // For now, redirect back to signup with a message
      showToast({
        type: "info",
        title: "Resend Code",
        message: "Please sign up again to receive a new verification code.",
        durationMs: 4000,
      })

      setTimeout(() => {
        navigate("/auth/signup", {
          state: { email: email },
        })
      }, 2000)
    } catch (error: any) {
      console.error("Resend code failed:", error)
      showToast({
        type: "error",
        title: "Failed to Resend Code",
        message: error?.message || "Failed to resend verification code. Please try again later.",
        durationMs: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Redirect if no email
  if (!email) {
    navigate("/auth/signup")
    return null
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8 relative overflow-hidden">
        {/* Floating background illustrations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-emerald-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-200/20 to-green-300/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/25 transform hover:scale-105 transition-all duration-300 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl blur opacity-50 animate-pulse"></div>
              <i className="ri-mail-check-line text-3xl text-white relative z-10"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Verify Your Email
            </h1>
            <p className="text-gray-600 text-lg">Enter the 6-digit code sent to your email</p>
          </div>

          {/* Verification Form */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-100/50 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-100/50 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {/* Email Display */}
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl">
                <p className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-2">
                  <i className="ri-mail-line text-green-600"></i>
                  Code sent to:
                </p>
                <p className="font-semibold text-gray-900">{email}</p>
              </div>

              <div>
                <Input
                  label="Verification Code"
                  type="text"
                  name="otp"
                  id="otp"
                  value={fields.otp.value}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 characters
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setValue("otp", value)
                  }}
                  error={fields.otp.touched ? fields.otp.error : ""}
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                  icon={<i className="ri-shield-check-line"></i>}
                />
                <style>{`
                  #otp {
                    text-align: center;
                    font-size: 1.5rem;
                    letter-spacing: 0.5em;
                    font-family: 'Courier New', monospace;
                  }
                `}</style>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Verifying...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line mr-2"></i>
                    Verify Email
                  </>
                )}
              </Button>
            </form>

            {/* Resend Code */}
            <div className="text-center mt-6 relative z-10">
              <p className="text-sm text-gray-500 mb-3">Didn't receive the code?</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendCode}
                disabled={isSubmitting}
                className="border-green-300 text-green-600 hover:bg-green-50"
              >
                <i className="ri-refresh-line mr-2"></i>
                Resend Code
              </Button>
            </div>

            {/* Back to Signup */}
            <div className="text-center mt-8 pt-6 border-t border-gray-100 relative z-10">
              <Link
                to="/auth/signup"
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-500 cursor-pointer font-medium transition-colors duration-200"
              >
                <i className="ri-arrow-left-line"></i>
                Back to Sign Up
              </Link>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              Having trouble? Check your spam folder or{" "}
              <Link to="/auth/signup" className="text-green-600 hover:text-green-500 cursor-pointer font-medium">
                sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

