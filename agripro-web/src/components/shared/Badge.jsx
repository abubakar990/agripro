import React from 'react';

const Badge = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    info: 'bg-accent-blue bg-opacity-10 text-accent-blue',
    success: 'bg-accent-green bg-opacity-10 text-accent-green',
    warning: 'bg-accent-amber bg-opacity-10 text-accent-amber',
    danger: 'bg-expense bg-opacity-10 text-expense',
    primary: 'bg-primary bg-opacity-10 text-primary',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
