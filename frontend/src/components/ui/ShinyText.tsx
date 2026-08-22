import React from 'react';

interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
  speed?: number;
}

export function ShinyText({
  children,
  className = '',
  speed = 4,
}: ShinyTextProps) {
  return (
    <span
      className={`inline-block bg-[linear-gradient(110deg,#0F172A,45%,#EA580C,55%,#0F172A)] bg-[length:250%_100%] bg-clip-text text-transparent animate-shiny-text ${className}`}
      style={{
        animationDuration: `${speed}s`,
      }}
    >
      {children}
    </span>
  );
}

export function ShinyBadge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide overflow-hidden border border-orange-200/80 bg-orange-50/80 text-orange-800 ${className}`}
    >
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      {children}
    </span>
  );
}
