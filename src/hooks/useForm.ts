import { createSignal, createMemo } from "solid-js";
import type { ZodSchema, ZodError } from "zod";

/**
 * Custom hook for form state management with Zod validation
 *
 * @param schema - Zod schema for validation
 * @param initialValues - Initial form values
 * @returns Form state and helpers
 *
 * @example
 * ```tsx
 * const form = useForm(UserSchema, {
 *   name: "",
 *   email: "",
 * });
 *
 * <Input
 *   value={form.values().name}
 *   onInput={(e) => form.setValue("name", e.currentTarget.value)}
 * />
 * ```
 */
export function useForm<T extends Record<string, any>>(
  schema: ZodSchema<T>,
  initialValues: T,
) {
  const [values, setValues] = createSignal<T>(initialValues);
  const [errors, setErrors] = createSignal<Partial<Record<keyof T, string>>>(
    {},
  );
  const [touched, setTouched] = createSignal<Set<keyof T>>(new Set());
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const validate = () => {
    const result = schema.safeParse(values());
    if (!result.success) {
      const formattedErrors: Partial<Record<keyof T, string>> = {};
      (result.error as ZodError).issues.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0] as keyof T] = err.message;
        }
      });
      setErrors(() => formattedErrors);
      return false;
    }
    setErrors(() => ({}));
    return true;
  };

  const setValue = <K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => new Set(prev).add(field));
  };

  const setFieldError = (field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const clearFieldError = (field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const isValid = createMemo(() => {
    return schema.safeParse(values()).success;
  });

  const getFieldError = (field: keyof T) => {
    return touched().has(field) ? errors()[field] : undefined;
  };

  const reset = () => {
    setValues(() => initialValues);
    setErrors(() => ({}));
    setTouched(() => new Set<keyof T>());
    setIsSubmitting(false);
  };

  const handleSubmit = async (
    onSubmit: (values: T) => Promise<void> | void,
  ) => {
    // Mark all fields as touched
    setTouched(new Set(Object.keys(values()) as (keyof T)[]));

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values());
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldError,
    clearFieldError,
    getFieldError,
    validate,
    isValid,
    reset,
    handleSubmit,
  };
}
