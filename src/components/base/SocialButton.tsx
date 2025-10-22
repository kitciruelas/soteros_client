
import React from 'react';

interface SocialButtonProps {
  provider: 'google' | 'apple' | 'facebook' | 'github';
  onClick: () => void;
  disabled?: boolean;
}

export default function SocialButton({ provider, onClick, disabled = false }: SocialButtonProps) {
  const configs = {
    google: {
      icon: 'ri-google-fill',
      text: 'Continue with Google',
      bgColor: 'bg-white hover:bg-gray-50',
      textColor: 'text-gray-700',
      border: 'border border-gray-300'
    },
    apple: {
      icon: 'ri-apple-fill',
      text: 'Continue with Apple',
      bgColor: 'bg-black hover:bg-gray-900',
      textColor: 'text-white',
      border: ''
    },
    facebook: {
      icon: 'ri-facebook-fill',
      text: 'Continue with Facebook',
      bgColor: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      border: ''
    },
    github: {
      icon: 'ri-github-fill',
      text: 'Continue with GitHub',
      bgColor: 'bg-gray-900 hover:bg-gray-800',
      textColor: 'text-white',
      border: ''
    }
  };
  
  const config = configs[provider];
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full whitespace-nowrap cursor-pointer px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-3 focus:ring-4 focus:outline-none focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${config.bgColor} ${config.textColor} ${config.border}`}
    >
      <i className={`${config.icon} text-lg`}></i>
      {config.text}
    </button>
  );
}
