import React from "react";

export default function FormInput({
  type = "text",
  placeholder = "",
  value,
  onChange,
  required = false,
  className = "",
  maxLength,
  ...props
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      maxLength={maxLength}
      className={`w-4/5 px-6 py-3 bg-white/20 border border-white/20 rounded-full text-white focus:outline-none focus:border-gray-800/30 transition-all duration-300 ease-in-out ${className}`}
      {...props}
    />
  );
}
