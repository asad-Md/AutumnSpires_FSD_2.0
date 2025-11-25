import React from "react";

export default function PlainBtn({ 
  children, 
  onClick, 
  isActive = false, 
  buttonRef,
  className = "",
  ...props 
}) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`px-6 py-2 rounded-full font-medium cursor-pointer transition-colors relative z-10 ${
        isActive
          ? "text-black"
          : "text-white/85 hover:text-white transition-all duration-300 ease-in-out"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
