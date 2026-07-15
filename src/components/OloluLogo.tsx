import React from 'react';

interface OloluLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  light?: boolean;
}

export default function OloluLogo({ className = '', size = 'md', variant = 'full', light = false }: OloluLogoProps) {
  // Sizing definitions
  const sizeMap = {
    xs: 'w-10 h-10',
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
    xl: 'w-48 h-48',
  };

  const selectedSize = sizeMap[size];

  // Map silhouette SVG path (detailed organic Lumajang outline)
  const mapPath = (
    <path
      d="M 200,40
         C 215,45 225,30 240,48
         C 255,42 265,58 278,52
         C 290,65 310,55 315,75
         C 335,80 345,95 340,115
         C 355,125 365,140 350,158
         C 345,172 335,165 328,182
         C 335,195 342,212 328,228
         C 318,222 312,238 302,245
         C 305,262 312,278 295,292
         C 280,285 272,305 255,298
         C 248,312 252,332 238,342
         C 225,332 215,348 202,352
         C 190,338 178,345 165,335
         C 152,342 142,328 135,322
         C 138,308 122,298 128,282
         C 115,275 102,282 95,268
         C 102,255 108,242 102,228
         C 92,222 82,215 85,202
         C 75,195 65,188 72,172
         C 80,175 88,182 95,172
         C 98,155 85,142 98,132
         C 105,138 112,145 122,138
         C 128,122 118,112 128,102
         C 135,108 142,115 152,108
         C 158,92 148,82 158,72
         C 165,78 172,85 182,78
         C 188,62 178,52 188,45
         C 192,50 196,55 200,40 Z"
      fill="#FFFFFF"
    />
  );

  // Modern scooter vector graphic centered inside viewBox 400x400
  const scooterGroup = (
    <g transform="translate(0, -10)">
      {/* Rear Wheel */}
      <circle cx="150" cy="190" r="24" stroke="#046A38" strokeWidth="5.5" fill="none" />
      <circle cx="150" cy="190" r="15" stroke="#046A38" strokeWidth="2" fill="none" />
      <circle cx="150" cy="190" r="5" fill="#046A38" />
      
      {/* Front Wheel */}
      <circle cx="250" cy="190" r="24" stroke="#046A38" strokeWidth="5.5" fill="none" />
      <circle cx="250" cy="190" r="15" stroke="#046A38" strokeWidth="2" fill="none" />
      <circle cx="250" cy="190" r="5" fill="#046A38" />

      {/* Exhaust Pipe */}
      <path d="M 152,194 L 188,194 L 205,178" stroke="#046A38" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 188,194 L 202,181" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

      {/* Engine */}
      <path d="M 150,190 L 180,190 L 185,175 L 160,170 Z" fill="#046A38" />

      {/* Body Frame */}
      <path d="M 158,165 L 185,165 L 205,182 L 222,182 L 210,150" stroke="#046A38" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Seat */}
      <path d="M 145,144 C 160,136 185,136 215,146 C 220,148 215,154 210,154 C 185,154 160,152 142,156 C 138,156 138,148 145,144 Z" fill="#046A38" />

      {/* Underseat Panel */}
      <path d="M 134,152 C 145,150 160,155 170,162 C 178,168 174,178 152,178 C 140,178 132,170 134,152 Z" fill="#046A38" />

      {/* Rear Fairing */}
      <path d="M 132,152 C 148,146 180,146 208,154 L 210,162 L 185,176 L 150,176 Z" fill="#046A38" />
      <path d="M 148,154 C 165,150 185,152 200,158" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Floorboard */}
      <path d="M 185,176 L 215,176 L 222,184 L 185,184 Z" fill="#046A38" />

      {/* Front Shield */}
      <path d="M 215,146 L 252,100 C 255,96 260,96 263,100 L 268,108 C 274,116 264,146 242,178 L 222,178 Z" fill="#046A38" />
      <path d="M 248,120 L 254,134 L 244,148" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Front Fender */}
      <path d="M 242,166 C 248,158 266,158 272,166" stroke="#046A38" strokeWidth="4.5" strokeLinecap="round" fill="none" />

      {/* Handlebars */}
      <path d="M 248,100 L 242,82" stroke="#046A38" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M 242,82 L 230,86" stroke="#046A38" strokeWidth="5" strokeLinecap="round" />
      <path d="M 242,82 L 236,68 C 234,64 238,60 242,64 Z" fill="#046A38" />
    </g>
  );

  if (variant === 'badge') {
    return (
      <div className={`flex items-center space-x-2.5 ${className}`}>
        {/* Compact Logo Frame with beautiful smooth rounded corners */}
        <div className="bg-white p-1 rounded-[14px] shadow-xs flex items-center justify-center shrink-0 w-9 h-9 border border-white/20">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Dark green background matching the logo */}
            <rect width="400" height="400" rx="90" fill="#046A38" />
            {mapPath}
            {scooterGroup}
          </svg>
        </div>
        
        {/* Compact Text Brand next to the badge */}
        <div className="text-left select-none">
          <span className={`block font-black text-sm tracking-tight leading-none ${light ? 'text-white' : 'text-[#046A38]'}`}>
            OLO<span className="text-[#D4AF37]">LU</span>
          </span>
          <span className={`block text-[8px] font-bold uppercase tracking-widest leading-none mt-1 ${light ? 'text-[#E6F4EC]/90' : 'text-gray-400'}`}>
            Ojek Lokal Lumajang
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Outer block of the logo - Squirclish rounded green card based on size */}
      <div className={`${selectedSize} relative aspect-square`}>
        <svg className="w-full h-full drop-shadow-md" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Beautifully rounded green background container (rx="80" for squircle style) */}
          <rect width="400" height="400" rx="80" fill="#046A38" />
          
          {/* White Lumajang Map silhouette */}
          {mapPath}
          
          {/* Green Scooter in the center of the map */}
          {scooterGroup}

          {/* OLOLU Bold Brand Text printed inside the map */}
          <text
            x="200"
            y="272"
            textAnchor="middle"
            fontFamily="'Inter', system-ui, sans-serif"
            fontWeight="900"
            fontSize="48"
            fill="#046A38"
            letterSpacing="-1.5"
          >
            OLOLU
          </text>
          
          {/* Subtitle text printed inside the map below brand */}
          <text
            x="200"
            y="308"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontWeight="600"
            fontSize="16"
            fill="#046A38"
            letterSpacing="-0.2"
          >
            Ojek Lokal Lumajang
          </text>
        </svg>
      </div>
    </div>
  );
}
