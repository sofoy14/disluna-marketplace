export interface Product {
  sku: string;
  name: string;
  category: string;
  size: string;
  unitPrice: number;
  boxPrice: number;
  unitsPerBox: number;
  image?: string;
  description?: string;
}

export const products: Product[] = [
  // AGUA ADICIONADA - Brisa Lima Limón y Manzana
  {
    sku: "BRIS001",
    name: "Brisa Lima Limón PET",
    category: "AGUA ADICIONADA",
    size: "600 ml",
    unitPrice: 2800,
    boxPrice: 33600,
    unitsPerBox: 12,
    image: "/images/products/brisa-lima-limon-600ml.png",
    description: "Agua adicionada con sabor a lima limón, refrescante y deliciosa."
  },
  {
    sku: "BRIS002",
    name: "Brisa Lima Limón PET",
    category: "AGUA ADICIONADA",
    size: "1.5 L",
    unitPrice: 4500,
    boxPrice: 27000,
    unitsPerBox: 6,
    image: "/images/products/brisa-lima-limon-1.5l.png",
    description: "Agua adicionada con sabor a lima limón, presentación familiar."
  },
  {
    sku: "BRIS003",
    name: "Brisa Manzana PET",
    category: "AGUA ADICIONADA",
    size: "600 ml",
    unitPrice: 2800,
    boxPrice: 33600,
    unitsPerBox: 12,
    image: "/images/products/brisa-manzana-600ml.png",
    description: "Agua adicionada con sabor a manzana, refrescante y natural."
  },
  {
    sku: "BRIS004",
    name: "Brisa Manzana PET",
    category: "AGUA ADICIONADA",
    size: "1.5 L",
    unitPrice: 4500,
    boxPrice: 27000,
    unitsPerBox: 6,
    image: "/images/products/brisa-manzana-1.5l.png",
    description: "Agua adicionada con sabor a manzana, presentación familiar."
  },

  // AGUA CON GAS / SIN GAS - Brisa
  {
    sku: "BRIS005",
    name: "Brisa Sin Gas PET",
    category: "AGUA SIN GAS",
    size: "600 ml",
    unitPrice: 2200,
    boxPrice: 26400,
    unitsPerBox: 12,
    image: "/images/products/brisa-sin-gas-600ml.png",
    description: "Agua purificada sin gas, hidratación natural."
  },
  {
    sku: "BRIS006",
    name: "Brisa Sin Gas PET",
    category: "AGUA SIN GAS",
    size: "1 L",
    unitPrice: 3200,
    boxPrice: 25600,
    unitsPerBox: 8,
    image: "/images/products/brisa-sin-gas-1l.png",
    description: "Agua purificada sin gas, tamaño ideal para el día."
  },
  {
    sku: "BRIS007",
    name: "Brisa Sin Gas PET",
    category: "AGUA SIN GAS",
    size: "1.5 L",
    unitPrice: 3800,
    boxPrice: 22800,
    unitsPerBox: 6,
    image: "/images/products/brisa-sin-gas-1.5l.png",
    description: "Agua purificada sin gas, presentación familiar."
  },
  {
    sku: "BRIS008",
    name: "Brisa Con Gas PET",
    category: "AGUA CON GAS",
    size: "600 ml",
    unitPrice: 2400,
    boxPrice: 28800,
    unitsPerBox: 12,
    image: "/images/products/brisa-con-gas-600ml.png",
    description: "Agua con gas, refrescante burbujeante."
  },
  {
    sku: "BRIS009",
    name: "Brisa Con Gas PET",
    category: "AGUA CON GAS",
    size: "1.5 L",
    unitPrice: 4200,
    boxPrice: 25200,
    unitsPerBox: 6,
    image: "/images/products/brisa-con-gas-1.5l.png",
    description: "Agua con gas, presentación familiar burbujeante."
  },

  // COLAS - Coca-Cola
  {
    sku: "COKE001",
    name: "Coca-Cola Original",
    category: "COLAS",
    size: "250 ml",
    unitPrice: 2200,
    boxPrice: 52800,
    unitsPerBox: 24,
    image: "/images/products/coca-cola-250ml.png",
    description: "El sabor original de Coca-Cola en presentación individual."
  },
  {
    sku: "COKE002",
    name: "Coca-Cola Original",
    category: "COLAS",
    size: "400 ml",
    unitPrice: 3200,
    boxPrice: 38400,
    unitsPerBox: 12,
    image: "/images/products/coca-cola-400ml.png",
    description: "El sabor original de Coca-Cola."
  },
  {
    sku: "COKE003",
    name: "Coca-Cola Original",
    category: "COLAS",
    size: "1.5 L",
    unitPrice: 7500,
    boxPrice: 45000,
    unitsPerBox: 6,
    image: "/images/products/coca-cola-1.5l.png",
    description: "El sabor original de Coca-Cola, presentación familiar."
  },
  {
    sku: "COKE004",
    name: "Coca-Cola Original",
    category: "COLAS",
    size: "3 L",
    unitPrice: 12000,
    boxPrice: 36000,
    unitsPerBox: 3,
    image: "/images/products/coca-cola-3l.png",
    description: "El sabor original de Coca-Cola, mega presentación."
  },
  {
    sku: "COKE005",
    name: "Coca-Cola Sin Azúcar",
    category: "COLAS",
    size: "250 ml",
    unitPrice: 2200,
    boxPrice: 52800,
    unitsPerBox: 24,
    image: "/images/products/coca-cola-zero-250ml.png",
    description: "El gran sabor de Coca-Cola sin azúcar."
  },
  {
    sku: "COKE006",
    name: "Coca-Cola Sin Azúcar",
    category: "COLAS",
    size: "400 ml",
    unitPrice: 3200,
    boxPrice: 38400,
    unitsPerBox: 12,
    image: "/images/products/coca-cola-zero-400ml.png",
    description: "El gran sabor de Coca-Cola sin azúcar."
  },
  {
    sku: "COKE007",
    name: "Coca-Cola Sin Azúcar",
    category: "COLAS",
    size: "1.5 L",
    unitPrice: 7500,
    boxPrice: 45000,
    unitsPerBox: 6,
    image: "/images/products/coca-cola-zero-1.5l.png",
    description: "El gran sabor de Coca-Cola sin azúcar, presentación familiar."
  },
  {
    sku: "COKE008",
    name: "Coca-Cola Ligera",
    category: "COLAS",
    size: "400 ml",
    unitPrice: 3200,
    boxPrice: 38400,
    unitsPerBox: 12,
    image: "/images/products/coca-cola-light-400ml.png",
    description: "Coca-Cola con menos calorías."
  },
  {
    sku: "COKE009",
    name: "Coca-Cola Ligera",
    category: "COLAS",
    size: "1.5 L",
    unitPrice: 7500,
    boxPrice: 45000,
    unitsPerBox: 6,
    image: "/images/products/coca-cola-light-1.5l.png",
    description: "Coca-Cola con menos calorías, presentación familiar."
  },

  // ISOTONICO E HIDROTONICOS - Powerade
  {
    sku: "POWE001",
    name: "Powerade Frutas Tropicales",
    category: "ISOTONICO E HIDROTONICOS",
    size: "500 ml",
    unitPrice: 3500,
    boxPrice: 42000,
    unitsPerBox: 12,
    image: "/images/products/powerade-tropical-500ml.png",
    description: "Bebida hidratante con electrolitos, sabor frutas tropicales."
  },
  {
    sku: "POWE002",
    name: "Powerade Frutas Tropicales",
    category: "ISOTONICO E HIDROTONICOS",
    size: "1 L",
    unitPrice: 5500,
    boxPrice: 33000,
    unitsPerBox: 6,
    image: "/images/products/powerade-tropical-1l.png",
    description: "Bebida hidratante con electrolitos, sabor frutas tropicales."
  },
  {
    sku: "POWE003",
    name: "Powerade Moras",
    category: "ISOTONICO E HIDROTONICOS",
    size: "500 ml",
    unitPrice: 3500,
    boxPrice: 42000,
    unitsPerBox: 12,
    image: "/images/products/powerade-moras-500ml.png",
    description: "Bebida hidratante con electrolitos, sabor moras."
  },
  {
    sku: "POWE004",
    name: "Powerade Moras",
    category: "ISOTONICO E HIDROTONICOS",
    size: "1 L",
    unitPrice: 5500,
    boxPrice: 33000,
    unitsPerBox: 6,
    image: "/images/products/powerade-moras-1l.png",
    description: "Bebida hidratante con electrolitos, sabor moras."
  },
  {
    sku: "POWE005",
    name: "Powerade Naranja",
    category: "ISOTONICO E HIDROTONICOS",
    size: "500 ml",
    unitPrice: 3500,
    boxPrice: 42000,
    unitsPerBox: 12,
    image: "/images/products/powerade-naranja-500ml.png",
    description: "Bebida hidratante con electrolitos, sabor naranja."
  },
  {
    sku: "POWE006",
    name: "Powerade Naranja",
    category: "ISOTONICO E HIDROTONICOS",
    size: "1 L",
    unitPrice: 5500,
    boxPrice: 33000,
    unitsPerBox: 6,
    image: "/images/products/powerade-naranja-1l.png",
    description: "Bebida hidratante con electrolitos, sabor naranja."
  },
  {
    sku: "POWE007",
    name: "Powerade Manzana",
    category: "ISOTONICO E HIDROTONICOS",
    size: "500 ml",
    unitPrice: 3500,
    boxPrice: 42000,
    unitsPerBox: 12,
    image: "/images/products/powerade-manzana-500ml.png",
    description: "Bebida hidratante con electrolitos, sabor manzana."
  },

  // NARANJADAS Y BEBIDAS DE FRUTA - Fresh
  {
    sku: "FRES001",
    name: "Fresh Naranja",
    category: "NARANJADAS Y BEBIDAS DE FRUTA",
    size: "300 ml",
    unitPrice: 2800,
    boxPrice: 33600,
    unitsPerBox: 12,
    image: "/images/products/fresh-naranja-300ml.png",
    description: "Naranjada natural con pulpa de fruta."
  },
  {
    sku: "FRES002",
    name: "Fresh Naranja",
    category: "NARANJADAS Y BEBIDAS DE FRUTA",
    size: "1 L",
    unitPrice: 6500,
    boxPrice: 39000,
    unitsPerBox: 6,
    image: "/images/products/fresh-naranja-1l.png",
    description: "Naranjada natural con pulpa de fruta, presentación familiar."
  },
  {
    sku: "FRES003",
    name: "Fresh Mandarina",
    category: "NARANJADAS Y BEBIDAS DE FRUTA",
    size: "300 ml",
    unitPrice: 2800,
    boxPrice: 33600,
    unitsPerBox: 12,
    image: "/images/products/fresh-mandarina-300ml.png",
    description: "Bebida de mandarina con pulpa de fruta."
  },
  {
    sku: "FRES004",
    name: "Fresh Mandarina",
    category: "NARANJADAS Y BEBIDAS DE FRUTA",
    size: "1 L",
    unitPrice: 6500,
    boxPrice: 39000,
    unitsPerBox: 6,
    image: "/images/products/fresh-mandarina-1l.png",
    description: "Bebida de mandarina con pulpa de fruta, presentación familiar."
  },
  {
    sku: "FRES005",
    name: "Fresh Mango",
    category: "NARANJADAS Y BEBIDAS DE FRUTA",
    size: "300 ml",
    unitPrice: 2800,
    boxPrice: 33600,
    unitsPerBox: 12,
    image: "/images/products/fresh-mango-300ml.png",
    description: "Bebida de mango con pulpa de fruta."
  },
  {
    sku: "FRES006",
    name: "Fresh Mango",
    category: "NARANJADAS Y BEBIDAS DE FRUTA",
    size: "1 L",
    unitPrice: 6500,
    boxPrice: 39000,
    unitsPerBox: 6,
    image: "/images/products/fresh-mango-1l.png",
    description: "Bebida de mango con pulpa de fruta, presentación familiar."
  },

  // SABORES - Sprite, Schweppes, Quatro
  {
    sku: "SPRI001",
    name: "Sprite",
    category: "SABORES",
    size: "400 ml",
    unitPrice: 3200,
    boxPrice: 38400,
    unitsPerBox: 12,
    image: "/images/products/sprite-400ml.png",
    description: "Refresco de lima-limon refrescante."
  },
  {
    sku: "SPRI002",
    name: "Sprite",
    category: "SABORES",
    size: "1.5 L",
    unitPrice: 7500,
    boxPrice: 45000,
    unitsPerBox: 6,
    image: "/images/products/sprite-1.5l.png",
    description: "Refresco de lima-limon, presentación familiar."
  },
  {
    sku: "SCHW001",
    name: "Schweppes Ginger Ale",
    category: "SABORES",
    size: "300 ml",
    unitPrice: 3500,
    boxPrice: 42000,
    unitsPerBox: 12,
    image: "/images/products/schweppes-ginger-300ml.png",
    description: "Refresco de jengibre con burbujas finas."
  },
  {
    sku: "SCHW002",
    name: "Schweppes Ginger Ale",
    category: "SABORES",
    size: "1.5 L",
    unitPrice: 8500,
    boxPrice: 51000,
    unitsPerBox: 6,
    image: "/images/products/schweppes-ginger-1.5l.png",
    description: "Refresco de jengibre, presentación familiar."
  },
  {
    sku: "SCHW003",
    name: "Schweppes Tónica",
    category: "SABORES",
    size: "300 ml",
    unitPrice: 3500,
    boxPrice: 42000,
    unitsPerBox: 12,
    image: "/images/products/schweppes-tonica-300ml.png",
    description: "Agua tónica clásica con burbujas finas."
  },
  {
    sku: "QUAT001",
    name: "Quatro",
    category: "SABORES",
    size: "400 ml",
    unitPrice: 3200,
    boxPrice: 38400,
    unitsPerBox: 12,
    image: "/images/products/quatro-400ml.png",
    description: "Refresco de frutas tropicales."
  },
  {
    sku: "QUAT002",
    name: "Quatro",
    category: "SABORES",
    size: "1.5 L",
    unitPrice: 7500,
    boxPrice: 45000,
    unitsPerBox: 6,
    image: "/images/products/quatro-1.5l.png",
    description: "Refresco de frutas tropicales, presentación familiar."
  },
  {
    sku: "SPRI003",
    name: "Sprite Sin Azúcar",
    category: "SABORES",
    size: "400 ml",
    unitPrice: 3200,
    boxPrice: 38400,
    unitsPerBox: 12,
    image: "/images/products/sprite-zero-400ml.png",
    description: "Sprite refrescante sin azúcar."
  }
];

export function getProductBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export function getRelatedProducts(sku: string, limit: number = 4): Product[] {
  const product = getProductBySku(sku);
  if (!product) return [];
  
  return products
    .filter((p) => p.category === product.category && p.sku !== sku)
    .slice(0, limit);
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();
  products.forEach((p) => categories.add(p.category));
  return Array.from(categories);
}
