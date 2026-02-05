export interface Category {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon?: string;
}

export const categories: Category[] = [
  {
    id: "AGUA ADICIONADA",
    name: "Agua Adicionada",
    color: "#10B981",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
    textColor: "text-emerald-800",
    icon: "💧"
  },
  {
    id: "AGUA CON GAS",
    name: "Agua con Gas",
    color: "#06B6D4",
    bgColor: "bg-cyan-100",
    borderColor: "border-cyan-300",
    textColor: "text-cyan-800",
    icon: "🫧"
  },
  {
    id: "AGUA SIN GAS",
    name: "Agua sin Gas",
    color: "#3B82F6",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    textColor: "text-blue-800",
    icon: "💧"
  },
  {
    id: "COLAS",
    name: "Colas",
    color: "#DC2626",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    textColor: "text-red-800",
    icon: "🥤"
  },
  {
    id: "ISOTONICO E HIDROTONICOS",
    name: "Isotónicos e Hidratantes",
    color: "#8B5CF6",
    bgColor: "bg-violet-100",
    borderColor: "border-violet-300",
    textColor: "text-violet-800",
    icon: "⚡"
  },
  {
    id: "NARANJADAS Y BEBIDAS DE FRUTA",
    name: "Naranjadas y Bebidas de Fruta",
    color: "#F97316",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
    textColor: "text-orange-800",
    icon: "🍊"
  },
  {
    id: "SABORES",
    name: "Sabores",
    color: "#84CC16",
    bgColor: "bg-lime-100",
    borderColor: "border-lime-300",
    textColor: "text-lime-800",
    icon: "🍋"
  }
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getCategoryColor(id: string): string {
  const category = getCategoryById(id);
  return category?.color ?? "#6B7280";
}

export function getCategoryStyles(id: string) {
  const category = getCategoryById(id);
  if (!category) {
    return {
      bg: "bg-gray-100",
      border: "border-gray-300",
      text: "text-gray-800",
      color: "#6B7280"
    };
  }
  return {
    bg: category.bgColor,
    border: category.borderColor,
    text: category.textColor,
    color: category.color
  };
}
