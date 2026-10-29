"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authInputClass } from "./AuthShell";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export default function PasswordField({ label = "Password", id, className = "", disabled, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const action = visible ? "Hide password" : "Show password";

  return (
    <div className="text-sm font-medium">
      <label htmlFor={inputId} className="block">{label}</label>
      <div className="relative mt-1">
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          type={visible ? "text" : "password"}
          className={`${authInputClass} !mt-0 !pr-14 ${className}`}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={action}
          aria-controls={inputId}
          title={action}
          onClick={() => setVisible(value => !value)}
          className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-[#c3cbd4] hover:text-[#d8c69e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c69e] disabled:opacity-50"
        >
          {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
