import React from 'react';

interface SelectProps {
  label?: string;
  name?: string;
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: string;
}

export default function Select({
  label,
  name,
  id,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
  icon,
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className={`${icon} text-gray-400`}></i>
          </div>
        )}
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full ${icon ? 'pl-10 pr-4 py-4' : 'px-3 py-2.5'} text-sm border rounded-xl focus:ring-2 focus:outline-none transition-all duration-200 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
              : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-100'
          } ${
            disabled ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : 'bg-white'
          }`}
        >
          <option value="" disabled>
            Select an option
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <i className="ri-error-warning-line"></i>
          {error}
        </p>
      )}
    </div>
  );
}
