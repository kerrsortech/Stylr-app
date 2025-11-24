/**
 * Unified Demo Products Catalog
 * This is the single source of truth for demo products across the entire system
 * Used by chatbot, store pages, search API, and all product-related features
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  type: string;
  color: string;
  price: number; // in dollars
  sizes: string[];
  images: string[];
  description: string;
}

// Map product names to image filenames
const IMAGE_MAP: Record<string, string> = {
  'Oxford Navy Chinos': 'Navy Chinos.jpg',
  'Sky Blue Cotton Shirt': 'Blue Cotton Shirt.jpg',
  'Derby Formal Shoes': 'Derby Formal Shoes.jpg',
  'Navy Slim Fit Blazer': 'Navy Slim Fit Blazer.jpg',
  'Burgundy Textured Tie': 'Burgundy Textured Tie.jpg',
  'Classic White Dress Shirt': 'Classic White Dress Shirt.jpg',
  'Cognac Leather Belt': 'Cognac Leather Belt.jpg',
  'Charcoal Wool Trousers': 'Charcoal Wool Trousers.jpg',
  'Brown Leather Oxfords': 'Brown Leather Oxfords.jpg',
  'Navy Puffer Jacket': 'Navy Puffer Jacket.jpg',
  'Slim Fit Blue Jeans': 'Slim Fit Blue Jeans.jpg',
  'Beige Trench Coat': 'Beige Trench Coat.jpg',
  'Grey Knit Hoodie': 'Grey Knit Hoodie.jpg',
  'White Minimalist Sneakers': 'White Minimalist Sneakers.jpg',
  'Wayfarer Sunglasses': 'Wayfarer Sunglasses.jpg',
  'Navy Wool Beanie': 'Navy Wool Beanie.jpg',
  'Silver Silk Tie': 'Silver Silk Tie.jpg',
  'Casual Striped T-Shirt': 'Casual Striped T-Shirt.jpg',
  'Black Chelsea Boots': 'Black Chelsea Boots.jpg',
  'Textured Grey Blazer': 'Textured Grey Blazer.jpg',
  'Premium Italian Wool Blazer': 'Premium Italian Wool Blazer.jpg',
  'Basic Structured Blazer': 'Basic Structured Blazer.jpg',
  '100% Linen Blazer': 'Linen Blazer.jpg',
  'Grey Houndstooth Blazer': 'Grey Houndstooth Blazer.jpg',
};

/**
 * Get image path for a product
 */
function getProductImagePath(productName: string): string {
  const imageFile = IMAGE_MAP[productName];
  if (imageFile) {
    return `/Product_images/${imageFile}`;
  }
  // Fallback to placeholder if image not found
  return '/placeholder.svg?height=800&width=800';
}

