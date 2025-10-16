"use client"

import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Button from "../../../components/base/Button"
import Input from "../../../components/base/Input"
import Checkbox from "../../../components/base/Checkbox"
import useForm from "../../../hooks/useForm"
import { apiRequest } from "../../../utils/api"
import PrivacyPolicyModal from "../../../components/PrivacyPolicyModal"
import TermsOfServiceModal from "../../../components/TermsOfServiceModal"
import Navbar from "../../../components/Navbar"

interface SignupFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  userType: string
  department: string | null
  college: string | null
  agreeToTerms: boolean
}

export default function SignupPage() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showErrorMessage, setShowErrorMessage] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  const navigate = useNavigate()

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting, setError } = useForm<SignupFormData>(
    {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      userType: "CITIZEN",
      department: null,
      college: null,
      agreeToTerms: false,
    },
    {
      firstName: {
        required: true,
        minLength: 2,
      },
      lastName: {
        required: true,
        minLength: 2,
      },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: {
        required: true,
        minLength: 8,
        custom: (value: string) => {
          if (!/(?=.*[a-z])/.test(value)) return "Password must contain at least one lowercase letter"
          if (!/(?=.*[A-Z])/.test(value)) return "Password must contain at least one uppercase letter"
          if (!/(?=.*\d)/.test(value)) return "Password must contain at least one number"
          return null
        },
      },
      // Removed userType validation since it's auto set
      department: {
        required: false,
      },
      college: {
        required: false,
      },
      confirmPassword: {
        required: true,
        custom: (value: string) => {
          if (value !== fields.password.value) return "Passwords do not match"
          return null
        },
      },
      agreeToTerms: {
        custom: (value: boolean) => {
          if (!value) return "You must agree to the terms and conditions"
          return null
        },
      },
    },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) return

    setIsSubmitting(true)
    setShowErrorMessage(false)
    setShowSuccessMessage(false)

    try {
      const formData = getValues()
      console.log("Signup data:", formData)

      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
          department: formData.department,
          college: formData.college,
        }),
      })

      if (data && data.success) {
        console.log("Registration successful:", data)
        setShowSuccessMessage(true)

        // Store email for login page
        sessionStorage.setItem("lastRegisteredEmail", formData.email)

        // Redirect to login page
        setTimeout(() => {
          navigate("/auth/login")
        }, 1500)
        return
      } else {
        const errorMsg = data?.message || "Registration failed. Please try again."

        // Handle specific error cases
        if (errorMsg.toLowerCase().includes("email") && errorMsg.toLowerCase().includes("exist")) {
          setError("email", "This email is already registered")
        }

        setErrorMessage(errorMsg)
        setShowErrorMessage(true)
      }
    } catch (error) {
      console.error("Registration failed:", error)
      setErrorMessage("Login failed: " + (error instanceof Error ? error.message : "Unknown error"))
      setShowErrorMessage(true)
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setShowErrorMessage(false), 5000)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Floating background illustrations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-emerald-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-200/20 to-green-300/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-green-300/10 rounded-full blur-2xl animate-bounce delay-500"></div>
        <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-emerald-300/15 rounded-full blur-xl animate-bounce delay-700"></div>

        {/* Floating dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-ping delay-300"></div>
        <div className="absolute top-40 right-32 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping delay-700"></div>
        <div className="absolute bottom-32 left-16 w-2.5 h-2.5 bg-green-300 rounded-full animate-ping delay-1000"></div>
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-500"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/25 transform hover:scale-105 transition-all duration-300 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl blur opacity-50 animate-pulse"></div>
            <i className="ri-user-add-line text-3xl text-white relative z-10"></i>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <i className="ri-star-fill text-xs text-yellow-800"></i>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Create your account
          </h1>
          <p className="text-gray-600 text-lg">Join our community and get started today</p>

          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <i className="ri-shield-check-line text-green-500"></i>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <i className="ri-lock-line text-green-500"></i>
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <i className="ri-verified-badge-line text-green-500"></i>
              <span>Trusted</span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3 text-green-800">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <i className="ri-check-circle-line text-green-600"></i>
              </div>
              <div>
                <div className="text-sm font-semibold">Account created successfully!</div>
                <div className="text-xs mt-1 text-green-700">
                  Redirecting to login page... You can now login with your credentials.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {showErrorMessage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3 text-red-800">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <i className="ri-error-warning-line text-red-600"></i>
              </div>
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-100/50 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-100/50 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                name="firstName"
                id="firstName"
                value={fields.firstName.value}
                onChange={(e) => setValue("firstName", e.target.value)}
                error={fields.firstName.touched ? fields.firstName.error : ""}
                placeholder="John"
                required
                autoComplete="given-name"
                icon={<i className="ri-user-line"></i>}
              />
              <Input
                label="Last Name"
                type="text"
                name="lastName"
                id="lastName"
                value={fields.lastName.value}
                onChange={(e) => setValue("lastName", e.target.value)}
                error={fields.lastName.touched ? fields.lastName.error : ""}
                placeholder="Doe"
                required
                autoComplete="family-name"
                icon={<i className="ri-user-line"></i>}
              />
            </div>

            <Input
              label="Email address"
              type="email"
              name="email"
              id="email"
              value={fields.email.value}
              onChange={(e) => setValue("email", e.target.value)}
              error={fields.email.touched ? fields.email.error : ""}
              placeholder="john@example.com"
              required
              autoComplete="email"
              icon={<i className="ri-mail-line"></i>}
            />

            <div className="space-y-4">
              <div>
                <input type="hidden" id="userType" name="userType" value="CITIZEN" />
              </div>

              {/* Additional fields can be added here based on user type */}
              {fields.userType.value === "BARANGAY_STAFF" && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <i className="ri-information-line text-blue-600"></i>
                    Your account will need approval from an admin before you can access staff features.
                  </p>
                </div>
              )}
            </div>

            <Input
              label="Password"
              type="password"
              name="password"
              id="password"
              value={fields.password.value}
              onChange={(e) => setValue("password", e.target.value)}
              error={fields.password.touched ? fields.password.error : ""}
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
              icon={<i className="ri-lock-line"></i>}
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={fields.confirmPassword.value}
              onChange={(e) => setValue("confirmPassword", e.target.value)}
              error={fields.confirmPassword.touched ? fields.confirmPassword.error : ""}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              icon={<i className="ri-lock-line"></i>}
            />

            <div className="space-y-3">
              <Checkbox
                id="agreeToTerms"
                name="agreeToTerms"
                label={
                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-green-600 hover:text-green-500 underline bg-transparent border-none p-0 font-medium transition-colors duration-200"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-green-600 hover:text-green-500 underline bg-transparent border-none p-0 font-medium transition-colors duration-200"
                    >
                      Privacy Policy
                    </button>
                  </span>
                }
                checked={fields.agreeToTerms.value}
                onChange={(checked) => setValue("agreeToTerms", checked)}
              />
              {fields.agreeToTerms.touched && fields.agreeToTerms.error && (
                <p className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                  <i className="ri-error-warning-line"></i>
                  {fields.agreeToTerms.error}
                </p>
              )}
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
                  Creating account...
                </>
              ) : (
                <>
                  <i className="ri-user-add-line mr-2"></i>
                  Create account
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="font-semibold text-green-600 hover:text-green-500 cursor-pointer transition-colors duration-200 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </div>

      {/* Modals */}
      <TermsOfServiceModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyPolicyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
    </div>
    </>
  )
}
