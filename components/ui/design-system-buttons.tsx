import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'small';
}

const buttonStyles = {
  base: "inline-flex items-center justify-center font-medium transition-colors border-2 border-[#020B0A] rounded-md disabled:pointer-events-none disabled:opacity-50 button-shadow",
  primary: "bg-[#FAD9D4] text-[#020B0A] hover:bg-[#F5C7C1]",
  secondary: "bg-[#F2F2F2] text-[#020B0A] hover:bg-[#E5E5E5]",
  default: "px-6 py-3",
  small: "px-5 py-2"
};

export function PrimaryButton({ children, size = 'default', className = '', ...props }: ButtonProps) {
  const sizeClass = buttonStyles[size];
  
  return (
    <button 
      className={`${buttonStyles.base} ${buttonStyles.primary} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, size = 'default', className = '', ...props }: ButtonProps) {
  const sizeClass = buttonStyles[size];
  
  return (
    <button 
      className={`${buttonStyles.base} ${buttonStyles.secondary} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}