export const demoProducts: Product[] = [
  {
    id: "p_001",
    name: "Oxford Navy Chinos",
    category: "Pants",
    type: "Chinos",
    color: "Navy Blue",
    price: 35,
    sizes: ["30", "32", "34", "36"],
    images: [getProductImagePath("Oxford Navy Chinos")],
    description: "Versatile slim-fit chinos in a deep navy hue. Made from stretch-cotton for all-day comfort. Perfect for office wear or smart-casual interviews. Features a wrinkle-resistant finish.",
  },
  {
    id: "p_002",
    name: "Sky Blue Cotton Shirt",
    category: "Shirts",
    type: "Formal",
    color: "Sky Blue",
    price: 25,
    sizes: ["S", "M", "L", "XL"],
    images: [getProductImagePath("Sky Blue Cotton Shirt")],
    description: "A crisp, breathable cotton shirt in a light sky blue. Features a structured collar that stands up well under a blazer. Essential for a professional, approachable interview look.",
  },
  {
    id: "p_003",
    name: "Derby Formal Shoes",
    category: "Shoes",
    type: "Formal",
    color: "Black",
    price: 35,
    sizes: ["7", "8", "9", "10", "11"],
    images: [getProductImagePath("Derby Formal Shoes")],
    description: "Classic black derby shoes with a polished finish. Designed with a cushioned sole for comfort during long commutes. The ideal budget-friendly footwear for formal occasions.",
  },
  {
    id: "p_004",
    name: "Navy Slim Fit Blazer",
    category: "Coats",
    type: "Blazer",
    color: "Navy Blue",
    price: 89,
    sizes: ["38", "40", "42", "44"],
    images: [getProductImagePath("Navy Slim Fit Blazer")],
    description: "A sharp, tailored navy blazer with a modern slim cut. Features structured shoulders and a notched lapel. The ultimate power piece for job interviews and business meetings.",
  },
  {
    id: "p_005",
    name: "Burgundy Textured Tie",
    category: "Accessories",
    type: "Tie",
    color: "Burgundy",
    price: 15,
    sizes: ["One Size"],
    images: [getProductImagePath("Burgundy Textured Tie")],
    description: "A rich burgundy tie with a subtle woven texture. Specifically designed to pop against blue and white shirts without being too loud. Adds a touch of confidence to any outfit.",
  },
  {
    id: "p_006",
    name: "Classic White Dress Shirt",
    category: "Shirts",
    type: "Formal",
    color: "White",
    price: 45,
    sizes: ["S", "M", "L", "XL"],
    images: [getProductImagePath("Classic White Dress Shirt")],
    description: "The gold standard of formal wear. 100% Egyptian cotton with a non-iron finish. Crisp, clean, and pairs with absolutely everything in your wardrobe.",
  },
  {
    id: "p_007",
    name: "Cognac Leather Belt",
    category: "Accessories",
    type: "Belt",
    color: "Brown",
    price: 20,
    sizes: ["30-32", "34-36", "38-40"],
    images: [getProductImagePath("Cognac Leather Belt")],
    description: "Genuine leather belt in a warm cognac brown. Features a brushed silver buckle. Matches perfectly with brown oxfords or loafers.",
  },
  {
    id: "p_008",
    name: "Charcoal Wool Trousers",
    category: "Pants",
    type: "Trousers",
    color: "Grey",
    price: 55,
    sizes: ["30", "32", "34", "36"],
    images: [getProductImagePath("Charcoal Wool Trousers")],
    description: "Premium wool-blend trousers in a dark charcoal grey. Tailored fit with a slight taper at the ankle. Ideal for colder days or strictly formal business environments.",
  },
  {
    id: "p_009",
    name: "Brown Leather Oxfords",
    category: "Shoes",
    type: "Formal",
    color: "Brown",
    price: 65,
    sizes: ["7", "8", "9", "10", "11"],
    images: [getProductImagePath("Brown Leather Oxfords")],
    description: "Hand-finished brown leather oxfords with intricate brogue detailing. Offers a sophisticated look that pairs excellently with navy or grey suits.",
  },
  {
    id: "p_010",
    name: "Navy Puffer Jacket",
    category: "Coats",
    type: "Jacket",
    color: "Navy Blue",
    price: 75,
    sizes: ["S", "M", "L", "XL"],
    images: [getProductImagePath("Navy Puffer Jacket")],
    description: "Lightweight yet incredibly warm puffer jacket. Water-resistant outer shell with synthetic down filling. Perfect for casual Fridays or commuting in unpredictable weather.",
  },
  {
    id: "p_011",
    name: "Slim Fit Blue Jeans",
    category: "Pants",
    type: "Jeans",
    color: "Blue",
    price: 40,
    sizes: ["30", "32", "34", "36"],
    images: [getProductImagePath("Slim Fit Blue Jeans")],
    description: "Classic indigo wash jeans with a modern slim silhouette. Contains 2% elastane for stretch and movement. The foundation of any smart-casual wardrobe.",
  },
  {
    id: "p_012",
    name: "Beige Trench Coat",
    category: "Coats",
    type: "Coat",
    color: "Beige",
    price: 110,
    sizes: ["M", "L", "XL"],
    images: [getProductImagePath("Beige Trench Coat")],
    description: "Iconic double-breasted trench coat. Features a waist belt and storm flap. Water-repellent fabric makes it an essential layer for rainy city days.",
  },
  {
    id: "p_013",
    name: "Grey Knit Hoodie",
    category: "Shirts",
    type: "Casual",
    color: "Grey",
    price: 30,
    sizes: ["S", "M", "L", "XL"],
    images: [getProductImagePath("Grey Knit Hoodie")],
    description: "Soft, loopback cotton jersey hoodie in marl grey. Minimalist design with no large logos, making it suitable for layering under denim jackets or coats.",
  },
  {
    id: "p_014",
    name: "White Minimalist Sneakers",
    category: "Shoes",
    type: "Sneakers",
    color: "White",
    price: 45,
    sizes: ["7", "8", "9", "10", "11"],
    images: [getProductImagePath("White Minimalist Sneakers")],
    description: "Clean, all-white sneakers with a low-profile silhouette. Vegan leather upper that is easy to wipe clean. Pairs effortlessly with chinos or jeans.",
  },
  {
    id: "p_015",
    name: "Wayfarer Sunglasses",
    category: "Accessories",
    type: "Sunglasses",
    color: "Black",
    price: 25,
    sizes: ["One Size"],
    images: [getProductImagePath("Wayfarer Sunglasses")],
    description: "Timeless wayfarer-style sunglasses with UV400 protection. Durable acetate frame in matte black. Adds an instant cool factor to any outfit.",
  },
  {
    id: "p_016",
    name: "Navy Wool Beanie",
    category: "Accessories",
    type: "Hat",
    color: "Navy Blue",
    price: 18,
    sizes: ["One Size"],
    images: [getProductImagePath("Navy Wool Beanie")],
    description: "Ribbed knit beanie made from a soft wool blend. Keeps you warm without overheating. A practical accessory for winter commutes.",
  },
  {
    id: "p_017",
    name: "Silver Silk Tie",
    category: "Accessories",
    type: "Tie",
    color: "Silver",
    price: 15,
    sizes: ["One Size"],
    images: [getProductImagePath("Silver Silk Tie")],
    description: "Elegant silver tie with a satin finish. The perfect companion for black formal events or weddings. Catches the light beautifully.",
  },
  {
    id: "p_018",
    name: "Casual Striped T-Shirt",
    category: "Shirts",
    type: "Casual",
    color: "Navy/White",
    price: 20,
    sizes: ["S", "M", "L", "XL"],
    images: [getProductImagePath("Casual Striped T-Shirt")],
    description: "Breton stripe t-shirt in navy and white. Made from heavyweight organic cotton. A classic staple for a relaxed weekend look.",
  },
  {
    id: "p_019",
    name: "Black Chelsea Boots",
    category: "Shoes",
    type: "Boots",
    color: "Black",
    price: 80,
    sizes: ["8", "9", "10", "11"],
    images: [getProductImagePath("Black Chelsea Boots")],
    description: "Sleek black leather Chelsea boots with elastic side panels. Durable rubber sole for grip. Can be dressed up with trousers or down with jeans.",
  },
  {
    id: "p_020",
    name: "Textured Grey Blazer",
    category: "Coats",
    type: "Blazer",
    color: "Grey",
    price: 95,
    sizes: ["38", "40", "42", "44"],
    images: [getProductImagePath("Textured Grey Blazer")],
    description: "A textured grey blazer featuring a herringbone weave. Adds depth and character to your outfit. Great for business casual settings where a suit is too much.",
  },
  {
    id: "p_021",
    name: "Premium Italian Wool Blazer",
    category: "Coats",
    type: "Blazer",
    color: "Navy Blue",
    price: 199,
    sizes: ["38", "40", "42", "44", "46"],
    images: [getProductImagePath("Premium Italian Wool Blazer")],
    description: "Luxurious suit blazer crafted from 100% Italian wool. Features a peaked lapel and double vents. The higher price point reflects the premium fabric quality and sartorial construction.",
  },
  {
    id: "p_022",
    name: "Basic Structured Blazer",
    category: "Coats",
    type: "Blazer",
    color: "Black",
    price: 89,
    sizes: ["36", "38", "40", "42", "44"],
    images: [getProductImagePath("Basic Structured Blazer")],
    description: "A minimalist black blazer with a structured shoulder. Designed for evening wear or strict formal codes. A sharp contrast to blue tones.",
  },
  {
    id: "p_023",
    name: "100% Linen Blazer",
    category: "Coats",
    type: "Blazer",
    color: "Beige",
    price: 129,
    sizes: ["38", "40", "42", "44"],
    images: [getProductImagePath("100% Linen Blazer")],
    description: "Lightweight and breathable linen blazer in a natural beige tone. Relaxed fit for summer events. Clearly distinct from formal navy office wear.",
  },
  {
    id: "p_024",
    name: "Grey Houndstooth Blazer",
    category: "Coats",
    type: "Blazer",
    color: "Grey",
    price: 149,
    sizes: ["38", "40", "42", "44"],
    images: [getProductImagePath("Grey Houndstooth Blazer")],
    description: "Textured blazer featuring a classic micro-houndstooth pattern in grey. Adds visual complexity to an outfit. A mid-range option for those who want pattern over solid colors.",
  },
];

/**
 * Get all products
 */
export function getAllProducts(): Product[] {
  return demoProducts;
}

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | undefined {
  return demoProducts.find((p) => p.id === id);
}

/**
 * Get products by category
 */
export function getProductsByCategory(category: string): Product[] {
  return demoProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get products by type
 */
export function getProductsByType(type: string): Product[] {
  return demoProducts.filter((p) => p.type.toLowerCase() === type.toLowerCase());
}

/**
 * Search products by query
 */
export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return demoProducts.filter((p) => {
    const searchText = `${p.name} ${p.description} ${p.category} ${p.type} ${p.color}`.toLowerCase();
    return searchText.includes(lowerQuery);
  });
}
