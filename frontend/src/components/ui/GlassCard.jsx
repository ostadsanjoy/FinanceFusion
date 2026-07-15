import React from 'react';
import { twMerge } from 'tailwind-merge';

// Added "...props" so it can accept onClick, onHover, etc.
const GlassCard = ({ children, className, ...props }) => {
  return (
    <div 
      {...props} // <--- THIS line enables clicking!
      className={twMerge(
        "bg-white/60 backdrop-blur-md border border-white/50 shadow-soft rounded-3xl p-6",
        className
      )}
    >
      {children}
    </div>
  );
};

export default GlassCard;