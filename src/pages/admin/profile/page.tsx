"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "../../../components/base/Avatar"
import Modal from "../../../components/base/Modal"
import LogoutModal from "../../../components/LogoutModal"
import Input from "../../../components/base/Input"
import Button from "../../../components/base/Button"
import { getAuthState, clearAuthData, updateUserData, type UserData } from "../../../utils/auth"
import { adminAuthApi } from "../../../utils/api"
import { useToast } from "../../../components/base/Toast"

export default function AdminProfilePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUserData, setEditedUserData] = useState<UserData>({})
  const [isSaving, setIsSaving] = useState(false)
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
  const [showPictureModal, setShowPictureModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(null)
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)

  useEffect(() => {
    const authState = getAuthState()
    if (!authState.isAuthenticated || authState.userType !== "admin") {
      navigate("/admin/login")
      return
    }
    setUserData(authState.userData || {})
    setIsAuthenticated(true)

    // Fetch fresh profile data
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)
        const response = await adminAuthApi.getProfile()
        if (response.success && response.admin) {
          setUserData((prev) => (prev ? { ...prev, ...response.admin } : response.admin))
          updateUserData(response.admin)
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error)
        showToast({
          type: "error",
          title: "Failed to Load Profile",
          message: "Failed to load profile data. Please refresh the page.",
          durationMs: 5000
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState()
      if (!newAuthState.isAuthenticated || newAuthState.userType !== "admin") {
        navigate("/admin/login")
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
  }, [navigate, hasUnsavedChanges])

  useEffect(() => {
    if (isEditing && userData) {
      const hasChanges = editedUserData.name !== userData.name || editedUserData.email !== userData.email
      setHasUnsavedChanges(hasChanges)
    } else {
      setHasUnsavedChanges(false)
    }
  }, [editedUserData, userData, isEditing])


  const handleLogoutClick = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to logout?")) {
        return
      }
    }
    setShowLogoutModal(true)
  }

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      clearAuthData()
      navigate("/admin/login")
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

  const handleEditClick = () => {
    if (userData) {
      setEditedUserData({ ...userData })
      setIsEditing(true)
    }
  }

  const handleSaveClick = async () => {
    if (!editedUserData.name || !editedUserData.email) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Name and email are required",
        durationMs: 4000
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editedUserData.email)) {
      showToast({
        type: "error",
        title: "Invalid Email",
        message: "Please enter a valid email address",
        durationMs: 4000
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await adminAuthApi.updateProfile({
        name: editedUserData.name,
        email: editedUserData.email,
      })

      console.log("Update profile response:", response)

      if (response.success && response.admin) {
        // Use the updated admin data directly
        setUserData(response.admin)
        updateUserData(response.admin)
        setIsEditing(false)
        setEditedUserData({})
        setHasUnsavedChanges(false)
        showToast({
          type: "success",
          title: "Profile Updated",
          message: "Profile updated successfully!",
          durationMs: 3000
        })
      } else {
        showToast({
          type: "error",
          title: "Update Failed",
          message: response.message || "Failed to update profile",
          durationMs: 5000
        })
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error)
      showToast({
        type: "error",
        title: "Update Failed",
        message: error.message || "Failed to update profile",
        durationMs: 5000
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        return
      }
    }
    setIsEditing(false)
    setEditedUserData({})
    setHasUnsavedChanges(false)
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
      const response = await adminAuthApi.changePassword(
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
      const response = await adminAuthApi.uploadProfilePicture(selectedFile)

      if (response.success && response.admin) {
        const updatedUser = { ...userData, ...response.admin }
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
    if (!userData?.profile_picture && !userData?.profilePicture) return

    if (!window.confirm('Are you sure you want to delete your profile picture?')) {
      return
    }

    setIsUploadingPicture(true)

    try {
      const response = await adminAuthApi.deleteProfilePicture()

      if (response.success && response.admin) {
        const updatedUser = { ...userData, ...response.admin }
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

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center">
            <i className="ri-loader-4-line text-2xl text-white animate-spin"></i>
          </div>
          <p className="text-gray-600">{isLoading ? "Loading profile..." : "Checking authentication..."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
            <div className="text-center mb-6">
              <div className="mb-4">
                <Avatar 
                  name={userData?.name} 
                  email={userData?.email} 
                  profilePicture={userData?.profile_picture || userData?.profilePicture}
                  size="xl" 
                  className="mx-auto cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => setShowPictureModal(true)}
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{userData?.name || "Admin Profile"}</h3>
              <p className="text-gray-600 mb-2">{userData?.email || "No email provided"}</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">
                <i className="ri-shield-check-line mr-1"></i>
                Administrator
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col gap-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={handleEditClick}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="ri-edit-line"></i>
                      Edit Profile
                    </button>
                    <button
                      onClick={handleLogoutClick}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="ri-logout-box-line"></i>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    {hasUnsavedChanges && (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-2 flex items-center gap-1">
                        <i className="ri-information-line"></i>
                        You have unsaved changes
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveClick}
                        disabled={isSaving || !hasUnsavedChanges}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        {isSaving ? (
                          <>
                            <i className="ri-loader-4-line animate-spin"></i>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line"></i>
                            Save
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelClick}
                        disabled={isSaving}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <i className="ri-close-line"></i>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Display */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {isEditing ? "Edit Profile Information" : "Profile Information"}
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {isEditing ? "Update your admin profile details" : "View your admin profile details"}
                  </p>
                </div>
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <i className="ri-edit-line"></i>
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="ri-user-line text-blue-600"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name {isEditing && <span className="text-red-500">*</span>}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={editedUserData.name || ""}
                          onChange={(e) => setEditedUserData({ ...editedUserData, name: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-gray-900">{userData?.name || "Not provided"}</p>
                      )}
                    </div>
                    {!isEditing && (
                      <>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900">{userData?.role || "Administrator"}</p>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900">{userData?.status || "Active"}</p>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="border-t border-gray-100 pt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="ri-mail-line text-green-600"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  </div>
                  <div className="grid md:grid-cols-1 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address {isEditing && <span className="text-red-500">*</span>}
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={editedUserData.email || ""}
                          onChange={(e) => setEditedUserData({ ...editedUserData, email: e.target.value })}
                          placeholder="Enter your email address"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900">{userData?.email || "Not provided"}</p>
                          {userData?.email && (
                            <i className="ri-verified-badge-line text-green-500" title="Verified email"></i>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security Section */}
                <div className="border-t border-gray-100 pt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <i className="ri-lock-line text-red-600"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Security</h3>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Change Password</h4>
                        <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
                      </div>
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <i className="ri-key-line"></i>
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>



            
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        title="Change Password"
        size="md"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handlePasswordModalClose}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Changing...
                </>
              ) : (
                <>
                  <i className="ri-key-line mr-2"></i>
                  Change Password
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
        size="md"
      >
        <div className="space-y-6">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          {(userData?.profile_picture || userData?.profilePicture) && !picturePreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Picture
              </label>
              <div className="flex justify-center">
                <img
                  src={(userData?.profile_picture || userData?.profilePicture) || ''}
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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {(userData?.profile_picture || userData?.profilePicture) && !selectedFile && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handlePictureDelete}
                disabled={isUploadingPicture}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <i className="ri-delete-bin-line mr-2"></i>
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handlePictureModalClose}
              disabled={isUploadingPicture}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handlePictureUpload}
              disabled={!selectedFile || isUploadingPicture}
            >
              {isUploadingPicture ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="ri-upload-line mr-2"></i>
                  Upload Picture
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
