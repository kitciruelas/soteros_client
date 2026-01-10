"use client"

import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Button from "../../../components/base/Button"
import Input from "../../../components/base/Input"
import useForm from "../../../hooks/useForm"
import Navbar from "../../../components/Navbar"
import { useToast } from "../../../components/base/Toast"

interface ForgotPasswordFormData {
  email: string
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [emailSent, setEmailSent] = useState(false)

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<ForgotPasswordFormData>(
    {
      email: "",
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) return

    setIsSubmitting(true)

    try {
      const formData = getValues()
      console.log("Forgot password data:", formData)

      const apiUrl = import.meta.env.VITE_API_URL || 'https://soteros-backend.onrender.com/api';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setEmailSent(true)
        showToast({
          type: "success",
          title: "Verification Code Sent",
          message: "Check your email for the verification code.",
          durationMs: 3000
        })
        // Redirect to OTP verification page after 2 seconds
        setTimeout(() => {
          navigate("/auth/verify-otp", { state: { email: formData.email } })
        }, 2000)
      } else {
        throw new Error(data.message || "Failed to send verification code")
      }
    } catch (error) {
      console.error("Reset password failed:", error)
      showToast({
        type: "error",
        title: "Failed to Send Code",
        message: error instanceof Error ? error.message : "Failed to send verification code. Please try again later.",
        durationMs: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendEmail = async () => {
    setIsSubmitting(true)

    try {
      const formData = getValues()

      const apiUrl = import.meta.env.VITE_API_URL || 'https://soteros-backend.onrender.com/api';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showToast({
          type: "success",
          title: "Code Resent",
          message: "Verification code has been sent again to your email.",
          durationMs: 3000
        })
      } else {
        throw new Error(data.message || "Failed to resend verification code")
      }
    } catch (error) {
      console.error("Resend email failed:", error)
      showToast({
        type: "error",
        title: "Failed to Resend Code",
        message: error instanceof Error ? error.message : "Failed to resend verification code. Please try again later.",
        durationMs: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-pink-300/20 to-purple-300/20 rounded-full blur-2xl animate-bounce delay-500"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-br from-blue-300/20 to-pink-300/20 rounded-full blur-xl animate-bounce delay-700"></div>

        {/* Floating dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-purple-400/40 rounded-full animate-ping"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-pink-400/40 rounded-full animate-ping delay-300"></div>
        <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-ping delay-700"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-purple-400/40 rounded-full animate-ping delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl blur opacity-50 animate-pulse"></div>
            <i className="ri-key-line text-2xl text-white relative z-10"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {emailSent ? "Check your email" : "Forgot your password?"}
          </h1>
          <p className="text-gray-600">
            {emailSent
              ? "We've sent a verification code to your email address"
              : "Enter your email address and we'll send you a code to reset your password"}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>

          {!emailSent ? (
            <>
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-60"></div>
              <div className="absolute -top-1 -right-3 w-2 h-2 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-60"></div>
              <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full opacity-60"></div>

              {/* Reset Password Form */}
              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  id="email"
                  value={fields.email.value}
                  onChange={(e) => setValue("email", e.target.value)}
                  error={fields.email.touched ? fields.email.error : ""}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  icon={<i className="ri-mail-line"></i>}
                />

                <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Sending verification code...
                    </>
                  ) : (
                    "Send verification code"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center space-y-6 relative z-10">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-green-500/10 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-200/50 to-emerald-200/50 rounded-full blur animate-pulse"></div>
                  <i className="ri-mail-check-line text-3xl text-green-600 relative z-10"></i>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">We sent a verification code to:</p>
                  <p className="font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg inline-block">
                    {fields.email.value}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Didn't receive the code? Check your spam folder or</p>

                  <Button variant="outline" size="md" fullWidth onClick={handleResendEmail} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Resending...
                      </>
                    ) : (
                      "Resend code"
                    )}
                  </Button>

                  <Link to="/auth/reset-password">
                    <Button variant="primary" size="md" fullWidth>
                      Enter verification code
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Back to Login */}
          <div className="text-center mt-8 pt-6 border-t border-gray-100 relative z-10">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-500 cursor-pointer font-medium transition-colors duration-200 hover:bg-purple-50 px-3 py-2 rounded-lg"
            >
              <i className="ri-arrow-left-line"></i>
              Back to sign in
            </Link>
          </div>
        </div>

     

        <div className="flex justify-center items-center gap-6 mt-6 opacity-60">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <i className="ri-shield-check-line text-green-500"></i>
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <i className="ri-lock-line text-blue-500"></i>
            <span>Encrypted</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <i className="ri-verified-badge-line text-purple-500"></i>
            <span>Trusted</span>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
