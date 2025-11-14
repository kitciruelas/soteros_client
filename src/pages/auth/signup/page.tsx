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
import { useToast } from "../../../components/base/Toast"
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

const rosarioBarangays = [
  { name: "Alupay", lat: 13.8404, lng: 121.2922 },
  { name: "Antipolo", lat: 13.708, lng: 121.3096 },
  { name: "Bagong Pook", lat: 13.8402, lng: 121.2216 },
  { name: "Balibago", lat: 13.8512, lng: 121.2855 },
  { name: "Barangay A", lat: 13.8457, lng: 121.2104 },
  { name: "Barangay B", lat: 13.8461, lng: 121.2065 },
  { name: "Barangay C", lat: 13.8467, lng: 121.2032 },
  { name: "Barangay D", lat: 13.844, lng: 121.2035 },
  { name: "Barangay E", lat: 13.8415, lng: 121.2047 },
  { name: "Bayawang", lat: 13.7944, lng: 121.2798 },
  { name: "Baybayin", lat: 13.8277, lng: 121.2589 },
  { name: "Bulihan", lat: 13.7967, lng: 121.2351 },
  { name: "Cahigam", lat: 13.8021, lng: 121.2501 },
  { name: "Calantas", lat: 13.734, lng: 121.3129 },
  { name: "Colongan", lat: 13.8114, lng: 121.1762 },
  { name: "Itlugan", lat: 13.819, lng: 121.2036 },
  { name: "Leviste", lat: 13.7694, lng: 121.2868 },
  { name: "Lumbangan", lat: 13.8122, lng: 121.2649 },
  { name: "Maalas-as", lat: 13.8112, lng: 121.2122 },
  { name: "Mabato", lat: 13.8144, lng: 121.2913 },
  { name: "Mabunga", lat: 13.781, lng: 121.2924 },
  { name: "Macalamcam A", lat: 13.8551, lng: 121.3046 },
  { name: "Macalamcam B", lat: 13.8606, lng: 121.3265 },
  { name: "Malaya", lat: 13.8535, lng: 121.172 },
  { name: "Maligaya", lat: 13.8182, lng: 121.2742 },
  { name: "Marilag", lat: 13.8562, lng: 121.1764 },
  { name: "Masaya", lat: 13.8383, lng: 121.1852 },
  { name: "Matamis", lat: 13.7216, lng: 121.3305 },
  { name: "Mavalor", lat: 13.8177, lng: 121.2315 },
  { name: "Mayuro", lat: 13.7944, lng: 121.2623 },
  { name: "Namuco", lat: 13.8382, lng: 121.2036 },
  { name: "Namunga", lat: 13.8431, lng: 121.1978 },
  { name: "Nasi", lat: 13.7699, lng: 121.3127 },
  { name: "Natu", lat: 13.842, lng: 121.2683 },
  { name: "Palakpak", lat: 13.7079, lng: 121.332 },
  { name: "Pinagsibaan", lat: 13.8438, lng: 121.3141 },
  { name: "Putingkahoy", lat: 13.8349, lng: 121.3227 },
  { name: "Quilib", lat: 13.8603, lng: 121.2002 },
  { name: "Salao", lat: 13.8578, lng: 121.3455 },
  { name: "San Carlos", lat: 13.8478, lng: 121.2475 },
  { name: "San Ignacio", lat: 13.8335, lng: 121.1764 },
  { name: "San Isidro", lat: 13.8074, lng: 121.3152 },
  { name: "San Jose", lat: 13.8419, lng: 121.2329 },
  { name: "San Roque", lat: 13.8518, lng: 121.2039 },
  { name: "Santa Cruz", lat: 13.8599, lng: 121.1853 },
  { name: "Timbugan", lat: 13.8095, lng: 121.1869 },
  { name: "Tiquiwan", lat: 13.8284, lng: 121.2399 },
  { name: "Tulos", lat: 13.7231, lng: 121.2971 },
]

interface SignupFormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address: string
  password: string
  confirmPassword: string
  userType: string
  department: string | null
  college: string | null
  agreeToTerms: boolean
}

