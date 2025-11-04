import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';
import useForm from '../../../hooks/useForm';
import Navbar from '../../../components/Navbar';
import { useToast } from '../../../components/base/Toast';

interface VerifyOTPFormData {
  otp: string;
}

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Get email from location state or query params
  const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<VerifyOTPFormData>(
    {
      otp: ''
    },
    {
      otp: {
        required: true,
        pattern: /^\d{6}$/
      }
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) return;

    const formData = getValues();

    setIsSubmitting(true);

    try {
      // Verify OTP with backend
      const apiUrl = import.meta.env.VITE_API_URL || 'https://soteros-backend-q2yihjhchq-et.a.run.app/api';
      const response = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          otp: formData.otp
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success toast
        showToast({
          type: 'success',
          title: 'Code Verified',
          message: 'OTP verified successfully. Redirecting to reset password...',
          durationMs: 2000
        });

        // OTP verified successfully, redirect to reset password
        setTimeout(() => {
          navigate('/auth/reset-password', {
            state: {
              email: email,
              otp: formData.otp
            }
          });
        }, 1500);
      } else {
        throw new Error(data.message || 'Invalid verification code');
      }

    } catch (error) {
      console.error('OTP verification failed:', error);
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: error instanceof Error ? error.message : 'Invalid verification code. Please try again.',
        durationMs: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://soteros-backend-q2yihjhchq-et.a.run.app/api';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast({
          type: 'success',
          title: 'Code Resent',
          message: 'Verification code has been sent again to your email.',
          durationMs: 3000
        });
      } else {
        throw new Error(data.message || 'Failed to resend code');
      }

    } catch (error) {
      console.error('Resend OTP failed:', error);
      showToast({
        type: 'error',
        title: 'Failed to Resend Code',
        message: error instanceof Error ? error.message : 'Failed to resend verification code. Please try again later.',
        durationMs: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if no email
  if (!email) {
    navigate('/auth/forgot-password');
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center">
            <i className="ri-shield-check-line text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
          <p className="text-gray-600">Enter the 6-digit code sent to your email</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Display */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Code sent to:</p>
              <p className="font-medium text-gray-900">{email}</p>
            </div>

            <Input
              label="Verification Code"
              type="text"
              name="otp"
              id="otp"
              value={fields.otp.value}
              onChange={(e) => setValue('otp', e.target.value)}
              error={fields.otp.touched ? fields.otp.error : ''}
              placeholder="Enter 6-digit code"
              required
              icon={<i className="ri-lock-password-line"></i>}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Verifying...
                </>
              ) : (
                'Verify code'
              )}
            </Button>
          </form>

          {/* Resend Code */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 mb-3">
              Didn't receive the code?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendOTP}
              disabled={isSubmitting}
            >
              Resend code
            </Button>
          </div>

          {/* Back to Forgot Password */}
          <div className="text-center mt-8 pt-6 border-t border-gray-100">
            <Link
              to="/auth/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 cursor-pointer font-medium"
            >
              <i className="ri-arrow-left-line"></i>
              Change email address
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Having trouble? Check your spam folder or contact{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:text-blue-500 cursor-pointer">
              support
            </a>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
