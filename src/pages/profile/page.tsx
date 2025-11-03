
import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../../components/base/Button"
import Input from "../../components/base/Input"
import Select from "../../components/base/Select"
import Avatar from "../../components/base/Avatar"
import Modal from "../../components/base/Modal"
import LogoutModal from "../../components/LogoutModal"
import useForm from "../../hooks/useForm"
import Navbar from "../../components/Navbar"
import { getAuthState, clearAuthData, updateUserData, type UserData } from "../../utils/auth"
import { profileApi } from "../../utils/api"
import { useToast } from "../../components/base/Toast"
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

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

interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [userData, setUserData] = useState<UserData>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)
  const [showPictureModal, setShowPictureModal] = useState(false)
  const [picturePreview, setPicturePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
    
    setUserData(authState.userData || {})
    setIsAuthenticated(true)

    // Fetch fresh profile data to ensure we have all fields including phone and address
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)
        const response = await profileApi.getProfile()
        if (response.success && response.user) {
          setUserData((prev) => ({ ...prev, ...response.user }))
          // Update storage with complete user data
          updateUserData({ ...authState.userData, ...response.user })
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error)
        // Continue with existing auth data if fetch fails
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState()
      if (!newAuthState.isAuthenticated) {
        navigate("/auth/login")
        return
      }
      setIsAuthenticated(newAuthState.isAuthenticated)
      setUserData(newAuthState.userData || {})
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("storage", handleAuthStateChange)
    window.addEventListener("authStateChanged", handleAuthStateChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("storage", handleAuthStateChange)
      window.removeEventListener("authStateChanged", handleAuthStateChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [navigate])

  const handleLogoutClick = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to sign out?")) {
        return
      }
    }
    setShowLogoutModal(true)
  }

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true)
    try {
      // Add a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000))
      clearAuthData()
      navigate("/")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  const handleLogoutCancel = () => {
    setShowLogoutModal(false)
  }

  const handlePasswordInputChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validatePasswordForm = () => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (passwordForm.currentPassword && passwordForm.newPassword &&
        passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password'
    }

    setPasswordErrors(errors)
    return !Object.values(errors).some(error => error !== '')
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePasswordForm()) {
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await profileApi.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      )

      if (response.success) {
        // Reset form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setShowPasswordModal(false)

        // Show success toast
        showToast({
          type: "success",
          title: "Password Changed",
          message: "Your password has been changed successfully!",
          durationMs: 3000
        })
      } else {
        setPasswordErrors(prev => ({
          ...prev,
          currentPassword: response.message || 'Failed to change password'
        }))
      }
    } catch (error) {
      console.error('Password change failed:', error)
      setPasswordErrors(prev => ({
        ...prev,
        currentPassword: error instanceof Error ? error.message : 'Failed to change password. Please try again.'
      }))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handlePasswordModalClose = () => {
    if (isChangingPassword) return // Prevent closing while submitting

    setShowPasswordModal(false)
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  }

  const handlePictureModalOpen = () => {
    setShowPictureModal(true)
    setPicturePreview(null)
    setSelectedFile(null)
  }

  const handlePictureModalClose = () => {
    if (isUploadingPicture) return // Prevent closing while uploading

    setShowPictureModal(false)
    setPicturePreview(null)
    setSelectedFile(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        showToast({
          type: "error",
          title: "Invalid File Type",
          message: "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
          durationMs: 4000
        })
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showToast({
          type: "error",
          title: "File Too Large",
          message: "File size must be less than 5MB",
          durationMs: 4000
        })
        return
      }

      setSelectedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPicturePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePictureUpload = async () => {
    if (!selectedFile) return

    setIsUploadingPicture(true)

    try {
      const response = await profileApi.uploadProfilePicture(selectedFile)

      if (response.success) {
        const updatedUser = { ...userData, ...response.user }
        setUserData(updatedUser)
        updateUserData(updatedUser)

        showToast({
          type: "success",
          title: "Profile Picture Updated",
          message: "Your profile picture has been updated successfully!",
          durationMs: 3000
        })
        handlePictureModalClose()
      } else {
        showToast({
          type: "error",
          title: "Upload Failed",
          message: response.message || 'Failed to upload profile picture',
          durationMs: 5000
        })
      }
    } catch (error) {
      console.error('Profile picture upload failed:', error)
      showToast({
        type: "error",
        title: "Upload Failed",
        message: error instanceof Error ? error.message : 'Failed to upload profile picture. Please try again.',
        durationMs: 5000
      })
    } finally {
      setIsUploadingPicture(false)
    }
  }

  const handlePictureDelete = async () => {
    if (!userData.profile_picture) return

    if (!window.confirm('Are you sure you want to delete your profile picture?')) {
      return
    }

    setIsUploadingPicture(true)

    try {
      const response = await profileApi.deleteProfilePicture()

      if (response.success) {
        const updatedUser = { ...userData, ...response.user }
        setUserData(updatedUser)
        updateUserData(updatedUser)

        showToast({
          type: "success",
          title: "Profile Picture Deleted",
          message: "Your profile picture has been deleted successfully!",
          durationMs: 3000
        })
      } else {
        showToast({
          type: "error",
          title: "Deletion Failed",
          message: response.message || 'Failed to delete profile picture',
          durationMs: 5000
        })
      }
    } catch (error) {
      console.error('Profile picture deletion failed:', error)
      showToast({
        type: "error",
        title: "Deletion Failed",
        message: error instanceof Error ? error.message : 'Failed to delete profile picture. Please try again.',
        durationMs: 5000
      })
    } finally {
      setIsUploadingPicture(false)
    }
  }

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<ProfileFormData>(
    {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
    {
      firstName: { required: true },
      lastName: { required: true },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      phone: {
        required: false,
        custom: (value: string) => {
          if (!value) return null; // Optional field
          return validatePhilippineMobile(value) ? null : "Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)"
        },
      },
      address: { required: true },
      city: { required: false }, // Fixed to "Rosario"
      state: { required: false }, // Fixed to "Batangas"
      zipCode: {
        required: false,
        pattern: /^\d{4,10}$/, // Basic zip code validation
      },
    },
  )

  useEffect(() => {
    if (userData && Object.keys(userData).length > 0 && !isEditing) {
      const formData = {
        firstName: userData.firstName || userData.first_name || "",
        lastName: userData.lastName || userData.last_name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        address: userData.address || "",
        city: userData.city || "",
        state: userData.state || "",
        zipCode: userData.zipCode || "",
      }

      const shouldUpdate = Object.entries(formData).some(([key, value]) => {
        const currentValue = fields[key as keyof ProfileFormData]?.value
        return currentValue !== value
      })

      if (shouldUpdate) {
        Object.entries(formData).forEach(([key, value]) => {
          setValue(key as keyof ProfileFormData, value)
        })
        setHasUnsavedChanges(false)
      }
    }
  }, [userData, isEditing])

  const handleFieldChange = (field: keyof ProfileFormData, value: string | undefined) => {
    setValue(field, value || "")
    setHasUnsavedChanges(true)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setHasUnsavedChanges(false)
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        return
      }
    }
    setIsEditing(false)
    setHasUnsavedChanges(false)
    // The useEffect will automatically repopulate the form with original user data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    if (!validateAll()) {
      // Get fields with errors and show detailed error message
      const errorFields = Object.entries(fields)
        .filter(([_, field]) => field.error && field.touched)
        .map(([key, field]) => {
          // Convert field names to user-friendly labels
          const fieldLabels: Record<string, string> = {
            firstName: 'First Name',
            lastName: 'Last Name',
            email: 'Email',
            phone: 'Phone Number',
            address: 'Barangay',
            city: 'City',
            state: 'Province',
            zipCode: 'ZIP Code'
          }
          return `${fieldLabels[key] || key}: ${field.error}`
        })
      
      console.log('Validation errors:', errorFields)
      
      if (errorFields.length > 0) {
        showToast({
          type: "error",
          title: "Validation Error",
          message: errorFields.length > 2 
            ? `Please fix errors in ${errorFields.length} fields: ${errorFields.slice(0, 2).join(', ')}...`
            : `Please fix: ${errorFields.join(', ')}`,
          durationMs: 5000
        })
      } else {
        showToast({
          type: "error",
          title: "Validation Error",
          message: "Please fix the errors in the form before saving.",
          durationMs: 4000
        })
      }
      return
    }

    setIsSubmitting(true)

    try {
      const formData = getValues()
      // Ensure province, city, and zip are set to fixed values
      formData.state = "Batangas"
      formData.city = "Rosario"
      formData.zipCode = "4225"
      console.log("Updating profile with data:", formData)

      const response = await profileApi.updateProfile(formData)

      if (response.success) {
        console.log("Profile updated successfully:", response.user)
        const updatedUser = { ...userData, ...response.user }
        setUserData(updatedUser)

        // Use the new updateUserData function to handle storage
        updateUserData(updatedUser)

        showToast({
          type: "success",
          title: "Profile Updated",
          message: "Your profile has been updated successfully!",
          durationMs: 3000
        })
        setIsEditing(false)
        setHasUnsavedChanges(false)
      } else {
        console.warn("Profile update returned unsuccessful response:", response)
        showToast({
          type: "error",
          title: "Update Failed",
          message: response.message || "Failed to update profile. Please try again.",
          durationMs: 5000
        })
      }
    } catch (error) {
      console.error("Profile update failed:", error)

      // Handle authentication errors specifically
      if (
        error instanceof Error &&
        (error.message.includes("Authentication") ||
          error.message.includes("token") ||
          error.message.includes("401") ||
          error.message.includes("403"))
      ) {
        showToast({
          type: "error",
          title: "Session Expired",
          message: "Your session has expired. Please log in again to save changes.",
          durationMs: 4000
        })

        // Auto-redirect to login after showing message
        setTimeout(() => {
          clearAuthData()
          navigate("/auth/login")
        }, 3000)
      } else {
        showToast({
          type: "error",
          title: "Update Failed",
          message: error instanceof Error ? error.message : "Network error. Please try again.",
          durationMs: 5000
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="animate-pulse">
          {/* Navbar skeleton */}
          <div className="h-16 bg-white shadow-sm border-b border-gray-200">
            <div className="container mx-auto px-4 h-full flex items-center justify-between">
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-8 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-8">
              {/* Profile card skeleton */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
                    <div className="h-6 w-32 bg-gray-200 rounded mx-auto mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
                    <div className="h-10 w-full bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Form skeleton */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl">
                  <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl"></div>
                  <div className="p-8 space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        <div className="h-12 w-full bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navbar isAuthenticated={isAuthenticated} userData={userData} />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Profile Summary Card */}
            <div className="lg:col-span-1 order-1">
              <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 sticky top-4 sm:top-8">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="mb-3 sm:mb-4">
                    <Avatar
                      name={
                        userData?.firstName && userData?.lastName
                          ? `${userData.firstName} ${userData.lastName}`
                          : undefined
                      }
                      email={userData?.email}
                      profilePicture={userData?.profile_picture}
                      size="xl"
                      className="mx-auto"
                      onClick={handlePictureModalOpen}
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                    {userData?.firstName && userData?.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : "User Profile"}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 break-words">{userData?.email || "No email provided"}</p>

                  {isEditing && hasUnsavedChanges && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-800">
                        <i className="ri-information-line text-amber-600 text-sm sm:text-base"></i>
                        <span className="text-xs sm:text-sm font-medium">Unsaved changes</span>
                      </div>
                    </div>
                  )}
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
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Personal Information</h2>
                      <p className="text-blue-100 mt-1 text-sm sm:text-base">Keep your information up to date</p>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 text-blue-100">
                        <i className="ri-edit-line text-sm sm:text-base"></i>
                        <span className="text-xs sm:text-sm font-medium">Editing Mode</span>
                      </div>
                    ) : (
                      <div className="hidden lg:block">
                        <Button
                          variant="outline"
                          size="md"
                          onClick={handleEdit}
                          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                          <i className="ri-edit-line mr-2"></i>
                          Edit Profile
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-4 sm:p-6 lg:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                    {/* Basic Information Section */}
                    <div>
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-user-line text-blue-600 text-sm sm:text-base"></i>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Basic Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="ri-user-line mr-2 text-blue-600"></i>
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-user-line text-gray-400 text-sm sm:text-base"></i>
                            </div>
                            <input
                              id="firstName"
                              type="text"
                              name="firstName"
                              value={fields.firstName.value}
                              onChange={(e) => handleFieldChange("firstName", e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 sm:py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                fields.firstName.error ? 'border-red-300' : 'border-gray-300'
                              } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                              placeholder="Enter your first name"
                              required
                              disabled={!isEditing}
                              style={{
                                height: '48px',
                                fontSize: '16px',
                                lineHeight: '24px'
                              }}
                            />
                          </div>
                          {fields.firstName.touched && fields.firstName.error && (
                            <p className="text-red-600 text-sm mt-2">{fields.firstName.error}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="ri-user-line mr-2 text-blue-600"></i>
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-user-line text-gray-400 text-sm sm:text-base"></i>
                            </div>
                            <input
                              id="lastName"
                              type="text"
                              name="lastName"
                              value={fields.lastName.value}
                              onChange={(e) => handleFieldChange("lastName", e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 sm:py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                fields.lastName.error ? 'border-red-300' : 'border-gray-300'
                              } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                              placeholder="Enter your last name"
                              required
                              disabled={!isEditing}
                              style={{
                                height: '48px',
                                fontSize: '16px',
                                lineHeight: '24px'
                              }}
                            />
                          </div>
                          {fields.lastName.touched && fields.lastName.error && (
                            <p className="text-red-600 text-sm mt-2">{fields.lastName.error}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="border-t border-gray-100 pt-6 sm:pt-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-phone-line text-green-600 text-sm sm:text-base"></i>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Contact Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="ri-mail-line mr-2 text-green-600"></i>
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-mail-line text-gray-400 text-sm sm:text-base"></i>
                            </div>
                            <input
                              id="email"
                              type="email"
                              name="email"
                              value={fields.email.value}
                              onChange={(e) => handleFieldChange("email", e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 sm:py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${
                                fields.email.error ? 'border-red-300' : 'border-gray-300'
                              } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                              placeholder="Enter your email"
                              required
                              disabled={!isEditing}
                              style={{
                                height: '48px',
                                fontSize: '16px',
                                lineHeight: '24px'
                              }}
                            />
                          </div>
                          {fields.email.touched && fields.email.error && (
                            <p className="text-red-600 text-sm mt-2">{fields.email.error}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="ri-phone-line mr-2 text-green-600"></i>
                            Phone Number
                          </label>
                          <div className="relative">
                            <PhoneInput
                              id="phone"
                              international
                              defaultCountry="PH"
                              value={fields.phone.value}
                              onChange={(value) => handleFieldChange("phone", value || "")}
                              className={`w-full px-4 py-3 sm:py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${
                                fields.phone.error ? 'border-red-300' : 'border-gray-300'
                              } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                              placeholder="Enter your phone number"
                              disabled={!isEditing}
                              style={{
                                height: '48px',
                                fontSize: '16px',
                                lineHeight: '24px'
                              }}
                            />
                          </div>
                          {fields.phone.touched && fields.phone.error && (
                            <p className="text-red-600 text-sm mt-2">{fields.phone.error}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div className="border-t border-gray-100 pt-6 sm:pt-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-map-pin-line text-purple-600 text-sm sm:text-base"></i>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Address Information</h3>
                      </div>

                      {!isEditing ? (
                        // When not editing: display full address as one line
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <p className="text-gray-900 text-sm sm:text-base break-words">
                            {[fields.state.value, fields.city.value, fields.address.value, fields.zipCode.value]
                              .filter(Boolean)
                              .join(", ") || "Not provided"}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Province *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="ri-map-line text-gray-400"></i>
                              </div>
                              <input
                                type="text"
                                id="province"
                                name="province"
                                value="Batangas"
                                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed"
                                disabled
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              City / Municipality *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="ri-building-line text-gray-400"></i>
                              </div>
                              <input
                                type="text"
                                id="city"
                                name="city"
                                value="Rosario"
                                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed"
                                disabled
                              />
                            </div>
                          </div>

                          <Select
                            label="Barangay *"
                            name="address"
                            id="address"
                            value={fields.address.value}
                            onChange={(e) => handleFieldChange("address", e.target.value)}
                            error={fields.address.touched ? fields.address.error : ""}
                            required
                            disabled={!isEditing}
                            icon="ri-building-line"
                            options={rosarioBarangays.map((b) => ({ value: b.name, label: b.name }))}
                          />

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ZIP Code *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="ri-mail-line text-gray-400"></i>
                              </div>
                              <input
                                type="text"
                                id="zipCode"
                                name="zipCode"
                                value="4225"
                                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed"
                                disabled
                              />
                            </div>
                          </div>
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
                          <Button type="submit" variant="primary" size="md" className="sm:size-lg" disabled={isSubmitting}>
                            {isSubmitting ? (
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
                            disabled={isSubmitting}
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

      {/* Profile Picture Upload Modal */}
      <Modal
        isOpen={showPictureModal}
        onClose={handlePictureModalClose}
        title="Update Profile Picture"
        size="sm"
      >
        <div className="space-y-4 sm:space-y-6">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={isUploadingPicture}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
            </p>
          </div>

          {/* Preview */}
          {picturePreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="flex justify-center">
                <img
                  src={picturePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-full border-4 border-gray-200"
                />
              </div>
            </div>
          )}

          {/* Current Picture Info */}
          {userData?.profile_picture && !picturePreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Picture
              </label>
              <div className="flex justify-center">
                <img
                  src={userData.profile_picture.startsWith('http') 
                    ? userData.profile_picture 
                    : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${userData.profile_picture}`
                  }
                  alt="Current profile"
                  className="w-32 h-32 object-cover rounded-full border-4 border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="sm:size-md"
              onClick={handlePictureModalClose}
              disabled={isUploadingPicture}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="sm:size-md"
              onClick={handlePictureUpload}
              disabled={!selectedFile || isUploadingPicture}
            >
              {isUploadingPicture ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  <span className="hidden sm:inline">Uploading...</span>
                  <span className="sm:hidden">Uploading</span>
                </>
              ) : (
                <>
                  <i className="ri-upload-line mr-2"></i>
                  <span className="hidden sm:inline">Upload Picture</span>
                  <span className="sm:hidden">Upload</span>
                </>
              )}
            </Button>
          </div>
        </div>
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
