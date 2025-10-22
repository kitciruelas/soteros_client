
import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { getAuthState } from "../../../utils/auth"
import { staffManagementApi, incidentsApi, teamsApi } from "../../../utils/api"
import Input from "../../../components/base/Input"
import Select from "../../../components/base/Select"
import Button from "../../../components/base/Button"
import Modal from "../../../components/base/Modal"
import Avatar from "../../../components/base/Avatar"
import LogoutModal from "../../../components/LogoutModal"
import PhoneInput, { formatPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// Philippine mobile number validation function
const validatePhilippineMobile = (value: string): boolean => {
  if (!value) return false;

  // Handle E.164 format from PhoneInput (+639XXXXXXXXX)
  if (value.startsWith('+63')) {
    const cleanNumber = value.replace(/\D/g, '');
    return /^639\d{9}$/.test(cleanNumber); // 639 followed by 9 digits
  }

  // Handle local format (09XXXXXXXXX)
  if (value.startsWith('09')) {
    const cleanNumber = value.replace(/\D/g, '');
    return /^09\d{9}$/.test(cleanNumber); // 09 followed by 9 digits
  }

  // Handle international format without + (639XXXXXXXXX)
  const cleanNumber = value.replace(/\D/g, '');
  if (cleanNumber.startsWith('639') && cleanNumber.length === 12) {
    return /^639\d{9}$/.test(cleanNumber);
  }

  // Handle local format without spaces/dashes
  if (cleanNumber.startsWith('9') && cleanNumber.length === 10) {
    return /^9\d{9}$/.test(cleanNumber);
  }

  return false;
};

interface StaffProfile {
  id: number
  name: string
  email: string
  phone: string
  position: string
  department: string
  status: number
  availability: string
  last_login: string
  created_at: string
  updated_at: string
  team_id?: number
  team_name?: string
}

interface Team {
  id: number
  name: string
  description: string
  member_count: number
}

interface IncidentStats {
  totalAssigned: number
  pending: number
  inProgress: number
  resolved: number
  resolvedToday: number
}

const StaffProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [stats, setStats] = useState<IncidentStats>({
    totalAssigned: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    resolvedToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    availability: "",
  })
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Additional state variables
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const authState = getAuthState()
  const currentStaffId = authState.userData?.id || authState.userData?.staff_id || authState.userData?.user_id

  const calculateProfileCompletion = (profile: StaffProfile) => {
    const fields = [
      profile.name,
      profile.email,
      profile.phone,
      profile.position,
      profile.department,
      profile.availability,
    ]
    const filledFields = fields.filter((field) => field && field.trim() !== "").length
    return Math.round((filledFields / fields.length) * 100)
  }

  useEffect(() => {
    if (profile && isEditing) {
      const hasChanges =
        editForm.name !== profile.name ||
        editForm.email !== profile.email ||
        editForm.phone !== profile.phone ||
        editForm.position !== profile.position ||
        editForm.department !== profile.department ||
        editForm.availability !== profile.availability
      setHasUnsavedChanges(hasChanges)
    }
  }, [editForm, profile, isEditing])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", handleBeforeUnload)
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (currentStaffId) {
      fetchProfileData()
    }
  }, [currentStaffId])

  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessAlert])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch staff profile
      const profileResponse = await staffManagementApi.getStaffById(Number(currentStaffId))
      if (profileResponse.success && profileResponse.staff) {
        // Ensure availability has a default value
        const profileWithDefaults = {
          ...profileResponse.staff,
          availability: (profileResponse.staff.availability && profileResponse.staff.availability.trim() !== "") ? profileResponse.staff.availability : "available"
        }
        setProfile(profileWithDefaults)
        setProfileCompletion(calculateProfileCompletion(profileWithDefaults))

        // Fetch team details if staff is assigned to a team
        if (profileResponse.staff.team_id) {
          try {
            const teamResponse = await teamsApi.getTeamById(profileResponse.staff.team_id)
            if (teamResponse.success && teamResponse.team) {
              setTeam(teamResponse.team)
            }
          } catch (teamError) {
            console.error("Error fetching team details:", teamError)
          }
        }

        // Fetch incident statistics
        await fetchIncidentStats()
      } else {
        setError("Failed to load profile data")
      }
    } catch (error) {
      console.error("Error fetching profile data:", error)
      setError("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const fetchIncidentStats = async () => {
    try {
      const response = await incidentsApi.getStaffIncidents(Number(currentStaffId))
      if (response.success && response.incidents) {
        const incidents = response.incidents
        const today = new Date().toDateString()

        setStats({
          totalAssigned: incidents.length,
          pending: incidents.filter((i) => i.status === "pending").length,
          inProgress: incidents.filter((i) => i.status === "in_progress").length,
          resolved: incidents.filter((i) => i.status === "resolved" || i.status === "closed").length,
          resolvedToday: incidents.filter(
            (i) =>
              (i.status === "resolved" || i.status === "closed") && new Date(i.date_reported).toDateString() === today,
          ).length,
        })
      }
    } catch (error) {
      console.error("Error fetching incident stats:", error)
    }
  }

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "bg-green-100 text-green-800 border-green-200"
      case 0:
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200"
      case "busy":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "off-duty":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getAvailabilityIcon = (availability: string) => {
    switch (availability) {
      case "available":
        return "ri-check-circle-line"
      case "busy":
        return "ri-time-line"
      case "off-duty":
        return "ri-moon-line"
      default:
        return "ri-question-line"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleEdit = () => {
    setEditForm({
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      position: profile?.position || "",
      department: profile?.department || "",
      availability: profile?.availability || "available",
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        return
      }
    }
    setIsEditing(false)
    setHasUnsavedChanges(false)
    // Reset form to original profile values
    setEditForm({
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      position: profile?.position || "",
      department: profile?.department || "",
      availability: profile?.availability || "available",
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      if (!editForm.name.trim()) {
        setError("Name is required")
        return
      }
      if (!editForm.email.trim()) {
        setError("Email is required")
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
        setError("Please enter a valid email address")
        return
      }
      if (!validatePhilippineMobile(editForm.phone)) {
        setError("Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)")
        return
      }

      const updateData = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        position: editForm.position.trim(),
        department: editForm.department.trim(),
      }

      const response = await staffManagementApi.updateStaff(Number(currentStaffId), updateData)

      if (!response.success) {
        setError("Failed to update profile")
        return
      }

      if (editForm.availability !== profile?.availability) {
        console.log('Updating availability:', {
          current: profile?.availability,
          new: editForm.availability,
          staffId: currentStaffId
        });

        const availabilityResponse = await staffManagementApi.updateStaffAvailability(
          Number(currentStaffId),
          editForm.availability as "available" | "busy" | "off-duty",
        )

        console.log('Availability update response:', availabilityResponse);

        if (!availabilityResponse.success) {
          setError("Profile updated but failed to update availability status")
          return
        }
      }

      const updatedProfile = {
        ...profile!,
        ...updateData,
        availability: editForm.availability,
      }
      setProfile(updatedProfile)
      setProfileCompletion(calculateProfileCompletion(updatedProfile))
      setIsEditing(false)
      setHasUnsavedChanges(false)

      setSuccessMessage("Profile updated successfully!")
      setShowSuccessAlert(true)

      await fetchProfileData()
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }))
    // Clear error when user starts typing
    if (passwordErrors[field as keyof typeof passwordErrors]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [field]: "",
      }))
    }
  }

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false)
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long"
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter"
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter"
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number"
    }
    return ""
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset errors
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })

    // Validate current password
    if (!passwordForm.currentPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: "Current password is required",
      }))
      return
    }

    // Validate new password
    const newPasswordError = validatePassword(passwordForm.newPassword)
    if (newPasswordError) {
      setPasswordErrors((prev) => ({
        ...prev,
        newPassword: newPasswordError,
      }))
      return
    }

    // Validate confirm password
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }))
      return
    }

    try {
      setIsChangingPassword(true)

      // Here you would typically call an API to change the password
      // For now, we'll simulate a successful password change
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSuccessMessage("Password changed successfully!")
      setShowSuccessAlert(true)
      handlePasswordModalClose()
    } catch (error) {
      console.error("Error changing password:", error)
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: "Failed to change password. Please try again.",
      }))
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Additional missing functions
  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleLogoutCancel = () => {
    setShowLogoutModal(false)
  }

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true)
      // Here you would typically call an API to logout
      // For now, we'll simulate a logout
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Clear authentication state
      setIsAuthenticated(false)
      setShowLogoutModal(false)

      // Redirect to login page or home
      window.location.href = '/login'
    } catch (error) {
      console.error("Error during logout:", error)
      setShowLogoutModal(false)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-red-600"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Profile</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-user-line text-2xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600">Unable to load staff profile data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">

      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto">
          {/* Alert Messages */}
          {showSuccessAlert && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 sm:gap-3 text-green-800">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="ri-check-circle-line text-green-600 text-sm sm:text-base"></i>
                </div>
                <span className="font-medium text-sm sm:text-base">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Profile Summary Card */}
            <div className="lg:col-span-1 order-1">
              <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 sticky top-4 sm:top-8">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="mb-3 sm:mb-4">
                    <Avatar
                      name={profile?.name}
                      email={profile?.email}
                      size="xl"
                      className="mx-auto"
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                    {profile?.name || "User Profile"}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 break-words">{profile?.email || "No email provided"}</p>
                </div>

                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Profile Completion</span>
                    <span className="text-xs sm:text-sm text-gray-600">
                      {profileCompletion}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${profileCompletion}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                  <Button variant="outline" size="sm" className="sm:size-md" onClick={handleLogoutClick} fullWidth>
                    <i className="ri-logout-box-line mr-2"></i>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Form Section */}
            <div className="lg:col-span-2 order-2">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Personal Information</h2>
                      <p className="text-blue-100 mt-1 text-sm sm:text-base">Keep your information up to date</p>
                    </div>
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
                      >
                        <i className="ri-edit-line"></i>
                        <span className="font-medium">Edit Profile</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-100">
                        <i className="ri-edit-line text-sm sm:text-base"></i>
                        <span className="text-xs sm:text-sm font-medium">Editing Mode</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-4 sm:p-6 lg:p-8">
                  <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
                    {/* Basic Information Section */}
                    <div>
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-user-line text-blue-600 text-sm sm:text-base"></i>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Basic Information</h3>
                      </div>

                      {/* Display Mode - Show when not editing */}
                      {!isEditing && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                            <p className="text-gray-900 font-medium text-sm sm:text-base">{profile?.name?.split(' ')[0] || 'Not provided'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <p className="text-gray-900 font-medium text-sm sm:text-base">{profile?.name?.split(' ').slice(1).join(' ') || 'Not provided'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                            <p className="text-gray-900 font-medium text-sm sm:text-base">{profile?.position || 'Not provided'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                            <p className="text-gray-900 font-medium text-sm sm:text-base">{profile?.department || 'Not provided'}</p>
                          </div>
                        </div>
                      )}

                      {/* Edit Mode - Show when editing */}
                      {isEditing && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <Input
                            label="First Name"
                            type="text"
                            name="firstName"
                            id="firstName"
                            value={editForm.name.split(' ')[0] || ''}
                            onChange={(e) => {
                              const lastName = editForm.name.split(' ').slice(1).join(' ') || ''
                              const newName = e.target.value + (lastName ? ' ' + lastName : '')
                              handleInputChange("name", newName)
                            }}
                            error=""
                            placeholder="Enter your first name"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-user-line"></i>}
                          />
                          <Input
                            label="Last Name"
                            type="text"
                            name="lastName"
                            id="lastName"
                            value={editForm.name.split(' ').slice(1).join(' ') || ''}
                            onChange={(e) => {
                              const firstName = editForm.name.split(' ')[0] || ''
                              const newName = firstName + (e.target.value ? ' ' + e.target.value : '')
                              handleInputChange("name", newName)
                            }}
                            error=""
                            placeholder="Enter your last name"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-user-line"></i>}
                          />
                          <Input
                            label="Position"
                            type="text"
                            name="position"
                            id="position"
                            value={editForm.position}
                            onChange={(e) => handleInputChange("position", e.target.value)}
                            error=""
                            placeholder="Enter your position"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-briefcase-line"></i>}
                          />
                          <Input
                            label="Department"
                            type="text"
                            name="department"
                            id="department"
                            value={editForm.department}
                            onChange={(e) => handleInputChange("department", e.target.value)}
                            error=""
                            placeholder="Enter your department"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-building-line"></i>}
                          />
                        </div>
                      )}
                    </div>

                    {/* Contact Information Section */}
                    <div className="border-t border-gray-100 pt-6 sm:pt-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-phone-line text-green-600 text-sm sm:text-base"></i>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Contact Information</h3>
                      </div>

                      {/* Display Mode - Show when not editing */}
                      {!isEditing && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <p className="text-gray-900 font-medium text-sm sm:text-base break-words">{profile?.email || 'Not provided'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <p className="text-gray-900 font-medium text-sm sm:text-base">{formatPhoneNumber(profile?.phone) || 'Not provided'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                            <div className="flex items-center gap-2">
                              <i className={`${getAvailabilityIcon(profile?.availability || 'available')} text-sm sm:text-base`}></i>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(profile?.availability || 'available')}`}>
                                {profile?.availability || 'Not set'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Edit Mode - Show when editing */}
                      {isEditing && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <Input
                            label="Email Address"
                            type="email"
                            name="email"
                            id="email"
                            value={editForm.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            error=""
                            placeholder="Enter your email"
                            required
                            disabled={!isEditing}
                            icon={<i className="ri-mail-line"></i>}
                          />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <PhoneInput
                              international
                              defaultCountry="PH"
                              value={editForm.phone}
                              onChange={(value) => handleInputChange("phone", value || "")}
                              className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                false ? 'border-red-300' : 'border-gray-300'
                              }`}
                              inputClassName="w-full py-4 px-4 border-0 focus:ring-0 focus:outline-none bg-transparent text-gray-900 placeholder-gray-500"
                              buttonClassName="px-3 py-4 border-r border-gray-300 bg-gray-50 hover:bg-gray-100"
                              dropdownClassName="bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                              inputProps={{ required: true }}
                              placeholder="Enter your phone number"
                              disabled={!isEditing}
                            />
                          </div>
                          <Select
                            label="Availability"
                            name="availability"
                            id="availability"
                            value={editForm.availability}
                            onChange={(e) => handleInputChange("availability", e.target.value)}
                            error=""
                            required
                            disabled={!isEditing}
                            options={[
                              { value: "available", label: "Available" },
                              { value: "busy", label: "Busy" },
                              { value: "off-duty", label: "Off Duty" }
                            ]}
                          />
                        </div>
                      )}
                    </div>

                    {/* Security Section */}
                    <div className="border-t border-gray-100 pt-6 sm:pt-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-lock-line text-red-600 text-sm sm:text-base"></i>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Security</h3>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base">Change Password</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Update your password to keep your account secure</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="sm:size-md border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setShowPasswordModal(true)}
                          >
                            <i className="ri-key-line mr-2"></i>
                            <span className="hidden sm:inline">Change Password</span>
                            <span className="sm:hidden">Change</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="border-t border-gray-100 pt-6 sm:pt-8">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <Button type="submit" variant="primary" size="md" className="sm:size-lg" disabled={saving}>
                            {saving ? (
                              <>
                                <i className="ri-loader-4-line animate-spin mr-2"></i>
                                <span className="hidden sm:inline">Saving Changes...</span>
                                <span className="sm:hidden">Saving...</span>
                              </>
                            ) : (
                              <>
                                <i className="ri-save-line mr-2"></i>
                                <span className="hidden sm:inline">Save Changes</span>
                                <span className="sm:hidden">Save</span>
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="md"
                            className="sm:size-lg"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            <i className="ri-close-line mr-2"></i>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action Button for Mobile */}
          {!isEditing && (
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:hidden z-40">
              <Button
                variant="primary"
                size="lg"
                onClick={handleEdit}
                className="rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-2xl hover:shadow-3xl"
              >
                <i className="ri-edit-line text-lg sm:text-xl"></i>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        title="Change Password"
        size="sm"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <Input
              label="Current Password"
              type="password"
              name="currentPassword"
              id="currentPassword"
              value={passwordForm.currentPassword}
              onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
              error={passwordErrors.currentPassword}
              placeholder="Enter your current password"
              required
              icon={<i className="ri-lock-line"></i>}
            />
          </div>

          <div>
            <Input
              label="New Password"
              type="password"
              name="newPassword"
              id="newPassword"
              value={passwordForm.newPassword}
              onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
              error={passwordErrors.newPassword}
              placeholder="Enter your new password"
              required
              icon={<i className="ri-key-line"></i>}
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters long and contain uppercase, lowercase, and number.
            </p>
          </div>

          <div>
            <Input
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
              error={passwordErrors.confirmPassword}
              placeholder="Confirm your new password"
              required
              icon={<i className="ri-key-line"></i>}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="sm:size-md"
              onClick={handlePasswordModalClose}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="sm:size-md"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  <span className="hidden sm:inline">Changing...</span>
                  <span className="sm:hidden">Changing</span>
                </>
              ) : (
                <>
                  <i className="ri-key-line mr-2"></i>
                  <span className="hidden sm:inline">Change Password</span>
                  <span className="sm:hidden">Change</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />
    </div>
  )
}

export default StaffProfilePage
