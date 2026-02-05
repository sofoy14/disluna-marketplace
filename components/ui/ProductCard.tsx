'use client';

import React, { useState } from 'react';
import Button from './Button';
import QuantitySelector from './QuantitySelector';
import CategoryBadge from './CategoryBadge';

interface ProductCardProps {
  id: string | number;
  name: string;
  image?: string;
  pricePerUnit: number;
  pricePerBox: number;
  category: string;
  categoryColor?: string;
  unitLabel?: string;
  boxLabel?: string;
  onAddToCart?: (id: string | number, quantity: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  image,
  pricePerUnit,
  pricePerBox,
  category,
  categoryColor,
  unitLabel = 'unidad',
  boxLabel = 'caja',
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(id, quantity);
    }
  };

  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-[#42A5F5] hover:-translate-y-1">
      {/* Imagen del producto */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* Badge de categoría */}
        <div className="absolute top-3 left-3">
          <CategoryBadge category={category} color={categoryColor} />
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Nombre del producto */}
        <h3 className="text-gray-900 font-semibold text-base mb-2 line-clamp-2 min-h-[2.5rem]">
          {name}
        </h3>

        {/* Precios */}
        <div className="mb-4 space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#48BB78]">
              ${pricePerUnit.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500">/{unitLabel}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-gray-600">
              ${pricePerBox.toFixed(2)}
            </span>
            <span className="text-xs text-gray-400">/{boxLabel}</span>
          </div>
        </div>

        {/* Selector de cantidad y botón */}
        <div className="space-y-3">
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            min={1}
            size="sm"
          />
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleAddToCart}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
