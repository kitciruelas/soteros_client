"use client"

import { Link, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import Navbar from "../../components/Navbar"
import Carousel from "../../components/base/Carousel"
import AnimatedCounter from "../../components/base/AnimatedCounter"
import PrivacyPolicyModal from "../../components/PrivacyPolicyModal"
import TermsOfServiceModal from "../../components/TermsOfServiceModal"
import { getAuthState, type UserData } from "../../utils/auth"
import { publicApi } from "../../utils/api"
import { useScrollAnimation } from "../../hooks/useScrollAnimation"

export default function Home() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true) // Add loading state for auth
  const [showHotlineModal, setShowHotlineModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [stats, setStats] = useState({
    responders: 0,
    evacuationCenters: 0,
    residentsCovered: 0,
    totalIncidents: 0,
  })
  
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [testimonials, setTestimonials] = useState<
    Array<{
      id: number
      quote: string
      rating: number
      name: string
      type: string
      department?: string
      created_at: string
    }>
  >([])
  const [loadingTestimonials, setLoadingTestimonials] = useState(true)
  const [testimonialsError, setTestimonialsError] = useState<string | null>(null)
  const [testimonialsLimit, setTestimonialsLimit] = useState(3)
  const [showAllTestimonials, setShowAllTestimonials] = useState(false)
  
  // Scroll animation for stats section
  const { ref: statsRef } = useScrollAnimation({
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px',
    triggerOnce: true
  })
  

  useEffect(() => {
    // Check authentication state using the new utility
    const authState = getAuthState()
    
    // Redirect admin/staff users to their respective dashboards
    if (authState.isAuthenticated) {
      if (authState.userType === "admin") {
        navigate("/admin")
        return
      } else if (authState.userType === "staff") {
        navigate("/staff")
        return
      }
    }
    
    // Only show user-specific content for user type
    const isUserAuth = authState.isAuthenticated && authState.userType === "user"
    setIsLoggedIn(isUserAuth)
    setUserData(isUserAuth ? authState.userData : null)
    setIsAuthLoading(false) // Set auth loading to false after initial check

    // Listen for storage changes to update authentication state
    const handleStorageChange = () => {
      const newAuthState = getAuthState()
      
      // Redirect admin/staff users to their respective dashboards
      if (newAuthState.isAuthenticated) {
        if (newAuthState.userType === "admin") {
          navigate("/admin")
          return
        } else if (newAuthState.userType === "staff") {
          navigate("/staff")
          return
        }
      }
      
      // Only show user-specific content for user type
      const isNewUserAuth = newAuthState.isAuthenticated && newAuthState.userType === "user"
      setIsLoggedIn(isNewUserAuth)
      setUserData(isNewUserAuth ? newAuthState.userData : null)
    }

    window.addEventListener("storage", handleStorageChange)

    // Also listen for custom events (for same-tab updates)
    window.addEventListener("authStateChanged", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("authStateChanged", handleStorageChange)
    }
  }, [navigate])

  useEffect(() => {
    // Handle hash navigation to FAQ section
    if (window.location.hash === "#faq-section") {
      setTimeout(() => {
        const faqSection = document.getElementById("faq-section")
        if (faqSection) {
          faqSection.scrollIntoView({ behavior: "smooth" })
        }
      }, 100) // Small delay to ensure page is loaded
    }
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true)
      setStatsError(null)
      try {
        const response = await publicApi.getHomeStats()
        if (response.success) {
          const apiStats = response.stats as any
          
          // Set stats with fallback values
          setStats({
            responders: apiStats?.staff?.total || 0,
            evacuationCenters: apiStats?.evacuation_centers?.total || 0,
            residentsCovered: apiStats?.users?.total || 0,
            totalIncidents: apiStats?.incidents?.total || 0,
          })
        } else {
          console.error('Stats API returned success: false', response)
          setStatsError("We're experiencing technical difficulties. Please try again later.")
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
        setStatsError("We're experiencing technical difficulties. Please try again later.")
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoadingTestimonials(true)
      setTestimonialsError(null)
      try {
        const response = await publicApi.getTestimonials(testimonialsLimit)
        if (response.success) {
          setTestimonials(response.testimonials)
        } else {
          setTestimonialsError("Failed to load testimonials")
        }
      } catch (error) {
        setTestimonialsError("Failed to load testimonials")
      } finally {
        setLoadingTestimonials(false)
      }
    }

    fetchTestimonials()
  }, [testimonialsLimit])

  // Hotline data for MDRRMO Padre Garcia, Batangas
  const hotlines = [
    {
      name: "MDRRMO",
      description: "Municipal Disaster Risk Reduction & Management Office",
      number: "(043) 311.2935 | 703.2646 | 0917.133.9605",
      icon: "ri-shield-cross-line",
      logo: "/images/partners/MDRRMO.png",
      priority: "high",
    },
    {
      name: "PNP",
      description: "Municipal Police Station",
      number: "(043) 724.7026 | 0915.254.2577",
      icon: "ri-police-car-line",
      logo: "/images/partners/pnp.jpg",
      priority: "high",
    },
    {
      name: "BFP",
      description: "Municipal Fire Station",
      number: "(043) 312.1102 | 0915.602.4435",
      icon: "ri-fire-line",
      logo: "/images/partners/bfp.jpg",
      priority: "high",
    },
    {
      name: "RHU I",
      description: "Municipal Health Office",
      number: "(043) 740.1338 | 0908.280.1497",
      icon: "ri-hospital-line",
      logo: "/images/partners/mho.png",
      priority: "medium",
    },
    {
      name: "MSWDO",
      description: "Municipal Social Welfare & Development Office",
      number: "(043) 312.1367",
      icon: "ri-community-line",
      logo: "/images/partners/msdw.jpg",
      priority: "medium",
    },
    {
      name: "MVM Hospital",
      description: "Rosario District Hospital",
      number: "(043) 312.0411",
      icon: "ri-hospital-fill",
      logo: "/images/partners/mvm.jpg",
      priority: "medium",
    },
    {
      name: "BATELEC II - AREA II",
      description: "Batangas II Electric Cooperative Inc.",
      number: "0917.550.0754 | 0998.548.6153",
      icon: "ri-flashlight-line",
      logo: "/images/partners/batelec.jpg",
      priority: "medium",
    },
    {
      name: "PRC",
      description: "Philippine Red Cross Batangas Chapter - Lipa City Branch",
      number: "(043) 740.0768 | 0917.142.9378",
      icon: "ri-first-aid-kit-line",
      logo: "/images/partners/prc.png",
      priority: "medium",
    },
  ]

  // Show loading screen while authentication is being checked
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <i className="ri-shield-check-line text-3xl md:text-4xl text-blue-600"></i>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Loading...</h2>
          <p className="text-gray-600">Please wait while we verify your access</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navbar isAuthenticated={isLoggedIn} userData={userData} />

      {/* Hero Section */}
      <div id="hero-section" className="relative overflow-hidden">
        {/* Hero Background with Image */}
        <div className="relative h-[500px] md:h-[700px] lg:h-[800px] bg-gradient-to-r from-blue-900/90 to-blue-800/80">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/rosario-hero.png')",
            }}
          ></div>
          {/* Enhanced Overlay with subtle pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-800/85"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-5xl">
              {isLoggedIn ? (
                // Authenticated user hero
                <div className="text-left">
                  {/* Logo/Icon */}
                  <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-white/95 backdrop-blur-sm rounded-2xl mb-6 md:mb-8 shadow-2xl border border-white/20">
                    <i className="ri-shield-check-line text-2xl md:text-3xl lg:text-4xl text-blue-600"></i>
                  </div>

                  {/* Main Title */}
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight text-balance">
                    Welcome back to
                    <span className="block text-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                      SoteROS Emergency Hub
                    </span>
                  </h1>

                  {/* Description */}
                  <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mb-8 md:mb-10 leading-relaxed text-pretty">
                    Your comprehensive emergency management dashboard is ready. Access real-time incident tracking,
                    evacuation routing, and safety protocols.
                  </p>
                </div>
              ) : (
                // Non-authenticated user hero
                <div className="text-left">
                  {/* MDRRMO Title */}
                  <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-4 leading-tight text-balance">
                    Municipal Disaster Risk Reduction
                    <span className="block text-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                      & Management Office
                    </span>
                  </h1>

                  {/* Location */}
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-semibold text-blue-200 mb-6 md:mb-8">
                    Rosario, Batangas
                  </h2>

                  {/* Description */}
                  <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-4xl mb-8 md:mb-12 leading-relaxed text-pretty">
                    Committed to protecting and serving our community through comprehensive disaster preparedness, rapid
                    emergency response, and proactive public safety management.
                  </p>

                  {/* Call to Action */}
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                    <a
                      href="#services"
                      onClick={(e) => {
                        e.preventDefault();
                        const servicesSection = document.getElementById('services');
                        if (servicesSection) {
                          servicesSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-blue-900 px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 shadow-2xl hover:shadow-yellow-500/25 hover:-translate-y-1 text-center"
                    >
                      Emergency Services
                    </a>
                    <button
                      onClick={() => setShowHotlineModal(true)}
                      className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 shadow-2xl hover:shadow-red-500/25 hover:-translate-y-1 text-center"
                    >
                      Emergency Hotline
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div id="services" className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6 text-balance">
              {isLoggedIn ? `Welcome back, ${userData?.firstName || "User"}!` : "Emergency Services"}
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 md:mb-16 max-w-4xl mx-auto text-pretty">
              {isLoggedIn
                ? "Access your emergency management tools"
                : `Comprehensive disaster risk reduction and emergency response services for Rosario, Batangas`}
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            {isLoggedIn ? (
              // Authenticated user content
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 md:mb-20">
                {userData?.userType === "staff" && (
                  <Link
                    to="/staff"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-purple-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-dashboard-3-line text-3xl md:text-4xl text-purple-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Staff Dashboard</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                      Access your staff dashboard with emergency management tools
                    </p>
                    <div className="flex items-center text-purple-600 group-hover:text-purple-700 mt-auto">
                      <span className="font-semibold text-lg">Go to Dashboard</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>
                )}

                <Link
                  to="/incident-report"
                  className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-red-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                    <i className="ri-error-warning-line text-3xl md:text-4xl text-red-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Report Incident</h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                    Submit emergency incidents and safety concerns with real-time tracking
                  </p>
                  <div className="flex items-center text-red-600 group-hover:text-red-700 mt-auto">
                    <span className="font-semibold text-lg">Report Now</span>
                    <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                  </div>
                </Link>

                <Link
                  to="/evacuation-center"
                  className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                    <i className="ri-building-2-line text-3xl md:text-4xl text-blue-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Evacuation Centers</h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                    Find nearby evacuation centers with real-time capacity and status updates
                  </p>
                  <div className="flex items-center text-blue-600 group-hover:text-blue-700 mt-auto">
                    <span className="font-semibold text-lg">View Centers</span>
                    <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                  </div>
                </Link>

                <Link
                  to="/safety-protocols"
                  className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-green-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                    <i className="ri-shield-check-line text-3xl md:text-4xl text-green-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Safety Protocols</h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                    Access comprehensive emergency procedures and safety guidelines
                  </p>
                  <div className="flex items-center text-green-600 group-hover:text-green-700 mt-auto">
                    <span className="font-semibold text-lg">View Protocols</span>
                    <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                  </div>
                </Link>

                <Link
                  to="/welfare-check"
                  className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-purple-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                    <i className="ri-heart-pulse-line text-3xl md:text-4xl text-purple-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Welfare Check</h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                    Report your status and location during emergencies for safety tracking
                  </p>
                  <div className="flex items-center text-purple-600 group-hover:text-purple-700 mt-auto">
                    <span className="font-semibold text-lg">Check In</span>
                    <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                  </div>
                </Link>
              </div>
            ) : (
              // Non-authenticated user content - MDRRMO Services
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 md:mb-20">
                  <Link
                    to="/evacuation-center"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-building-2-line text-3xl md:text-4xl text-blue-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Evacuation Centers</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                      View available evacuation centers in Rosario, Batangas with capacity and contact information
                    </p>
                    <div className="flex items-center text-blue-600 group-hover:text-blue-700 mt-auto">
                      <span className="font-semibold text-lg">View Centers</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>

                  <Link
                    to="/safety-protocols"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-green-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-shield-check-line text-3xl md:text-4xl text-green-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Safety Protocols</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                      Access emergency procedures and safety guidelines for various disaster scenarios
                    </p>
                    <div className="flex items-center text-green-600 group-hover:text-green-700 mt-auto">
                      <span className="font-semibold text-lg">View Protocols</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>

                  <Link
                    to="/incident-report"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-red-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-error-warning-line text-3xl md:text-4xl text-red-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Report Incident</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                      Report emergencies and safety concerns to MDRRMO Rosario
                    </p>
                    <div className="flex items-center text-red-600 group-hover:text-red-700 mt-auto">
                      <span className="font-semibold text-lg">Report Now</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>

                  <Link
                    to="/welfare-check"
                    className="bg-white border-2 border-gray-100 rounded-2xl p-6 md:p-8 hover:shadow-2xl hover:border-purple-200 transition-all duration-300 cursor-pointer group hover:-translate-y-2 flex flex-col h-full"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300">
                      <i className="ri-heart-pulse-line text-3xl md:text-4xl text-purple-600"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Welfare Check</h3>
                    <p className="text-gray-600 mb-6 md:mb-8 text-lg leading-relaxed flex-grow">
                      Report your status and location during emergencies for safety tracking
                    </p>
                    <div className="flex items-center text-purple-600 group-hover:text-purple-700 mt-auto">
                      <span className="font-semibold text-lg">Check In</span>
                      <i className="ri-arrow-right-line ml-3 group-hover:translate-x-2 transition-transform duration-300"></i>
                    </div>
                  </Link>
                </div>

                {/* Authentication CTA */}
                <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-10 md:p-12 shadow-xl">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <i className="ri-user-add-line text-3xl text-blue-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">
                    Join Our Emergency Response Network
                  </h3>
                  <p className="text-lg text-gray-600 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                    Sign up to access advanced features, submit reports, and receive real-time emergency alerts for
                    Rosario, Batangas
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
                    <Link
                      to="/auth/signup"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 md:px-10 rounded-xl transition-all duration-300 font-semibold shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1 text-lg"
                    >
                      Create Account
                    </Link>
                    <Link
                      to="/auth/login"
                      className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 md:px-10 rounded-xl transition-all duration-300 font-semibold hover:-translate-y-1 text-lg"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              {
                icon: "ri-timer-flash-line",
                title: "Rapid Response",
                desc: "Coordinated, time-critical incident handling",
                color: "from-orange-100 to-orange-200",
                iconColor: "text-orange-600",
              },
              {
                icon: "ri-hotel-line",
                title: "Evacuation Centers",
                desc: "Nearby designated safe shelters with capacity info",
                color: "from-blue-100 to-blue-200",
                iconColor: "text-blue-600",
              },
              {
                icon: "ri-shield-star-line",
                title: "Safety Protocols",
                desc: "Up-to-date, practical safety guidance",
                color: "from-green-100 to-green-200",
                iconColor: "text-green-600",
              },
              {
                icon: "ri-bar-chart-2-line",
                title: "Live Insights",
                desc: "Data-driven decisions and monitoring",
                color: "from-purple-100 to-purple-200",
                iconColor: "text-purple-600",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm border-2 border-gray-100 rounded-2xl p-8 md:p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
              >
                <div
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${f.color} ${f.iconColor} flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-all duration-300`}
                >
                  <i className={`${f.icon} text-2xl md:text-3xl`}></i>
                </div>
                <h4 className="font-bold text-xl md:text-2xl text-gray-900 mb-3 md:mb-4">{f.title}</h4>
                <p className="text-gray-600 text-lg leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="bg-gradient-to-br from-slate-50 to-blue-50 py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          {loadingStats ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-xl p-6 md:p-8 animate-pulse"
                >
                  <div className="text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    </div>

                    {/* Number */}
                    <div className="h-10 bg-gray-200 rounded w-20 mx-auto mb-2"></div>

                    {/* Label */}
                    <div className="h-5 bg-gray-200 rounded w-24 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : statsError ? (
            <div className="text-center bg-white rounded-3xl shadow-xl border-2 border-gray-100 p-12 md:p-16">
              <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-error-warning-line text-3xl text-red-500"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Statistics</h3>
              <p className="text-gray-600 text-lg">
                {statsError}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[
                {
                  label: "Responders",
                  value: `${stats.responders}+`,
                  icon: "ri-user-star-line",
                  color: "text-blue-600",
                  bgColor: "bg-blue-50",
                  iconBg: "bg-blue-100"
                },
                {
                  label: "Evacuation Centers",
                  value: stats.evacuationCenters.toString(),
                  icon: "ri-building-2-line",
                  color: "text-green-600",
                  bgColor: "bg-green-50",
                  iconBg: "bg-green-100"
                },
                {
                  label: "Residents Covered",
                  value: `${stats.residentsCovered}+`,
                  icon: "ri-shield-user-line",
                  color: "text-purple-600",
                  bgColor: "bg-purple-50",
                  iconBg: "bg-purple-100"
                },
                {
                  label: "Total Incidents",
                  value: stats.totalIncidents.toString(),
                  icon: "ri-alert-line",
                  color: "text-red-600",
                  bgColor: "bg-red-50",
                  iconBg: "bg-red-100"
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`${s.bgColor} rounded-xl p-6 md:p-8 hover:shadow-lg transition-all duration-300 group`}
                >
                  <div className="text-center">
                    {/* Icon */}
                    <div className={`w-16 h-16 ${s.iconBg} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <i className={`${s.icon} text-2xl ${s.color}`}></i>
                    </div>

                    {/* Number */}
                    <div className={`text-3xl md:text-4xl font-bold ${s.color} mb-2`}>
                      <AnimatedCounter
                        value={parseInt(s.value.replace(/[^\d]/g, ''))}
                        isVisible={true}
                        duration={2000}
                        suffix={s.value.includes('+') ? '+' : ''}
                        className="inline-block"
                      />
                    </div>

                    {/* Label */}
                    <div className="text-gray-700 font-medium text-lg">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

      
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="text-center mb-12 md:mb-16">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Community Voices</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Real feedback from residents and responders</p>
          </div>

          {loadingTestimonials ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-8 md:p-10 shadow-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  </div>
                  <div className="mt-6 h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : testimonialsError ? (
            <div className="text-center bg-white rounded-2xl border-2 border-gray-100 p-12 shadow-lg">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-error-warning-line text-red-500 text-2xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Unable to Load Testimonials</h4>
              <p className="text-gray-600">We're experiencing technical difficulties. Please try again later.</p>
            </div>
          ) : testimonials.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl border-2 border-gray-100 p-8 md:p-10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-center mb-4">
                      <i className="ri-double-quotes-l text-2xl md:text-3xl text-blue-600"></i>
                      <div className="ml-auto flex">
                        {[...Array(5)].map((_, i) => (
                          <i
                            key={i}
                            className={`ri-star-${i < t.rating ? "fill" : "line"} text-yellow-400 text-lg`}
                          ></i>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-lg mb-6 leading-relaxed italic">{t.quote}</p>
                    <div className="text-lg font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{t.type === "Staff" ? t.department : t.type}</div>
                  </div>
                ))}
              </div>
              {testimonials.length > 0 && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => {
                      if (showAllTestimonials) {
                        setTestimonialsLimit(3)
                      } else {
                        setTestimonialsLimit(1000) // large number to show all
                      }
                      setShowAllTestimonials(!showAllTestimonials)
                    }}
                    className="inline-flex items-center text-blue-600 px-8 py-4 font-semibold text-lg hover:bg-blue-50 rounded-xl transition-all duration-300"
                  >
                    {showAllTestimonials ? (
                      <>
                        Back to Less
                        <i className="ri-arrow-up-s-line ml-2"></i>
                      </>
                    ) : (
                      <>
                        See More
                        <i className="ri-arrow-down-s-line ml-2"></i>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center bg-white rounded-2xl border-2 border-gray-100 p-12 shadow-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-chat-voice-line text-blue-500 text-2xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">No Testimonials Yet</h4>
              <p className="text-gray-600">
                Testimonials will appear here once community members share their feedback.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Partners */}
      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="text-center text-gray-600 mb-8 md:mb-12 font-semibold text-lg">In partnership with</div>
          <div className="hidden sm:block">
            <Carousel
              items={[
                { name: "LGU", image: "/images/partners/lgu-pt.png", alt: "Local Government Unit" },
                { name: "MDRRMO", image: "/images/partners/MDRRMO.png", alt: "MDRRMO  " },
                { name: "BFP", image: "/images/partners/bfp.jpg", alt: "Bureau of Fire Protection" },
                { name: "PNP", image: "/images/partners/pnp.jpg", alt: "Philippine National Police" },
                { name: "SOTEROS", image: "/images/soterblue.png", alt: "Philippine National Police" },

                { name: "RedCross", image: "/images/partners/prc.png", alt: "Philippine Red Cross" },
                { name: "MHo", image: "/images/partners/mho.png", alt: "MHO" },
                { name: "MSWDO", image: "/images/partners/msdw.jpg", alt: "MSWDO" },
                { name: "MVM Hospital", image: "/images/partners/mvm.jpg", alt: "MVM Hospital" },
                { name: "BATELEC II - AREA II", image: "/images/partners/batelec.jpg", alt: "BATELEC II - AREA II" },
              ]}
              itemsPerView={6}
              autoPlay={true}
              autoPlayInterval={3000}
              showDots={true}
              showArrows={false}
              className="opacity-90"
              itemClassName="px-2"
              renderItem={(partner, index) => (
                <div
                  key={index}
                  className="h-32 w-32 md:h-40 md:w-40 lg:h-44 lg:w-44 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto overflow-hidden border-2 border-gray-200 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <img
                    src={partner.image || "/placeholder.svg"}
                    alt={partner.alt}
                    className="h-full w-full object-contain p-4"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement
                      img.style.display = "none"
                      const textFallback = img.nextElementSibling as HTMLElement
                      if (textFallback) {
                        textFallback.style.display = "flex"
                      }
                    }}
                  />
                  <div className="hidden items-center justify-center text-gray-500 font-semibold text-center">
                    {partner.name}
                  </div>
                </div>
              )}
            />
          </div>
          
          {/* Mobile carousel with fewer items per view */}
          <div className="block sm:hidden">
            <Carousel
              items={[
                { name: "LGU", image: "/images/partners/lgu-pt.png", alt: "Local Government Unit" },
                { name: "MDRRMO", image: "/images/partners/MDRRMO.png", alt: "MDRRMO  " },
                { name: "BFP", image: "/images/partners/bfp.jpg", alt: "Bureau of Fire Protection" },
                { name: "PNP", image: "/images/partners/pnp.jpg", alt: "Philippine National Police" },
                { name: "RedCross", image: "/images/partners/prc.png", alt: "Philippine Red Cross" },
                { name: "MHo", image: "/images/partners/mho.png", alt: "MHO" },
                { name: "MSWDO", image: "/images/partners/msdw.jpg", alt: "MSWDO" },
                { name: "MVM Hospital", image: "/images/partners/mvm.jpg", alt: "MVM Hospital" },
                { name: "BATELEC II - AREA II", image: "/images/partners/batelec.jpg", alt: "BATELEC II - AREA II" },
              ]}
              itemsPerView={2}
              autoPlay={true}
              autoPlayInterval={3000}
              showDots={true}
              showArrows={false}
              className="opacity-90"
              itemClassName="px-2"
              renderItem={(partner, index) => (
                <div
                  key={index}
                  className="h-32 w-32 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto overflow-hidden border-2 border-gray-200 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <img
                    src={partner.image || "/placeholder.svg"}
                    alt={partner.alt}
                    className="h-full w-full object-contain p-4"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement
                      img.style.display = "none"
                      const textFallback = img.nextElementSibling as HTMLElement
                      if (textFallback) {
                        textFallback.style.display = "flex"
                      }
                    }}
                  />
                  <div className="hidden items-center justify-center text-gray-500 font-semibold text-center">
                    {partner.name}
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq-section" className="bg-gradient-to-br from-slate-50 via-white to-blue-50 py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-start">
            {/* Left Column - Support & Description */}
            <div className="space-y-8">
              <div className="relative">
                {/* Background decoration */}
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-50"></div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full opacity-50"></div>
                
                <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-10 shadow-xl border border-white/20">
                  <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
                    <i className="ri-customer-service-2-line text-blue-600 mr-2"></i>
                    <span className="text-blue-700 font-semibold text-sm">Support</span>
                  </div>
                  
                  <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Frequently Asked
                    <span className="block text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                      Questions
                    </span>
                  </h3>
                  
                  <p className="text-lg text-gray-600 leading-relaxed mb-8">
                    Everything you need to know about emergency services and disaster preparedness. 
                    Get instant answers to common questions about our emergency management platform.
                  </p>
                  
                  
                </div>
              </div>
            </div>

            {/* Right Column - FAQ Items */}
            <div className="space-y-4">
              {[
                {
                  q: "How do I report an emergency?",
                  a: "Click Report Incident, describe the situation, and submit your location. Our team will respond immediately to your emergency report.",
                  icon: "ri-error-warning-line",
                  color: "from-red-500 to-pink-500"
                },
                {
                  q: "Where can I find evacuation centers?",
                  a: "Go to Evacuation Centers to see locations, capacity, and contact info. All centers are updated in real-time with current availability.",
                  icon: "ri-building-2-line",
                  color: "from-blue-500 to-cyan-500"
                },
                {
                  q: "Do I need an account?",
                  a: "Browsing is open; creating an account enables alerts and faster reporting. You can access most features without registration.",
                  icon: "ri-user-line",
                  color: "from-green-500 to-emerald-500"
                },
                {
                  q: "What should I do during a typhoon?",
                  a: "Stay indoors, avoid flooded areas, monitor weather updates, and follow evacuation orders if issued. Keep emergency supplies ready.",
                  icon: "ri-typhoon-line",
                  color: "from-orange-500 to-red-500"
                },
                {
                  q: "How can I check if my family is safe?",
                  a: "Use the Welfare Check feature to report your status and location during emergencies. This helps us track community safety.",
                  icon: "ri-heart-pulse-line",
                  color: "from-purple-500 to-pink-500"
                },
                {
                  q: "What emergency numbers should I call?",
                  a: "MDRRMO: (043) 311.2935, PNP: (043) 724.7026, BFP: (043) 312.1102. Click Emergency Hotline for full list of contacts.",
                  icon: "ri-phone-line",
                  color: "from-indigo-500 to-blue-500"
                },
                {
                  q: "How do I prepare for disasters?",
                  a: "Create an emergency kit, know evacuation routes, stay informed through our alerts, and follow safety protocols provided on our platform.",
                  icon: "ri-shield-star-line",
                  color: "from-teal-500 to-green-500"
                },
                {
                  q: "Is this service available 24/7?",
                  a: "Yes, our emergency reporting system is available 24/7. Emergency hotlines are also monitored around the clock for immediate response.",
                  icon: "ri-time-line",
                  color: "from-amber-500 to-orange-500"
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50/50 transition-colors duration-200"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    aria-expanded={openFaq === idx}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <i className={`${item.icon} text-white text-lg`}></i>
                      </div>
                      <span className="font-semibold text-gray-900 text-lg pr-4 leading-tight">{item.q}</span>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 group-hover:scale-110">
                      <i
                        className={`ri-${openFaq === idx ? "subtract" : "add"}-line text-gray-600 text-lg transition-transform duration-200`}
                      ></i>
                    </div>
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-6">
                      <div className="ml-16 border-l-2 border-gray-100 pl-6">
                        <p className="text-gray-600 text-base leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      

      {/* Hotline Modal */}
      {showHotlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-t-xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <img
                      src="/images/partners/MDRRMO.png"
                      alt="MDRRMO Logo"
                      className="w-8 h-8 object-contain rounded-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Emergency Hotlines</h3>
                    <p className="text-red-100 text-xs">MDRRMO Rosario, Batangas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHotlineModal(false)}
                  className="text-white hover:text-red-100 transition-colors p-2 hover:bg-white/20 rounded-lg"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
              {/* Priority Section - High Priority */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <i className="ri-error-warning-line text-red-600 mr-2"></i>
                  High Priority Contacts
                </h4>
                <div className="space-y-3">
                  {hotlines
                    .filter((h) => h.priority === "high")
                    .map((hotline, index) => (
                      <div
                        key={index}
                        className="border border-red-200 bg-red-50 rounded-lg p-3 transition-all hover:shadow-md hover:border-red-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                              <img
                                src={hotline.logo || "/placeholder.svg"}
                                alt={`${hotline.name} Logo`}
                                className="w-8 h-8 object-contain rounded-full"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-semibold text-gray-900 text-sm mb-1 truncate">{hotline.name}</h5>
                              <p className="text-xs text-gray-600 mb-2">{hotline.description}</p>
                              <p className="text-base font-bold text-red-600">{hotline.number}</p>
                            </div>
                          </div>
                          <a
                            href={`tel:${hotline.number.replace(/\s/g, "")}`}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold transition-all text-xs flex items-center ml-2 flex-shrink-0"
                          >
                            <i className="ri-phone-line mr-1"></i>
                            Call
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Priority Section - Medium Priority */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <i className="ri-information-line text-blue-600 mr-2"></i>
                  Support Contacts
                </h4>
                <div className="space-y-3">
                  {hotlines
                    .filter((h) => h.priority === "medium")
                    .map((hotline, index) => (
                      <div
                        key={index}
                        className="border border-blue-200 bg-blue-50 rounded-lg p-3 transition-all hover:shadow-md hover:border-blue-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                              <img
                                src={hotline.logo || "/placeholder.svg"}
                                alt={`${hotline.name} Logo`}
                                className="w-8 h-8 object-contain rounded-full"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-semibold text-gray-900 text-sm mb-1 truncate">{hotline.name}</h5>
                              <p className="text-xs text-gray-600 mb-2">{hotline.description}</p>
                              <p className="text-base font-bold text-blue-600">{hotline.number}</p>
                            </div>
                          </div>
                          <a
                            href={`tel:${hotline.number.replace(/\s/g, "")}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold transition-all text-xs flex items-center ml-2 flex-shrink-0"
                          >
                            <i className="ri-phone-line mr-1"></i>
                            Call
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Emergency Guidelines */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <i className="ri-information-line text-yellow-600 text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-800 text-sm mb-2">Emergency Guidelines</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li className="flex items-start">
                        <i className="ri-check-line text-yellow-600 mr-2 mt-0.5 flex-shrink-0"></i>
                        Stay calm and provide clear information
                      </li>
                      <li className="flex items-start">
                        <i className="ri-check-line text-yellow-600 mr-2 mt-0.5 flex-shrink-0"></i>
                        Give your exact location and landmarks
                      </li>
                      <li className="flex items-start">
                        <i className="ri-check-line text-yellow-600 mr-2 mt-0.5 flex-shrink-0"></i>
                        Follow emergency responder instructions
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 rounded-b-xl border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-600">
                  <i className="ri-time-line mr-2 text-blue-500 text-sm"></i>
                  <span className="text-xs font-medium">24/7 Available</span>
                </div>
                <button
                  onClick={() => setShowHotlineModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-semibold text-sm shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        {/* Main Footer Content */}
        <div className="py-16 md:py-20">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {/* Organization Info */}
              <div className="lg:col-span-2">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12  flex items-center justify-center mr-4">
              <img src="/images/partners/MDRRMO.png" alt="Logo" className="w-40 h-50 rounded-lg shadow-md object-contain" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">MDRRMO Rosario</h3>
                    <p className="text-gray-400 text-sm">Batangas Province</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
                  Municipal Disaster Risk Reduction & Management Office committed to protecting and serving our
                  community through comprehensive disaster preparedness and emergency response.
                </p>
                <div className="flex space-x-4">
                  <a
                    href="https://www.facebook.com/RosarioMDRRMO"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                  >
                    <i className="ri-facebook-fill text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                  >
                    <i className="ri-twitter-fill text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                  >
                    <i className="ri-instagram-line text-lg"></i>
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      to="/"
                      onClick={() => {
                        console.log("Home link clicked, navigating to /");
                        // Ensure we scroll to top when navigating
                        setTimeout(() => {
                          window.scrollTo(0, 0);
                        }, 100);
                      }}
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/evacuation-center"
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      Evacuation Centers
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/safety-protocols"
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      Safety Protocols
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/incident-report"
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      Report Incident
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/about"
                      onClick={() => {
                        console.log("About link clicked, navigating to /about");
                        // Ensure we scroll to top when navigating
                        setTimeout(() => {
                          window.scrollTo(0, 0);
                        }, 100);
                      }}
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      About
                    </Link>
                  </li>
                
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-lg font-semibold mb-6">Contact Information</h4>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <i className="ri-map-pin-line text-blue-400 mt-1 mr-3"></i>
                    <div>
                      <p className="text-gray-300 text-sm">Municipal Hall, Rosario</p>
                      <p className="text-gray-300 text-sm">Batangas, Philippines</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-phone-line text-blue-400 mr-3"></i>
                    <p className="text-gray-300 text-sm">(043) 311.2935</p>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-mail-line text-blue-400 mr-3"></i>
                    <p className="text-gray-300 text-sm">mdrrmo@rosario.gov.ph</p>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowHotlineModal(true)}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-300 text-sm"
                    >
                      Emergency Hotlines
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-700 py-8">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2024 MDRRMO Rosario, Batangas. All rights reserved.
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <button 
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={() => setShowTermsModal(true)}
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  Terms of Service
                </button>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm">
                Made with <span className="text-red-500">❤️</span> in the Philippines
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PrivacyPolicyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
      <TermsOfServiceModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
    </div>
  )
}
