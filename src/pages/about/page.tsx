import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getAuthState, type UserData } from '../../utils/auth';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';
import TermsOfServiceModal from '../../components/TermsOfServiceModal';

const AboutPage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOfServiceOpen, setIsTermsOfServiceOpen] = useState(false);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    const authState = getAuthState();
    
    // Redirect admin/staff users to their respective dashboards
    if (authState.isAuthenticated) {
      if (authState.userType === "admin") {
        window.location.href = "/admin";
        return;
      } else if (authState.userType === "staff") {
        window.location.href = "/staff";
        return;
      }
    }
    
    // Only show user-specific content for user type
    const isUserAuth = authState.isAuthenticated && authState.userType === "user";
    setIsAuthenticated(isUserAuth);
    setUserData(isUserAuth ? authState.userData : null);

    // Listen for storage changes to update authentication state
    const handleStorageChange = () => {
      const newAuthState = getAuthState();
      
      // Redirect admin/staff users to their respective dashboards
      if (newAuthState.isAuthenticated) {
        if (newAuthState.userType === "admin") {
          window.location.href = "/admin";
          return;
        } else if (newAuthState.userType === "staff") {
          window.location.href = "/staff";
          return;
        }
      }
      
      // Only show user-specific content for user type
      const isNewUserAuth = newAuthState.isAuthenticated && newAuthState.userType === "user";
      setIsAuthenticated(isNewUserAuth);
      setUserData(isNewUserAuth ? newAuthState.userData : null);
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authStateChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authStateChanged", handleStorageChange);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navbar isAuthenticated={isAuthenticated} userData={userData} />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative h-[400px] md:h-[500px] lg:h-[600px] bg-gradient-to-r from-blue-900/90 to-blue-800/80">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/rosario-hero.png')",
            }}
          ></div>
          {/* Enhanced Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-800/85"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-5xl">
              <div className="text-left">
                {/* Logo/Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-white/95 backdrop-blur-sm rounded-2xl mb-6 md:mb-8 shadow-2xl border border-white/20">
                  <i className="ri-information-line text-2xl md:text-3xl lg:text-4xl text-blue-600"></i>
                </div>

                {/* Main Title */}
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight text-balance">
                  About
                  <span className="block text-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                    MDRRMO Rosario
                  </span>
                </h1>

                {/* Description */}
                <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mb-8 md:mb-10 leading-relaxed text-pretty">
                  Learn about our mission, vision, and commitment to building a disaster-resilient community in Rosario, Batangas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Content */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 text-balance">
              About MDRRMO Rosario
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto text-pretty">
              Committed to building a resilient and disaster-ready community in Rosario, Batangas
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Mission & Vision */}
            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border-2 border-blue-100">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-4">
                    <i className="ri-eye-line text-2xl text-blue-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Our Vision</h3>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  A disaster-resilient and safe community where every resident is prepared, protected, and empowered to face any emergency with confidence and unity.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border-2 border-green-100">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mr-4">
                    <i className="ri-target-line text-2xl text-green-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Our Mission</h3>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  To provide comprehensive disaster risk reduction and management services through proactive planning, rapid response, and community engagement, ensuring the safety and well-being of all residents in Rosario, Batangas.
                </p>
              </div>
            </div>

            {/* Key Information */}
            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border-2 border-purple-100">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mr-4">
                    <i className="ri-information-line text-2xl text-purple-600"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Key Information</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <i className="ri-map-pin-line text-blue-500 mt-1 mr-3"></i>
                    <div>
                      <p className="font-semibold text-gray-900">Location</p>
                      <p className="text-gray-600">Municipal Hall, Rosario, Batangas, Philippines</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <i className="ri-team-line text-blue-500 mt-1 mr-3"></i>
                    <div>
                      <p className="font-semibold text-gray-900">Coverage</p>
                      <p className="text-gray-600">All 48 barangays of Rosario, Batangas</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <i className="ri-time-line text-blue-500 mt-1 mr-3"></i>
                    <div>
                      <p className="font-semibold text-gray-900">Service Hours</p>
                      <p className="text-gray-600">24/7 Emergency Response</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-10 text-white">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    <i className="ri-shield-star-line text-2xl text-white"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">Our Commitment</h3>
                </div>
                <p className="text-blue-100 text-lg leading-relaxed mb-6">
                  We are dedicated to ensuring the safety and security of every resident through continuous improvement of our emergency response capabilities, community education, and disaster preparedness programs.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">Disaster Preparedness</span>
                  <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">Emergency Response</span>
                  <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">Community Safety</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Functions */}
          <div className="mt-16 md:mt-20">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
              Our Core Functions
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[
                {
                  icon: "ri-shield-check-line",
                  title: "Disaster Prevention & Mitigation",
                  description: "Proactive measures to reduce disaster risks and vulnerabilities",
                  color: "from-red-100 to-red-200",
                  iconColor: "text-red-600"
                },
                {
                  icon: "ri-alarm-warning-line",
                  title: "Disaster Preparedness",
                  description: "Community education and capacity building for emergency readiness",
                  color: "from-orange-100 to-orange-200",
                  iconColor: "text-orange-600"
                },
                {
                  icon: "ri-flashlight-line",
                  title: "Disaster Response",
                  description: "Rapid and coordinated emergency response during disasters",
                  color: "from-yellow-100 to-yellow-200",
                  iconColor: "text-yellow-600"
                },
                {
                  icon: "ri-refresh-line",
                  title: "Disaster Recovery",
                  description: "Rehabilitation and reconstruction efforts post-disaster",
                  color: "from-green-100 to-green-200",
                  iconColor: "text-green-600"
                }
              ].map((function_item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-2 border-gray-100"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${function_item.color} rounded-2xl flex items-center justify-center mb-6`}>
                    <i className={`${function_item.icon} text-2xl ${function_item.iconColor}`}></i>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4">{function_item.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{function_item.description}</p>
                </div>
              ))}
            </div>
          </div>


          {/* Contact Information */}
          <div className="mt-16 md:mt-20">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border-2 border-gray-100">
              <div className="text-center mb-12">
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Get in Touch</h3>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  We're here to serve you. Reach out to us for any emergency or non-emergency concerns.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="ri-phone-line text-blue-600 text-2xl"></i>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Emergency Hotline</h4>
                  <p className="text-gray-600 mb-2">(043) 311.2935</p>
                  <p className="text-sm text-gray-500">Available 24/7</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="ri-mail-line text-green-600 text-2xl"></i>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Email</h4>
                  <p className="text-gray-600 mb-2">rosariobatangasmdrrmo@gmail.com</p>
                  <p className="text-sm text-gray-500">General inquiries</p>
                </div>
                
                <div className="text-center md:col-span-2 lg:col-span-1">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="ri-map-pin-line text-purple-600 text-2xl"></i>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Office Location</h4>
                  <p className="text-gray-600 mb-2">Municipal Hall, Rosario</p>
                  <p className="text-sm text-gray-500">Batangas, Philippines</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Development Team Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 text-balance">
              Development Team
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto text-pretty">
              The talented developers behind this emergency management platform
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {/* Development Team Members */}
            {[
              {
                name: "Sharmaine Abrenica",
                role: "Project Manager",
                image: "/images/dev/shar.jpg",
               
              },
              {
                name: "Clark Alisuag",
                role: "Quality Assurance Tester",

                image: "/images/dev/clark.jpg",
              
              },
              {
                name: "Keith Andrei Ciruelas",
                role: "Full-Stack Developer",

                image: "/images/dev/KIT.jpg",
                
              }
            ].map((dev, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-2 border-gray-100 group"
              >
                {/* Profile Image */}
                <div className="relative mb-6">
                  <div className="w-24 h-24 md:w-28 md:h-28 mx-auto bg-gradient-to-br from-indigo-100 to-purple-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={dev.image || "/images/dev/placeholder.jpg"}
                      alt={dev.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />
                    <div className="hidden w-full h-full bg-gradient-to-br from-indigo-100 to-purple-200 items-center justify-center text-indigo-600 font-bold text-2xl">
                      {dev.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                </div>

                {/* Developer Info */}
                <div className="text-center mb-6">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{dev.name}</h3>
                  <p className="text-indigo-600 font-semibold text-lg mb-1">{dev.role}</p>
                </div>


   
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Call to Action */}
      <section className="relative bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 py-20 md:py-28 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative container mx-auto px-4 lg:px-8 max-w-5xl text-center">
          {/* Icon/Decoration */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-8 border border-white/20">
            <i className="ri-team-line text-4xl text-white"></i>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance">
            Ready to Get Involved?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed text-pretty">
            Join our community of prepared citizens and help us build a safer, more resilient Rosario.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link
              to="/incident-report"
              className="group bg-yellow-500 hover:bg-yellow-400 text-blue-900 px-10 py-5 rounded-2xl font-bold text-lg md:text-xl transition-all duration-300 shadow-2xl hover:shadow-yellow-500/50 hover:-translate-y-2 flex items-center gap-3 min-w-[250px] justify-center"
            >
              <i className="ri-alarm-warning-line text-2xl group-hover:scale-110 transition-transform duration-300"></i>
              Report an Incident
            </Link>
            <Link
              to="/evacuation-center"
              className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-10 py-5 rounded-2xl font-bold text-lg md:text-xl transition-all duration-300 border-2 border-white/30 hover:border-white/50 hover:-translate-y-2 flex items-center gap-3 min-w-[250px] justify-center shadow-xl"
            >
              <i className="ri-building-line text-2xl group-hover:scale-110 transition-transform duration-300"></i>
              Find Evacuation Centers
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="py-16 md:py-20">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {/* Organization Info */}
              <div className="lg:col-span-2">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 flex items-center justify-center mr-4">
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
                    <p className="text-gray-300 text-sm">rosariomdrrmo.batangas@gmail.com</p>
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
                © 2025 SoteROS. All rights reserved.
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <button
                  onClick={() => setIsPrivacyPolicyOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => setIsTermsOfServiceOpen(true)}
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
        isOpen={isPrivacyPolicyOpen}
        onClose={() => setIsPrivacyPolicyOpen(false)}
      />
      <TermsOfServiceModal
        isOpen={isTermsOfServiceOpen}
        onClose={() => setIsTermsOfServiceOpen(false)}
      />
    </div>
  );
};

export default AboutPage;
