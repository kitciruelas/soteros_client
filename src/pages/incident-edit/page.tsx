import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFormRequest } from '../../utils/api';
import { useToast } from '../../components/base/Toast';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface IncidentEditFormData {
  incidentType: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priorityLevel: string;
  safetyStatus: string;
  guestName: string;
  guestContact: string;
  dateReported: string;
  attachments: File[];
}

export default function IncidentEditPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<IncidentEditFormData>({
    incidentType: '',
    description: '',
    location: '',
    latitude: null,
    longitude: null,
    priorityLevel: 'critical',
    safetyStatus: '',
    guestName: '',
    guestContact: '',
    dateReported: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    attachments: []
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.incidentType) {
      newErrors.incidentType = 'Incident type is required';
    }
    if (!formData.description) {
      newErrors.description = 'Description is required';
    }
    if (!formData.location) {
      newErrors.location = 'Location is required';
    }
    if (!formData.priorityLevel) {
      newErrors.priorityLevel = 'Priority level is required';
    }
    if (!formData.safetyStatus) {
      newErrors.safetyStatus = 'Safety status is required';
    }
    if (!formData.guestName) {
      newErrors.guestName = 'Name is required';
    }
    if (!formData.guestContact) {
      newErrors.guestContact = 'Contact number is required';
    }
    if (!formData.dateReported) {
      newErrors.dateReported = 'Date and time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof IncidentEditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB per file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (files.length + selectedFiles.length > maxFiles) {
      showToast({
        type: 'error',
        title: 'Error',
        message: `You can only upload up to ${maxFiles} files.`,
        durationMs: 3000
      });
      return;
    }

    const validFiles: File[] = [];
    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        showToast({
          type: 'error',
          title: 'Error',
          message: `${file.name}: Invalid file type. Only images are allowed.`,
          durationMs: 3000
        });
      } else if (file.size > maxSize) {
        showToast({
          type: 'error',
          title: 'Error',
          message: `${file.name}: File size exceeds 10MB limit.`,
          durationMs: 3000
        });
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields correctly.',
        durationMs: 5000
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Convert dateReported to ISO string format for the backend
      const dateTime = new Date(formData.dateReported);
      
      formDataToSend.append('incidentType', formData.incidentType.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('location', formData.location.trim());
      formDataToSend.append('latitude', String(formData.latitude || ''));
      formDataToSend.append('longitude', String(formData.longitude || ''));
      formDataToSend.append('priorityLevel', formData.priorityLevel.trim());
      formDataToSend.append('safetyStatus', formData.safetyStatus.trim());
      formDataToSend.append('guestName', formData.guestName.trim());
      formDataToSend.append('guestContact', formData.guestContact.trim());
      formDataToSend.append('dateReported', dateTime.toISOString());

      // Add attachments
      selectedFiles.forEach((file) => {
        formDataToSend.append('attachments', file);
      });

      // Submit to edit endpoint (no daily limit)
      const responseData = await apiFormRequest('/incidents/report-edit', formDataToSend);

      console.log('SUCCESS: Incident report saved:', responseData);

      showToast({
        type: 'success',
        title: 'Report Submitted Successfully!',
        message: 'Incident report has been submitted.',
        durationMs: 5000
      });

      // Reset form
      setFormData({
        incidentType: '',
        description: '',
        location: '',
        latitude: null,
        longitude: null,
        priorityLevel: 'critical',
        safetyStatus: '',
        guestName: '',
        guestContact: '',
        dateReported: new Date().toISOString().slice(0, 16),
        attachments: []
      });
      setSelectedFiles([]);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('Incident report submission failed:', error);
      
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || 'Failed to submit incident report. Please try again.',
        durationMs: 6000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Incident Report</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Guest Information */}
        <div>
          <h2>Your Information</h2>
          
          <div style={{ marginBottom: '10px' }}>
            <label>
              Full Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.guestName}
              onChange={(e) => handleInputChange('guestName', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
            {errors.guestName && <p style={{ color: 'red', fontSize: '12px' }}>{errors.guestName}</p>}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>
              Contact Number <span style={{ color: 'red' }}>*</span>
            </label>
            <PhoneInput
              international
              defaultCountry="PH"
              value={formData.guestContact}
              onChange={(value) => handleInputChange('guestContact', value || '')}
            />
            {errors.guestContact && <p style={{ color: 'red', fontSize: '12px' }}>{errors.guestContact}</p>}
          </div>
        </div>

        {/* Date and Time */}
        <div>
          <h2>Date and Time</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Date & Time <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.dateReported}
              onChange={(e) => handleInputChange('dateReported', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
            {errors.dateReported && <p style={{ color: 'red', fontSize: '12px' }}>{errors.dateReported}</p>}
          </div>
        </div>

        {/* Incident Information */}
        <div>
          <h2>Incident Information</h2>
          
          <div style={{ marginBottom: '10px' }}>
            <label>
              Incident Type <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={formData.incidentType}
              onChange={(e) => handleInputChange('incidentType', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">Select incident type...</option>
              <option value="fire">Fire Emergency</option>
              <option value="medical">Medical Emergency</option>
              <option value="security">Security Incident</option>
              <option value="accident">Transport Accident</option>
              <option value="other">Other Emergency</option>
            </select>
            {errors.incidentType && <p style={{ color: 'red', fontSize: '12px' }}>{errors.incidentType}</p>}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>
              Description <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
            {errors.description && <p style={{ color: 'red', fontSize: '12px' }}>{errors.description}</p>}
          </div>
        </div>

        {/* Location */}
        <div>
          <h2>Location</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Location <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
            {errors.location && <p style={{ color: 'red', fontSize: '12px' }}>{errors.location}</p>}
          </div>

          <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label>Latitude (optional)</label>
              <input
                type="number"
                step="any"
                value={formData.latitude || ''}
                onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Longitude (optional)</label>
              <input
                type="number"
                step="any"
                value={formData.longitude || ''}
                onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
          </div>
        </div>

        {/* Priority and Safety */}
        <div>
          <h2>Priority and Safety</h2>
          
          <div style={{ marginBottom: '10px' }}>
            <label>
              Priority Level <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={formData.priorityLevel}
              onChange={(e) => handleInputChange('priorityLevel', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            {errors.priorityLevel && <p style={{ color: 'red', fontSize: '12px' }}>{errors.priorityLevel}</p>}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>
              Safety Status <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={formData.safetyStatus}
              onChange={(e) => handleInputChange('safetyStatus', e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">Select safety status...</option>
              <option value="safe">I am safe - Not in immediate danger</option>
              <option value="injured">I am injured - Need medical attention</option>
              <option value="danger">I am in danger - Need immediate help</option>
            </select>
            {errors.safetyStatus && <p style={{ color: 'red', fontSize: '12px' }}>{errors.safetyStatus}</p>}
          </div>
        </div>

        {/* Attachments */}
        <div>
          <h2>Attachments (Optional)</h2>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
            <p style={{ fontSize: '12px', color: '#666' }}>
              PNG, JPG, GIF, WebP up to 10MB each (max 5 files)
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p>Selected files:</p>
              {selectedFiles.map((file, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', border: '1px solid #ddd', marginBottom: '5px' }}>
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    style={{ padding: '5px 10px', background: '#ff4444', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: '20px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              background: isSubmitting ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>

        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '12px',
              background: '#666',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

