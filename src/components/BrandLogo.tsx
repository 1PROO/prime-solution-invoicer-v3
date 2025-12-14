import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "", variant = 'light' }) => {
  const textColor = variant === 'light' ? 'text-white' : 'text-brand-900';
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} dir="ltr">
      {/* Logo Text Recreation */}
      <h1 className={`font-bold text-3xl tracking-wide ${textColor} flex items-center gap-2`}>
        <span>Prime</span>
        <span className="relative">
          S
          <span className="text-accent-400">O</span>
          luti
          <span className="text-accent-400">O</span>
          n
          {/* Subtle stylized underline for the logo feel */}
          <span className="absolute -bottom-1 left-0 w-full h-1 bg-accent-400 rounded-full opacity-0"></span>
        </span>
      </h1>
      <p className={`text-xs uppercase tracking-[0.3em] mt-1 ${variant === 'light' ? 'text-brand-100' : 'text-brand-600'}`}>
        Buy Your Safety
      </p>
    </div>
  );
};