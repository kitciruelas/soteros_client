
import type React from "react"
import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import ReCAPTCHA from 'react-google-recaptcha'
import Button from "../../../components/base/Button"
import Input from "../../../components/base/Input"
import Checkbox from "../../../components/base/Checkbox"
import useForm from "../../../hooks/useForm"
import { apiRequest } from "../../../utils/api"
import Navbar from "../../../components/Navbar"
import { useToast } from "../../../components/base/Toast"

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  
  // reCAPTCHA state
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null)
  const [recaptchaError, setRecaptchaError] = useState("")

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<LoginFormData>(
    {
      email: localStorage.getItem("rememberedEmail") || "",
      password: "",
      rememberMe: !!localStorage.getItem("rememberedEmail"),
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: {
        required: true,
        minLength: 6,
      },
    },
  )

  // Handle reCAPTCHA change
  const onRecaptchaChange = (value: string | null) => {
    setRecaptchaValue(value)
    if (value) {
      setRecaptchaError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) return

    // Validate reCAPTCHA
    if (!recaptchaValue) {
      setRecaptchaError("Please complete the reCAPTCHA verification.")
      return
    }

    setIsSubmitting(true)
    setRecaptchaError("")

    try {
      const formData = getValues()

      let data = null
      let userData = null
      let userType = null

      // Try general user login first for all emails (since most users are general users)
      console.log("Attempting general user login first...")
      data = await apiRequest("/auth/login/user", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      // Check if email verification is required
      if (data && !data.success && data.requiresVerification) {
        showToast({
          type: "warning",
          title: "Email Verification Required",
          message: data.message || "Please verify your email address before logging in.",
          durationMs: 5000,
        })
        
        // Redirect to verify email page after a short delay
        setTimeout(() => {
          navigate("/auth/verify-email", {
            state: { email: formData.email },
          })
        }, 2000)
        
        // Reset reCAPTCHA
        if (recaptchaRef.current) {
          recaptchaRef.current.reset()
        }
        setRecaptchaValue(null)
        return
      }

      // Check if general user login successful
      if (data && data.success) {
        console.log("General user login successful:", data)
        const role = "user"
        const userTypeValue = "user"
        userData = {
          ...data.user,
          role,
          userType: userTypeValue,
          token: data.token, // Add the token to user data
        }
        userType = userTypeValue
      } else {
        console.log("General user login failed, trying staff login...")

        // Try staff login as fallback
        data = await apiRequest("/auth/login/staff", {
          method: "POST",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        if (data && data.success) {
          console.log("Staff login successful:", data)
          console.log("Staff token received:", data.token ? "Yes" : "No")
          userData = {
            ...data.staff,
            role: "staff",
            userType: "staff",
            token: data.token, // Add the token to user data
          }
          userType = "staff"
          
          // Also store staffToken as fallback for legacy support
          if (data.token) {
            localStorage.setItem("staffToken", data.token)
            console.log("✅ Staff token stored in localStorage as staffToken")
          }
        } else {
          console.log("Staff login also failed, trying admin login...")

          // Try admin login as last resort
          data = await apiRequest("/auth/login/admin", {
            method: "POST",
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
            }),
          })

          if (data && data.success) {
            console.log("Admin login successful:", data)
            userData = {
              ...data.admin,
              role: "admin",
              userType: "admin",
              token: data.token, // May be undefined
            }
            userType = "admin"
          } else {
            console.log("Admin login also failed:", data)
          }
        }
      }

      if (userData) {
        console.log(`Login successful for ${userType} user:`, userData)
        console.log(`Token in userData:`, userData.token ? "Present" : "Missing")

        // Store user data in localStorage for persistent login across browser tabs
        localStorage.setItem("userInfo", JSON.stringify(userData))
        console.log("✅ UserInfo stored in localStorage:", {
          hasToken: !!userData.token,
          tokenLength: userData.token ? userData.token.length : 0,
          userType: userData.userType || userData.role
        })

        // If remember me is checked, store email for auto-fill
        if (formData.rememberMe) {
          localStorage.setItem("rememberedEmail", formData.email)
        } else {
          localStorage.removeItem("rememberedEmail")
        }

        // Notify components of auth state change
        window.dispatchEvent(new Event("authStateChanged"))

        // Show success toast
        showToast({
          type: "success",
          title: "Login Successful",
          message: "Redirecting to dashboard...",
          durationMs: 2000
        })

        // Redirect based on user type
        setTimeout(() => {
          if (userType === "staff") {
            console.log("Redirecting staff user to staff dashboard")
            navigate("/staff")
          } else if (userType === "user") {
            console.log("Redirecting general user to home page")
            navigate("/")
          } else if (userData.role === "admin") {
            console.log("Redirecting admin user to admin dashboard")
            navigate("/admin/dashboard")
          } else {
            console.log("Unknown user type, redirecting to home page")
            navigate("/")
          }
        }, 1500)
        return
      }

      // Handle specific error cases
      showToast({
        type: "error",
        title: "Login Failed",
        message: "Email or password is incorrect. Please try again.",
        durationMs: 5000
      })
      
      // Reset reCAPTCHA on failed login
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      setRecaptchaValue(null)
    } catch (error) {
      console.error("Login failed:", error)
      showToast({
        type: "error",
        title: "Login Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred. Please try again.",
        durationMs: 5000
      })
      
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      setRecaptchaValue(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-100 rounded-full opacity-10 animate-bounce delay-500"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="relative">
              <i className="ri-lock-line text-3xl text-white"></i>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="text-gray-600 text-lg">Please sign in to your account</p>

          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-3">
              <i className="ri-user-line text-blue-600 text-xl"></i>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              name="email"
              id="email"
              value={fields.email.value}
              onChange={(e) => setValue("email", e.target.value)}
              error={fields.email.touched ? fields.email.error : ""}
              placeholder="Enter your email"
              required
              autoComplete="email"
              icon={<i className="ri-mail-line"></i>}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              id="password"
              value={fields.password.value}
              onChange={(e) => setValue("password", e.target.value)}
              error={fields.password.touched ? fields.password.error : ""}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              icon={<i className="ri-lock-line"></i>}
            />

            {/* reCAPTCHA widget */}
            <div className="flex flex-col items-center w-full">
              <div className="transform scale-90 origin-center">
                <ReCAPTCHA
                  sitekey="6LfVgHUqAAAAAJtQJXShsLo2QbyGby2jquueTZYV"
                  onChange={onRecaptchaChange}
                  ref={recaptchaRef}
                />
              </div>
              {recaptchaError && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  {recaptchaError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Checkbox
                id="rememberMe"
                name="rememberMe"
                label="Remember me"
                checked={fields.rememberMe.value}
                onChange={(checked) => setValue("rememberMe", checked)}
              />
              <Link
                to="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500 cursor-pointer flex items-center gap-1 hover:gap-2 transition-all duration-200"
              >
                <span>Forgot password?</span>
                <i className="ri-arrow-right-line text-xs"></i>
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Signing in...
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform duration-200"></i>
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 flex items-center gap-2">
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <span>or</span>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              </span>
            </div>
          </div>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <i className="ri-user-add-line text-gray-400"></i>
              <span>Don't have an account?</span>
              <Link
                to="/auth/signup"
                className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer flex items-center gap-1 hover:gap-2 transition-all duration-200"
              >
                <span>Sign up</span>
                <i className="ri-arrow-right-line text-xs"></i>
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <div className="flex justify-center items-center gap-4 text-gray-400">
            <div className="flex items-center gap-1">
              <i className="ri-shield-check-line"></i>
              <span className="text-xs">Secure</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center gap-1">
              <i className="ri-lock-line"></i>
              <span className="text-xs">Encrypted</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center gap-1">
              <i className="ri-verified-badge-line"></i>
              <span className="text-xs">Trusted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
