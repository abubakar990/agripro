import React from 'react';

const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-light',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-white',
    danger: 'bg-expense text-white hover:bg-opacity-90',
    ghost: 'text-primary hover:bg-primary hover:bg-opacity-10',
  };

  const sizes = {
    small: 'px-4 py-2 text-xs',
    default: 'px-8 py-3.5 text-[14px]',
    large: 'px-12 py-5 text-base',
  };

  return (
    <button 
      className={`rounded-btn font-bold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
