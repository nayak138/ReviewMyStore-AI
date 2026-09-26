import { type FC } from "react";

export const BrandIcon: FC<{ size?: number; className?: string }> = ({
  size,
  className = "",
}) => (
  <svg
    {...(size ? { width: size, height: size } : {})}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <defs>
      <filter id="repo-store-shadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.15" />
      </filter>
      <filter id="repo-star-shadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#B45309" floodOpacity="0.3" />
      </filter>
      <linearGradient id="repo-blue-base" x1="60" y1="36" x2="60" y2="114" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2A75F3" />
        <stop offset="100%" stopColor="#1958DB" />
      </linearGradient>
      <linearGradient id="repo-star-grad" x1="60" y1="52" x2="60" y2="98" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE043" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="108" height="108" rx="26" fill="url(#repo-blue-base)" />
    <g filter="url(#repo-store-shadow)">
      <path d="M6 32 C6 18 16 6 32 6 L34.5 6 C34.5 28 34.5 36 34.5 38 C34.5 45 20.25 45 20.25 45 C11.5 45 6 38 6 32 Z" fill="#1A73E8" />
      <path d="M6 30 L34.5 30 L34.5 36 C34.5 43 6 43 6 36 Z" fill="#1A73E8" />
      <path d="M34.5 6 L60 6 L60 36 C60 43 34.5 43 34.5 36 Z" fill="#EA4335" />
      <path d="M60 6 L85.5 6 L85.5 36 C85.5 43 60 43 60 36 Z" fill="#FBBC04" />
      <path d="M85.5 6 L88 6 C104 6 114 18 114 32 C114 38 108.5 45 99.75 45 C99.75 45 85.5 45 85.5 38 L85.5 6 Z" fill="#34A853" />
      <path d="M85.5 30 L114 30 L114 36 C114 43 85.5 43 85.5 36 Z" fill="#34A853" />
    </g>
    <path d="M34.5 6 L34.5 38M60 6 L60 38M85.5 6 L85.5 38" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
    <path d="M60 52 L66.8 69.8 L85.6 70.8 L71 82.2 L76.1 100.2 L60 89.6 L43.9 100.2 L49 82.2 L34.4 70.8 L53.2 69.8 Z" fill="url(#repo-star-grad)" filter="url(#repo-star-shadow)" />
    <path d="M60 52 L66.8 69.8 L85.6 70.8 L71 82.2 L76.1 100.2 L60 89.6 Z" fill="rgba(255,255,255,0.18)" />
  </svg>
);

export const BrandLogo: FC<{
  variant?: "light" | "dark" | "icon-only";
  size?: "sm" | "md" | "lg" | "xl" | "responsive";
  className?: string;
  showText?: boolean;
}> = ({ variant = "light", size = "md", className = "", showText = true }) => {
  const responsive = size === "responsive";
  const iconSize = responsive ? undefined : { sm: 28, md: 36, lg: 44, xl: 56 }[size];
  const textSize = responsive ? "text-xl sm:text-2xl lg:text-3xl" : { sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-4xl" }[size];
  if (!showText || variant === "icon-only") {
    return <BrandIcon size={iconSize} className={`${responsive ? "w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11" : ""} ${className}`} />;
  }
  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2.5 font-bold tracking-tight select-none ${className}`}>
      <BrandIcon size={iconSize} className={responsive ? "w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11" : ""} />
      <div className="relative inline-flex items-center leading-none">
        <span className={`${textSize} font-extrabold tracking-tight ${variant === "light" ? "text-[#F4F4F6]" : "text-[#111827]"}`} style={{ letterSpacing: "-0.03em" }}>5-STAR</span>
        <div className="relative inline-flex items-center">
          <span className={`${textSize} font-extrabold text-[#2563EB] ml-0.5`} style={{ letterSpacing: "-0.02em" }}>.AI</span>
          <div className={`absolute pointer-events-none ${responsive ? "-top-2.5 -right-3 sm:-top-3.5 sm:-right-4.5 w-5 h-5 sm:w-6 sm:h-6 scale-75 sm:scale-90 lg:scale-100 origin-bottom-left" : "-top-3.5 -right-4.5 w-6 h-6"}`}>
            <svg className="absolute -top-0.5 left-0 w-3.5 h-3.5 text-[#2563EB]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0 C12 6.6 6.6 12 0 12 C6.6 12 12 17.4 12 24 C12 17.4 17.4 12 24 12 C17.4 12 12 6.6 12 0 Z" /></svg>
            <svg className="absolute -top-2 right-0.5 w-3 h-3 text-[#EA4335]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0 C12 6.6 6.6 12 0 12 C6.6 12 12 17.4 12 24 C12 17.4 17.4 12 24 12 C17.4 12 12 6.6 12 0 Z" /></svg>
            <svg className="absolute top-2.5 right-0 w-2.5 h-2.5 text-[#34A853]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0 C12 6.6 6.6 12 0 12 C6.6 12 12 17.4 12 24 C12 17.4 17.4 12 24 12 C17.4 12 12 6.6 12 0 Z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GoogleLogoSvg: FC<{ className?: string }> = ({ className = "" }) => (
  <svg height="36" viewBox="0 0 272 92" className={`inline-block align-middle shrink-0 ${className}`} aria-label="Google">
    <path fill="#EA4335" d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" />
    <path fill="#FBBC05" d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.63 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" />
    <path fill="#4285F4" d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z" />
    <path fill="#34A853" d="M225 3v65h-9.5V3h9.5z" />
    <path fill="#EA4335" d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z" />
    <path fill="#4285F4" d="M35.29 41.41V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49.01z" />
  </svg>
);