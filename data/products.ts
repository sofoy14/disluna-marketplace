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
  {
    "sku": "92736",
    "name": "BRISA LIMA LIMON 600ML",
    "category": "AGUA ADICIONADA",
    "size": "17.7 L",
    "unitPrice": 2083,
    "boxPrice": 12500,
    "unitsPerBox": 6,
    "image": "/images/products/brisa-lima-limon-600ml-6.png",
    "description": "Agua adicionada refrescante con sabor natural."
  },
  {
    "sku": "92740",
    "name": "BRISA LIMA LIMÓN 1.5LT PET",
    "category": "AGUA ADICIONADA",
    "size": "44 ml",
    "unitPrice": 3342,
    "boxPrice": 40100,
    "unitsPerBox": 12,
    "image": "/images/products/brisa-lima-limon-15lt-pet-12.png",
    "description": "Agua adicionada refrescante con sabor natural."
  },
  {
    "sku": "92768",
    "name": "BRISA MANZANA 280ML PET",
    "category": "AGUA ADICIONADA",
    "size": "280 L",
    "unitPrice": 1204,
    "boxPrice": 28900,
    "unitsPerBox": 24,
    "image": "/images/products/brisa-manzana-280ml-pet-24.png",
    "description": "Agua adicionada refrescante con sabor natural."
  },
  {
    "sku": "92769",
    "name": "BRISA MANZANA 600ML",
    "category": "AGUA ADICIONADA",
    "size": "17.7 L",
    "unitPrice": 2083,
    "boxPrice": 12500,
    "unitsPerBox": 6,
    "image": "/images/products/brisa-manzana-600ml-6.png",
    "description": "Agua adicionada refrescante con sabor natural."
  },
  {
    "sku": "160170",
    "name": "BRISA GAS LIM 280ML PET",
    "category": "AGUA ADICIONADA",
    "size": "280 L",
    "unitPrice": 1204,
    "boxPrice": 28900,
    "unitsPerBox": 24,
    "image": "/images/products/brisa-gas-lim-280ml-pet-24.png",
    "description": "Agua adicionada refrescante con sabor natural."
  },
  {
    "sku": "160046",
    "name": "AGUA BRISA GAS PET 600ML",
    "category": "AGUA CON GAS",
    "size": "17.7 L",
    "unitPrice": 1333,
    "boxPrice": 32000,
    "unitsPerBox": 24,
    "image": "/images/products/agua-brisa-gas-pet-600ml-24.png",
    "description": "Agua con gas, refrescante burbujeante."
  },
  {
    "sku": "160008",
    "name": "BRISA ECOFLEX 1 LITRO",
    "category": "AGUA SIN GAS",
    "size": "30 ml",
    "unitPrice": 2000,
    "boxPrice": 12000,
    "unitsPerBox": 6,
    "image": "/images/products/brisa-ecoflex-1-litro-6.png",
    "description": "Agua purificada sin gas, hidratación natural."
  },
  {
    "sku": "160047",
    "name": "AGUA BRISA PET 600ML",
    "category": "AGUA SIN GAS",
    "size": "17.7 L",
    "unitPrice": 1154,
    "boxPrice": 27700,
    "unitsPerBox": 24,
    "image": "/images/products/agua-brisa-pet-600ml-24.png",
    "description": "Agua purificada sin gas, hidratación natural."
  },
  {
    "sku": "135664",
    "name": "COCA COLA 1.5LT PET Nvo",
    "category": "COLAS",
    "size": "44 ml",
    "unitPrice": 5417,
    "boxPrice": 65000,
    "unitsPerBox": 12,
    "image": "/images/products/coca-cola-15lt-pet12-nvo.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "135665",
    "name": "COCA COLA 2LT RP Nvo",
    "category": "COLAS",
    "size": "59 ml",
    "unitPrice": 5000,
    "boxPrice": 45000,
    "unitsPerBox": 9,
    "image": "/images/products/coca-cola-2lt-rp9-nvo.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "135666",
    "name": "COCA COLA 1.25LT RGB Nvo",
    "category": "COLAS",
    "size": "37 ml",
    "unitPrice": 2917,
    "boxPrice": 35000,
    "unitsPerBox": 12,
    "image": "/images/products/coca-cola-125lt-rgb12-nvo.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "135718",
    "name": "COCA COLA SO 8OZ VIR",
    "category": "COLAS",
    "size": "7.0 L",
    "unitPrice": 1200,
    "boxPrice": 36000,
    "unitsPerBox": 30,
    "image": "/images/products/coca-cola-so-8oz-vir-30.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "135760",
    "name": "COCA COLA S/AZ 400ML PETKZ",
    "category": "COLAS",
    "size": "11.8 L",
    "unitPrice": 2400,
    "boxPrice": 28800,
    "unitsPerBox": 12,
    "image": "/images/products/coca-cola-saz-400ml-pet12kz.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "135763",
    "name": "COCA COLA S/AZ 350ML VRKZ",
    "category": "COLAS",
    "size": "350 L",
    "unitPrice": 2083,
    "boxPrice": 62500,
    "unitsPerBox": 30,
    "image": "/images/products/coca-cola-saz-350ml-vr30kz.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "136415",
    "name": "COCA COLA SO 500ML PET",
    "category": "COLAS",
    "size": "14.8 L",
    "unitPrice": 2500,
    "boxPrice": 30000,
    "unitsPerBox": 12,
    "image": "/images/products/coca-cola-so-500ml-pet-12.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "160053",
    "name": "COCA-COLA 350ML VIR",
    "category": "COLAS",
    "size": "350 L",
    "unitPrice": 2083,
    "boxPrice": 62500,
    "unitsPerBox": 30,
    "image": "/images/products/coca-cola-350ml-vir30.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "160200",
    "name": "COCA COLA 250 ml",
    "category": "COLAS",
    "size": "7.4 L",
    "unitPrice": 1600,
    "boxPrice": 19200,
    "unitsPerBox": 12,
    "image": "/images/products/coca-cola-250-ml-12.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "160318",
    "name": "COCA-COLA 400ML PET",
    "category": "COLAS",
    "size": "11.8 L",
    "unitPrice": 2500,
    "boxPrice": 30000,
    "unitsPerBox": 12,
    "image": "/images/products/coca-cola-400ml-pet-12.png",
    "description": "Refresco cola con el sabor original."
  },
  {
    "sku": "160121",
    "name": "POWERADE ION4 FT 500ML PET",
    "category": "ISOTONICO E HIDROTONICOS",
    "size": "14.8 L",
    "unitPrice": 3167,
    "boxPrice": 19000,
    "unitsPerBox": 6,
    "image": "/images/products/powerade-ion4-ft-500ml-pet6.png",
    "description": "Bebida hidratante con electrolitos para recuperar energía."
  },
  {
    "sku": "160122",
    "name": "POWERADE ION4 MB 500ML PET",
    "category": "ISOTONICO E HIDROTONICOS",
    "size": "14.8 L",
    "unitPrice": 3167,
    "boxPrice": 19000,
    "unitsPerBox": 6,
    "image": "/images/products/powerade-ion4-mb-500ml-pet6.png",
    "description": "Bebida hidratante con electrolitos para recuperar energía."
  },
  {
    "sku": "120117",
    "name": "FRESH CITRUS 400ML PET NVO",
    "category": "NARANJADAS Y BEBIDAS DE FRUTA",
    "size": "11.8 L",
    "unitPrice": 1667,
    "boxPrice": 20000,
    "unitsPerBox": 12,
    "image": "/images/products/fresh-citrus-400ml-pet-12nvo.png",
    "description": "Bebida de fruta natural con pulpa."
  },
  {
    "sku": "120118",
    "name": "FRESH CITRUS 1.5LT PETNVO",
    "category": "NARANJADAS Y BEBIDAS DE FRUTA",
    "size": "44 ml",
    "unitPrice": 3750,
    "boxPrice": 45000,
    "unitsPerBox": 12,
    "image": "/images/products/fresh-citrus-15lt-pet12nvo.png",
    "description": "Bebida de fruta natural con pulpa."
  },
  {
    "sku": "120119",
    "name": "FRESH CITRUS 2.5LT PETNVO",
    "category": "NARANJADAS Y BEBIDAS DE FRUTA",
    "size": "74 ml",
    "unitPrice": 5000,
    "boxPrice": 40000,
    "unitsPerBox": 8,
    "image": "/images/products/fresh-citrus-25lt-pet8nvo.png",
    "description": "Bebida de fruta natural con pulpa."
  },
  {
    "sku": "120159",
    "name": "FRESH MANDARINA 1.5LT PETNVO",
    "category": "NARANJADAS Y BEBIDAS DE FRUTA",
    "size": "44 ml",
    "unitPrice": 3750,
    "boxPrice": 45000,
    "unitsPerBox": 12,
    "image": "/images/products/fresh-mandarina-15lt-pet12nvo.png",
    "description": "Bebida de fruta natural con pulpa."
  },
  {
    "sku": "120160",
    "name": "FRESH MANDARINA 2.5 LT PET NVO",
    "category": "NARANJADAS Y BEBIDAS DE FRUTA",
    "size": "74 ml",
    "unitPrice": 5000,
    "boxPrice": 40000,
    "unitsPerBox": 8,
    "image": "/images/products/fresh-mandarina-25-lt-pet-8nvo.png",
    "description": "Bebida de fruta natural con pulpa."
  },
  {
    "sku": "56452",
    "name": "SCHWEPPES SODA 400ML PET",
    "category": "SABORES",
    "size": "11.8 L",
    "unitPrice": 2092,
    "boxPrice": 25100,
    "unitsPerBox": 12,
    "image": "/images/products/schweppes-soda-400ml-pet12.png",
    "description": "Refresco de sabores refrescante."
  },
  {
    "sku": "56453",
    "name": "SCHWEPPES GINGER 400ML PET",
    "category": "SABORES",
    "size": "11.8 L",
    "unitPrice": 2092,
    "boxPrice": 25100,
    "unitsPerBox": 12,
    "image": "/images/products/schweppes-ginger-400ml-pet12.png",
    "description": "Refresco de jengibre con burbujas finas."
  },
  {
    "sku": "56703",
    "name": "QUATRO CHOICE 250ML PET",
    "category": "SABORES",
    "size": "7.4 L",
    "unitPrice": 1200,
    "boxPrice": 14400,
    "unitsPerBox": 12,
    "image": "/images/products/quatro-choice-250ml-pet-12.png",
    "description": "Refresco de frutas tropicales."
  },
  {
    "sku": "56705",
    "name": "QUATRO CHOICE 350ML VIR",
    "category": "SABORES",
    "size": "350 L",
    "unitPrice": 2083,
    "boxPrice": 62500,
    "unitsPerBox": 30,
    "image": "/images/products/quatro-choice-350ml-vir30.png",
    "description": "Refresco de frutas tropicales."
  },
  {
    "sku": "56706",
    "name": "QUATRO CHOICE 400ML NR",
    "category": "SABORES",
    "size": "11.8 L",
    "unitPrice": 2092,
    "boxPrice": 25100,
    "unitsPerBox": 12,
    "image": "/images/products/quatro-choice-400ml-nr-12.png",
    "description": "Refresco de frutas tropicales."
  },
  {
    "sku": "56708",
    "name": "QUATRO CHOICE 1.25LT VIR",
    "category": "SABORES",
    "size": "37 ml",
    "unitPrice": 2917,
    "boxPrice": 35000,
    "unitsPerBox": 12,
    "image": "/images/products/quatro-choice-125lt-vir12.png",
    "description": "Refresco de frutas tropicales."
  },
  {
    "sku": "56709",
    "name": "QUATRO CHOICE 1.5 LT PET",
    "category": "SABORES",
    "size": "44 ml",
    "unitPrice": 3750,
    "boxPrice": 45000,
    "unitsPerBox": 12,
    "image": "/images/products/quatro-choice-15-lt-pet-12.png",
    "description": "Refresco de frutas tropicales."
  },
  {
    "sku": "160100",
    "name": "SCHWEPPES GINGER 1.5 LT NR",
    "category": "SABORES",
    "size": "44 ml",
    "unitPrice": 4167,
    "boxPrice": 50000,
    "unitsPerBox": 12,
    "image": "/images/products/schweppes-ginger-15-lt-nr-12.png",
    "description": "Refresco de jengibre con burbujas finas."
  },
  {
    "sku": "160101",
    "name": "SCHWEPPES SODA 1.5 LT NR",
    "category": "SABORES",
    "size": "44 ml",
    "unitPrice": 3333,
    "boxPrice": 40000,
    "unitsPerBox": 12,
    "image": "/images/products/schweppes-soda-15-lt-nr-12.png",
    "description": "Refresco de sabores refrescante."
  },
  {
    "sku": "160102",
    "name": "SPRITE 1.5L PET",
    "category": "SABORES",
    "size": "44 ml",
    "unitPrice": 3750,
    "boxPrice": 45000,
    "unitsPerBox": 12,
    "image": "/images/products/sprite-15l-pet-12.png",
    "description": "Refresco de lima-limón refrescante."
  },
  {
    "sku": "160124",
    "name": "SPRITE 3 LTS PET",
    "category": "SABORES",
    "size": "89 ml",
    "unitPrice": 6250,
    "boxPrice": 37500,
    "unitsPerBox": 6,
    "image": "/images/products/sprite-3-lts-pet-6.png",
    "description": "Refresco de lima-limón refrescante."
  },
  {
    "sku": "160297",
    "name": "SPRITE 400 ML NR",
    "category": "SABORES",
    "size": "11.8 L",
    "unitPrice": 2092,
    "boxPrice": 25100,
    "unitsPerBox": 12,
    "image": "/images/products/sprite-400-ml-nr-12.png",
    "description": "Refresco de lima-limón refrescante."
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
