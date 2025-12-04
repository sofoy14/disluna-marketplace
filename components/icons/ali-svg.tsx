import { FC } from "react"

interface ALISVGProps {
  scale?: number
  showText?: boolean
}

export const ALISVG: FC<ALISVGProps> = ({ scale = 1, showText = true }) => {
  return (
    <svg
      width={64 * scale}
      height={64 * scale}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradiente radial para el fondo de la esfera */}
        <radialGradient id="sphereBg" cx="50%" cy="50%" r="55%" fx="45%" fy="45%">
          <stop offset="0%" stopColor="#0d1929"/>
          <stop offset="60%" stopColor="#070e18"/>
          <stop offset="100%" stopColor="#020408"/>
        </radialGradient>
        
        {/* Gradiente para el brillo azul/cyan superior derecho */}
        <radialGradient id="cyanGlow" cx="65%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#64d4e5" stopOpacity="0.9"/>
          <stop offset="30%" stopColor="#2cb5c9" stopOpacity="0.6"/>
          <stop offset="60%" stopColor="#0e7490" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0"/>
        </radialGradient>
        
        {/* Gradiente para el brillo magenta inferior izquierdo */}
        <radialGradient id="magentaGlow" cx="25%" cy="80%" r="45%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.95"/>
          <stop offset="25%" stopColor="#d946ef" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </radialGradient>
        
        {/* Gradiente secundario para efecto de curva magenta */}
        <linearGradient id="magentaCurve" x1="0%" y1="100%" x2="50%" y2="50%">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8"/>
          <stop offset="50%" stopColor="#d946ef" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#d946ef" stopOpacity="0"/>
        </linearGradient>
        
        {/* Filtro de desenfoque suave */}
        <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Máscara circular */}
        <clipPath id="circleClip">
          <circle cx="32" cy="32" r="30"/>
        </clipPath>
      </defs>
      
      {/* Círculo base (esfera oscura) */}
      <circle cx="32" cy="32" r="30" fill="url(#sphereBg)"/>
      
      {/* Grupo con clip para los efectos de luz */}
      <g clipPath="url(#circleClip)">
        {/* Brillo azul/cyan superior derecho */}
        <ellipse cx="44" cy="20" rx="28" ry="22" fill="url(#cyanGlow)" filter="url(#softGlow)"/>
        
        {/* Brillo magenta inferior izquierdo (forma de ola) */}
        <path d="M -4 40 Q 16 28 32 36 Q 44 44 40 64 L -4 64 Z" fill="url(#magentaGlow)" filter="url(#softGlow)"/>
        
        {/* Curva luminosa magenta */}
        <path d="M 4 56 Q 20 36 36 44" stroke="url(#magentaCurve)" strokeWidth="6" fill="none" filter="url(#softGlow)" strokeLinecap="round"/>
      </g>
      
      {/* Texto ALI */}
      {showText && (
        <text 
          x="32" 
          y="35" 
          fontFamily="Arial Black, Arial, sans-serif" 
          fontSize="15" 
          fontWeight="900" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fill="#a855f7" 
          letterSpacing="0.5"
        >
          ALI
        </text>
      )}
    </svg>
  )
}





