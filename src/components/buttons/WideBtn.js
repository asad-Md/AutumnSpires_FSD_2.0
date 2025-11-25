import React from "react";

export default function WideBtn({ 
  children, 
  onClick, 
  disabled = false,
  type = "button",
  className = "",
  ...props 
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-4/5 px-6 py-3 bg-white/80 hover:bg-white border border-gray-700/40 text-black/80 hover:text-black font-semibold rounded-full cursor-pointer transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
