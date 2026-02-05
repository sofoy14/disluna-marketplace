"use client";

import { categories, getCategoryStyles } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  productCounts?: Record<string, number>;
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  productCounts = {},
}: CategoryFilterProps) {
  return (
    <div className="w-full">
      {/* Mobile: Horizontal scroll */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              selectedCategory === null
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            Todos
            <span className="ml-2 text-xs opacity-75">
              ({Object.values(productCounts).reduce((a, b) => a + b, 0)})
            </span>
          </button>
          {categories.map((category) => {
            const styles = getCategoryStyles(category.id);
            const count = productCounts[category.id] || 0;
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
                  isSelected
                    ? `${styles.bg} ${styles.text} ring-2 ring-offset-1`
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}

              >
                <span>{category.icon}</span>
                <span className="whitespace-nowrap">{category.name}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden lg:block">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
          Categorías
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200",
              selectedCategory === null
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            )}
          >
            <span className="font-medium">Todos los productos</span>
            <span
              className={cn(
                "text-sm",
                selectedCategory === null ? "text-slate-300" : "text-slate-500"
              )}
            >
              {Object.values(productCounts).reduce((a, b) => a + b, 0)}
            </span>
          </button>

          {categories.map((category) => {
            const styles = getCategoryStyles(category.id);
            const count = productCounts[category.id] || 0;
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200",
                  isSelected
                    ? `${styles.bg} ${styles.text} ring-2 ring-offset-1`
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                )}

              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                <span
                  className={cn(
                    "text-sm",
                    isSelected ? "opacity-75" : "text-slate-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