export default function SignupPage() {
  const { showToast } = useToast()
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  const navigate = useNavigate()

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting, setError } = useForm<SignupFormData>(
    {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: "",
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
      phoneNumber: {
        required: true,
        custom: (value: string) => {
          if (!value) return "Phone number is required"
          
          // Handle E.164 format from PhoneInput (+639XXXXXXXXX)
          if (value.startsWith('+63')) {
            const cleanNumber = value.replace(/\D/g, '');
            if (!/^639\d{9}$/.test(cleanNumber)) {
              return "Please enter a valid Philippine mobile number"
            }
            return null
          }
          
          // Handle local format (09123456789)
          if (value.startsWith('0')) {
            if (!/^09\d{9}$/.test(value)) {
              return "Please enter a valid Philippine mobile number"
            }
            return null
          }
          
          return "Please enter a valid Philippine phone number"
        },
      },
      address: {
        required: true,
        custom: (value: string) => {
          if (!value) {
            return "Please select your barangay"
          }
          return null
        },
      },
      password: {
        required: true,
        minLength: 8,
        maxLength: 128,
        custom: (value: string) => {
          if (!/(?=.*[a-z])/.test(value)) return "Password must contain at least one lowercase letter"
          if (!/(?=.*[A-Z])/.test(value)) return "Password must contain at least one uppercase letter"
          if (!/(?=.*\d)/.test(value)) return "Password must contain at least one number"
          if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) return "Password must contain at least one special character"
          // Check for common weak passwords
          const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'letmein', 'welcome']
          if (commonPasswords.some(weak => value.toLowerCase().includes(weak))) {
            return "Password is too common and easily guessable"
          }
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

    try {
      const formData = getValues()
      console.log("Signup data:", formData)

      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          password: formData.password,
          userType: formData.userType,
          department: formData.department,
          college: formData.college,
        }),
      })

      if (data && data.success) {
        console.log("Registration successful:", data)

        // Show success toast with verification email info
        const toastMessage = data.isResend 
          ? "Account information updated! A new verification code has been sent to your email."
          : "Verification email sent! Please check your inbox for the verification code to activate your account."
        
        showToast({
          type: "success",
          title: data.isResend ? "Verification Code Resent!" : "Account Created Successfully!",
          message: toastMessage,
          durationMs: 5000
        })

        // Redirect to email verification page
        setTimeout(() => {
          navigate("/auth/verify-email", {
            state: { email: formData.email }
          })
        }, 2000)
        return
      } else {
        const errorMsg = data?.message || "Registration failed. Please try again."

        // Handle specific error cases
        if (data?.accountExists) {
          if (data?.isVerified) {
            // Account is verified, redirect to login
            showToast({
              type: "info",
              title: "Account Already Exists",
              message: "This email is already registered and verified. Please log in instead.",
              durationMs: 4000
            })
            setTimeout(() => {
              navigate("/auth/login", {
                state: { email: formData.email }
              })
            }, 2000)
            return
          } else {
            // Account exists but unverified - this should be handled by backend now
            setError("email", "This email is already registered but not verified")
          }
        } else if (errorMsg.toLowerCase().includes("email") && errorMsg.toLowerCase().includes("exist")) {
          setError("email", "This email is already registered")
        }

        // Handle password validation errors
        if (errorMsg.toLowerCase().includes("password") && data?.errors && Array.isArray(data.errors)) {
          // Set password field error with specific requirements
          const passwordErrors = data.errors.join(", ")
          setError("password", passwordErrors)
          
          showToast({
            type: "error",
            title: "Password Requirements Not Met",
            message: passwordErrors,
            durationMs: 6000
          })
        } else {
          showToast({
            type: "error",
            title: "Registration Failed",
            message: errorMsg,
            durationMs: 5000
          })
        }
      }
    } catch (error: any) {
      console.error("Registration failed:", error)
      
      // Handle API error response with password validation errors
      let errorMessage = "Unknown error occurred. Please try again."
      let errorData = null
      
      if (error instanceof Error) {
        errorMessage = error.message
        // Check if error has attached responseData (from apiRequest)
        if ((error as any).responseData) {
          errorData = (error as any).responseData
        }
      } else if (error?.response?.data) {
        errorData = error.response.data
        errorMessage = errorData?.message || errorMessage
      }
      
      // Handle password validation errors from API
      if (errorData && errorData.message?.toLowerCase().includes("password") && errorData.errors && Array.isArray(errorData.errors)) {
        const passwordErrors = errorData.errors.join(", ")
        setError("password", passwordErrors)
        errorMessage = passwordErrors
        
        showToast({
          type: "error",
          title: "Password Requirements Not Met",
          message: passwordErrors,
          durationMs: 6000
        })
      } else {
        showToast({
          type: "error",
          title: "Registration Failed",
          message: errorMessage,
          durationMs: 5000
        })
      }
    } finally {
      setIsSubmitting(false)
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

            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <div className="w-5 h-5 text-gray-400">
                    <i className="ri-phone-line"></i>
                  </div>
                </div>
                <PhoneInput
                  international
                  defaultCountry="PH"
                  value={fields.phoneNumber.value}
                  onChange={(value) => {
                    setValue("phoneNumber", value || "");
                  }}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200 pl-10 ${
                    fields.phoneNumber.error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 hover:border-gray-400'
                  } bg-white`}
                  placeholder="Enter phone number"
                />
              </div>
              {fields.phoneNumber.touched && fields.phoneNumber.error && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  {fields.phoneNumber.error}
                </p>
              )}
            </div>

            <div className="w-full">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Barangay <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="w-5 h-5 text-gray-400">
                    <i className="ri-map-pin-line"></i>
                  </div>
                </div>
                <select
                  id="address"
                  name="address"
                  value={fields.address.value}
                  onChange={(e) => setValue("address", e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:outline-none transition-all duration-200 pl-10 pr-10 appearance-none bg-white ${
                    fields.address.error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  required
                >
                  <option value="">Select your barangay</option>
                  {rosarioBarangays.map((barangay) => (
                    <option key={barangay.name} value={barangay.name}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="w-5 h-5 text-gray-400">
                    <i className="ri-arrow-down-s-line"></i>
                  </div>
                </div>
              </div>
              {fields.address.touched && fields.address.error && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  {fields.address.error}
                </p>
              )}
            </div>

            {/* Location Information Display - Hidden */}
            {/* <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-map-pin-2-line text-blue-600"></i>
                <span className="text-sm font-semibold text-blue-800">Location Information</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm text-blue-700">
                <div className="flex justify-between">
                  <span className="font-medium">State/Province:</span>
                  <span className="text-blue-800">Batangas</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">City/Municipality:</span>
                  <span className="text-blue-800">Rosario</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">ZIP Code:</span>
                  <span className="text-blue-800">4225</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <i className="ri-information-line"></i>
                <span>All users are automatically registered under Rosario, Batangas</span>
              </div>
            </div> */}

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
                  Sending verification email...
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
