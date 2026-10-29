"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { emailValidationMessage } from "@/lib/email-validation";
import { authInputClass } from "./AuthShell";

export default function EmailField({ id, onChange, onBlur, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [error, setError] = useState("");
  const validate = (input: HTMLInputElement, show: boolean) => {
    const message = emailValidationMessage(input.value) || (input.validity.typeMismatch ? "Enter a valid email address, such as name@example.com." : "");
    input.setCustomValidity(message);
    if (show) setError(message);
  };
  return (
    <div className="text-sm font-medium">
      <label htmlFor={inputId} className="block">Email</label>
      <input {...props} id={inputId} type="email" autoComplete="email" className={authInputClass}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={event => { validate(event.currentTarget, Boolean(error)); onChange?.(event); }}
        onBlur={event => { validate(event.currentTarget, true); onBlur?.(event); }}
        onInvalid={event => { event.preventDefault(); validate(event.currentTarget, true); event.currentTarget.focus(); }}
      />
      {error && <p id={`${inputId}-error`} className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
    </div>
  );
}
