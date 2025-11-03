
import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

interface FormField {
  value: any;
  error: string;
  touched: boolean;
}

export default function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule>> = {}
) {
  const [fields, setFields] = useState<Record<keyof T, FormField>>(() => {
    const initial: Record<keyof T, FormField> = {} as Record<keyof T, FormField>;
    Object.keys(initialValues).forEach((key) => {
      initial[key as keyof T] = {
        value: initialValues[key as keyof T],
        error: '',
        touched: false
      };
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof T, value: any): string => {
    const rules = validationRules[name];
    if (!rules) return '';

    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${String(name)} is required`;
    }

    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `${String(name)} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `${String(name)} must not exceed ${rules.maxLength} characters`;
    }

    // Only validate pattern if value exists (skip for optional empty fields)
    if (rules.pattern && typeof value === 'string' && value.trim() !== '' && !rules.pattern.test(value)) {
      return `${String(name)} format is invalid`;
    }

    if (rules.custom) {
      return rules.custom(value) || '';
    }

    return '';
  }, [validationRules]);

  const setValue = useCallback((name: keyof T, value: any) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        error: validateField(name, value),
        touched: true
      }
    }));
  }, [validateField]);

  const setError = useCallback((name: keyof T, error: string) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        error
      }
    }));
  }, []);

  const validateAll = useCallback((): boolean => {
    let hasErrors = false;
    const newFields = { ...fields };

    Object.keys(fields).forEach((key) => {
      const fieldKey = key as keyof T;
      const error = validateField(fieldKey, fields[fieldKey].value);
      newFields[fieldKey] = {
        ...newFields[fieldKey],
        error,
        touched: true
      };
      if (error) hasErrors = true;
    });

    setFields(newFields);
    return !hasErrors;
  }, [fields, validateField]);

  const getValues = useCallback((): T => {
    const values = {} as T;
    Object.keys(fields).forEach((key) => {
      values[key as keyof T] = fields[key as keyof T].value;
    });
    return values;
  }, [fields]);

  const reset = useCallback(() => {
    const resetFields: Record<keyof T, FormField> = {} as Record<keyof T, FormField>;
    Object.keys(initialValues).forEach((key) => {
      resetFields[key as keyof T] = {
        value: initialValues[key as keyof T],
        error: '',
        touched: false
      };
    });
    setFields(resetFields);
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    fields,
    setValue,
    setError,
    validateAll,
    getValues,
    reset,
    isSubmitting,
    setIsSubmitting
  };
}
