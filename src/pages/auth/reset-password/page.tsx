import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';
import useForm from '../../../hooks/useForm';
import Navbar from '../../../components/Navbar';
import { useToast } from '../../../components/base/Toast';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Get email and OTP from location state if coming from verify-otp page
  const emailFromState = location.state?.email || '';
  const otpFromState = location.state?.otp || '';

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<ResetPasswordFormData>(
    {
      password: '',
      confirmPassword: ''
    },
    {
      password: {
        required: true,
        minLength: 6
      },
      confirmPassword: {
        required: true
      }
    }
  );

  // Redirect if no email or otp in state
  if (!emailFromState || !otpFromState) {
    navigate('/auth/forgot-password');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) return;

    const formData = getValues();

    // Manual password confirmation validation
    if (formData.password !== formData.confirmPassword) {
      showToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'Passwords do not match. Please try again.',
        durationMs: 4000
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Reset password data:', { email: emailFromState, otp: otpFromState });

      const apiUrl = import.meta.env.VITE_API_URL || 'https://soteros-backend-q2yihjhchq-et.a.run.app/api';
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailFromState.toLowerCase(),
          otp: otpFromState,
          newPassword: formData.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast({
          type: 'success',
          title: 'Password Reset Successful',
          message: 'Your password has been reset. Redirecting to login...',
          durationMs: 2000
        });
        setTimeout(() => {
          navigate('/auth/login');
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to reset password');
      }

    } catch (error) {
      console.error('Reset password failed:', error);
      showToast({
        type: 'error',
        title: 'Password Reset Failed',
        message: error instanceof Error ? error.message : 'Failed to reset password. Please try again.',
        durationMs: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-2xl flex items-center justify-center">
            <i className="ri-lock-password-line text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h1>
          <p className="text-gray-600">Enter your new password below</p>
          <p className="text-sm text-gray-600 mt-2">Email: <span className="font-medium">{emailFromState}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="New Password"
              type="password"
              name="password"
              id="password"
              value={fields.password.value}
              onChange={(e) => setValue('password', e.target.value)}
              error={fields.password.touched ? fields.password.error : ''}
              placeholder="Enter your new password"
              required
              autoComplete="new-password"
              icon={<i className="ri-lock-line"></i>}
            />

            <Input
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={fields.confirmPassword.value}
              onChange={(e) => setValue('confirmPassword', e.target.value)}
              error={fields.confirmPassword.touched ? fields.confirmPassword.error : ''}
              placeholder="Confirm your new password"
              required
              autoComplete="new-password"
              icon={<i className="ri-lock-line"></i>}
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
                  Resetting password...
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-8 pt-6 border-t border-gray-100">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-500 cursor-pointer font-medium"
            >
              <i className="ri-arrow-left-line"></i>
              Back to sign in
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Remember your password?{' '}
            <Link to="/auth/login" className="text-green-600 hover:text-green-500 cursor-pointer">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
