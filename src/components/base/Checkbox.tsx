
import React from 'react';

interface CheckboxProps {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export default function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  name,
  id
}: CheckboxProps) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed"
      />
      <label 
        htmlFor={id} 
        className={`ml-2 text-sm cursor-pointer ${
          disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
        }`}
      >
        {label}
      </label>
    </div>
  );
}
