"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../../components/Navbar"
import { getAuthState, type UserData } from "../../utils/auth"
import { apiRequest } from "../../utils/api"
import { useToast } from "../../components/base/Toast"

interface WelfareCheckData {
  status: 'safe' | 'needs_help'
  additional_info: string
}

interface WelfareSystemStatus {
  isActive: boolean
  title: string
  description: string
  messageWhenDisabled: string
}

interface WelfareReport {
  report_id: number
  status: 'safe' | 'needs_help'
  additional_info: string
  submitted_at: string
}

export default function WelfareCheck() {
  const navigate = useNavigate()
  const toast = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [systemStatus, setSystemStatus] = useState<WelfareSystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [latestReport, setLatestReport] = useState<WelfareReport | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  
  const [formData, setFormData] = useState<WelfareCheckData>({
    status: 'safe',
    additional_info: ''
  })

  useEffect(() => {
    const authState = getAuthState()
    
    if (!authState.isAuthenticated || authState.userType !== 'user') {
      navigate('/auth/login')
      return
    }
    
    setIsAuthenticated(true)
    setUserData(authState.userData)
    
    // Fetch welfare system status and latest report
    fetchWelfareStatus()
    fetchLatestReport()
  }, [navigate])

  const fetchWelfareStatus = async () => {
    try {
      console.log('Fetching welfare status...')
      const response = await apiRequest('/welfare/status')
      console.log('Welfare status response:', response)
      
      if (response.success) {
        setSystemStatus(response)
      } else {
        toast.showToast({
          type: 'error',
          title: 'Failed to Load Status',
          message: 'Failed to load welfare check system status'
        })
      }
    } catch (error) {
      console.error('Error fetching welfare status:', error)
      toast.showToast({
        type: 'error',
        title: 'Failed to Load Status',
        message: 'Failed to load welfare check system status'
      })
    }
  }

  const fetchLatestReport = async () => {
    try {
      console.log('Fetching latest welfare report...')
      const response = await apiRequest('/welfare/latest')
      console.log('Latest welfare report response:', response)
      
      if (response.success && response.report) {
        setLatestReport(response.report)
        // Pre-fill form with latest report data
        setFormData({
          status: response.report.status,
          additional_info: response.report.additional_info || ''
        })
      }
    } catch (error) {
      console.error('Error fetching latest welfare report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (latestReport && isEditing) {
      // Update existing report
      await handleUpdate()
    } else {
      // Create new report
      await handleCreate()
    }
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      console.log('Creating welfare check:', formData)
      const response = await apiRequest('/welfare/submit', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      console.log('Welfare submit response:', response)
      
      if (response.success) {
        toast.showToast({
          type: 'success',
          title: 'Welfare Check Submitted',
          message: 'Your welfare check has been submitted successfully. Emergency responders have been notified.'
        })
        // Refresh the latest report
        await fetchLatestReport()
      } else {
        const errorMessage = response.message || 'Failed to submit welfare check'
        toast.showToast({
          type: 'error',
          title: 'Submission Failed',
          message: errorMessage
        })
        setSubmitError(errorMessage)
      }
      
    } catch (error: any) {
      console.error('Error submitting welfare check:', error)
      const errorMessage = error.message || 'Failed to submit welfare check. Please try again.'
      toast.showToast({
        type: 'error',
        title: 'Submission Failed',
        message: errorMessage
      })
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!latestReport) return
    
    setIsUpdating(true)
    setSubmitError(null)

    try {
      console.log('Updating welfare check:', formData)
      const response = await apiRequest(`/welfare/update/${latestReport.report_id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      })
      console.log('Welfare update response:', response)
      
      if (response.success) {
        toast.showToast({
          type: 'success',
          title: 'Welfare Check Updated',
          message: 'Your welfare check has been updated successfully. Emergency responders have been notified.'
        })
        setIsEditing(false)
        // Refresh the latest report
        await fetchLatestReport()
      } else {
        const errorMessage = response.message || 'Failed to update welfare check'
        toast.showToast({
          type: 'error',
          title: 'Update Failed',
          message: errorMessage
        })
        setSubmitError(errorMessage)
      }
      
    } catch (error: any) {
      console.error('Error updating welfare check:', error)
      const errorMessage = error.message || 'Failed to update welfare check. Please try again.'
      toast.showToast({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage
      })
      setSubmitError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setSubmitError(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Reset form to latest report data
    if (latestReport) {
      setFormData({
        status: latestReport.status,
        additional_info: latestReport.additional_info || ''
      })
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading welfare check system...</p>
        </div>
      </div>
    )
  }

  // Show disabled state if system is not active
  if (systemStatus && !systemStatus.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Navbar isAuthenticated={isAuthenticated} userData={userData} />
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="ri-pause-circle-line text-orange-600 text-4xl"></i>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {systemStatus.title}
              </h1>
              
              <p className="text-lg text-gray-600 mb-6">
                {systemStatus.description}
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-center text-orange-800 mb-2">
                  <i className="ri-information-line text-orange-600 mr-2"></i>
                  <span className="font-semibold">System Currently Disabled</span>
                </div>
                <p className="text-orange-700">
                  {systemStatus.messageWhenDisabled}
                </p>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={() => navigate('/')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  <i className="ri-home-line mr-2"></i>
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar isAuthenticated={isAuthenticated} userData={userData} />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.05) 2px, transparent 0)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                <i className="ri-heart-pulse-line text-3xl text-white"></i>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-3 leading-tight">
            Welfare Check Status
            </h1>
            {systemStatus?.isActive && (
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 mb-5">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm font-medium">System Active</span>
              </div>
            )}

            {systemStatus?.isActive && showAnnouncement && (
              <div className="relative max-w-3xl mx-auto mb-8">
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-lg overflow-hidden">
                  <div className="relative px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <i className="ri-megaphone-line text-amber-600 text-lg"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-amber-800 mb-2">Welfare Announcement</div>
                        <div className="space-y-1">
                          <p className="text-amber-900 font-medium leading-snug text-base">
                            {systemStatus?.title || 'Welfare Check'}
                          </p>
                          <p className="text-amber-700 text-sm leading-relaxed">
                            {systemStatus?.description || 'Welfare check is currently active. Please submit your status to help responders.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAnnouncement(false)}
                        className="flex-shrink-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg p-2 transition-all duration-200"
                        aria-label="Dismiss announcement"
                      >
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

           
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Current Status Display */}
          {latestReport && !isEditing && (
            <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <i className="ri-heart-pulse-line text-blue-600"></i>
                  </div>
                  Current Status
                </h3>
                <button
                  onClick={handleEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                >
                  <i className="ri-edit-line mr-2"></i>
                  Edit Status
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                    latestReport.status === 'safe' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <i className={`text-2xl ${
                      latestReport.status === 'safe' 
                        ? 'ri-checkbox-circle-line text-green-600' 
                        : 'ri-error-warning-line text-red-600'
                    }`}></i>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {latestReport.status === 'safe' ? 'I am safe' : 'I need help'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted: {new Date(latestReport.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {latestReport.additional_info && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Information:</p>
                    <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{latestReport.additional_info}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form - only show if no existing report or if editing */}
          {(!latestReport || isEditing) && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-heart-pulse-line text-blue-600"></i>
                      </div>
                      {isEditing ? 'Update Status' : 'Current Status'}
                    </h3>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <i className="ri-close-line mr-1"></i>
                        Cancel
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 mt-2">
                    {isEditing ? 'Update your welfare status below' : 'Please select your current welfare status'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    <i className="ri-heart-pulse-line mr-2 text-blue-600"></i>
                    Current Status <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { value: 'safe', label: 'I am safe', icon: 'ri-checkbox-circle-line', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
                      { value: 'needs_help', label: 'I need help', icon: 'ri-error-warning-line', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={'relative cursor-pointer rounded-xl p-6 border-2 transition-all duration-200 ' +
                          (formData.status === option.value
                            ? option.bgColor + ' ' + option.borderColor + ' border-2'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100')
                        }
                      >
                        <input
                          type="radio"
                          name="status"
                          value={option.value}
                          checked={formData.status === option.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex items-center">
                          <div className={'w-12 h-12 ' + option.bgColor + ' rounded-lg flex items-center justify-center mr-4'}>
                            <i className={option.icon + ' text-2xl ' + option.color}></i>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{option.label}</div>
                          </div>
                        </div>
                        {formData.status === option.value && (
                          <div className="absolute top-4 right-4">
                            <i className="ri-check-line text-green-600 text-xl"></i>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-file-text-line text-orange-600"></i>
                    </div>
                    Additional Information
                  </h3>
                  <p className="text-gray-600 mt-2">Provide any additional details about your situation</p>
                </div>

                <div>
                  <label htmlFor="additional_info" className="block text-sm font-semibold text-gray-700 mb-3">
                    <i className="ri-file-text-line mr-2 text-orange-600"></i>
                    Additional Information <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    id="additional_info"
                    name="additional_info"
                    value={formData.additional_info}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Any additional information about your situation, needs, or concerns"
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || isUpdating}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        Submitting Welfare Check...
                      </>
                    ) : isUpdating ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        Updating Welfare Check...
                      </>
                    ) : (
                      <>
                        <i className={`${isEditing ? "ri-save-line" : "ri-send-plane-line"} mr-2`}></i>
                        {isEditing ? 'Update Welfare Check' : 'Submit Welfare Check'}
                      </>
                    )}
                  </button>
                </div>
              </div>
              </form>
            </div>
          )}

       
        </div>
      </div>
    </div>
  )
}
