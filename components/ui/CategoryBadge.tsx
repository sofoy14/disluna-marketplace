'use client';

import React from 'react';

interface CategoryBadgeProps {
  category: string;
  color?: string;
  className?: string;
}

// Mapeo de categorías comunes a colores predefinidos
const categoryColorMap: Record<string, string> = {
  'medicamentos': 'bg-red-100 text-red-800 border-red-200',
  'higiene': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'cuidado personal': 'bg-pink-100 text-pink-800 border-pink-200',
  'bebes': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'suplementos': 'bg-green-100 text-green-800 border-green-200',
  'vitaminas': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'dermocosmetica': 'bg-purple-100 text-purple-800 border-purple-200',
  'salud': 'bg-blue-100 text-blue-800 border-blue-200',
  'belleza': 'bg-rose-100 text-rose-800 border-rose-200',
  'ofertas': 'bg-orange-100 text-orange-800 border-orange-200',
};

// Colores DISLUNA personalizados
const dislunaColors: Record<string, string> = {
  'disluna-blue': 'bg-[#0B3D91] text-white border-[#0B3D91]',
  'disluna-light': 'bg-[#42A5F5] text-white border-[#42A5F5]',
  'disluna-secondary': 'bg-[#1E88E5] text-white border-[#1E88E5]',
};

const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  color,
  className = '',
}) => {
  const normalizedCategory = category.toLowerCase().trim();
  
  // Determinar las clases de color
  const colorClasses = color 
    ? (dislunaColors[color] || color)
    : (categoryColorMap[normalizedCategory] || 'bg-gray-100 text-gray-700 border-gray-200');

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 
        rounded-full text-xs font-medium
        border
        ${colorClasses}
        ${className}
      `}
    >
      {category}
    </span>
  );
};

export default CategoryBadge;
