// Mock product data for Nike-style demo store
// This is completely separate from the plugin functionality

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number; // in dollars
  originalPrice?: number;
  category: 'men' | 'women' | 'kids' | 'accessories';
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  inStock: boolean;
  featured: boolean;
  tags: string[];
}

export const mockProducts: StoreProduct[] = [
  {
    id: '1',
    name: 'Air Max 90',
    description: 'The Nike Air Max 90 stays true to its OG running roots with the iconic Waffle sole, stitched overlays and classic TPU accents. Fresh colors give it a modern look while Max Air cushioning adds comfort to your journey.',
    price: 120,
    originalPrice: 150,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1605348532760-6753d2a43385?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'Black/White', hex: '#000000' },
      { name: 'Red', hex: '#DC2626' },
      { name: 'Blue', hex: '#2563EB' },
    ],
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
    inStock: true,
    featured: true,
    tags: ['running', 'classic', 'air max'],
  },
  {
    id: '2',
    name: 'Air Force 1 Low',
    description: 'The radiance lives on in the Nike Air Force 1 Low, the basketball original that puts a fresh spin on what you know best: durably stitched overlays, clean finishes and the perfect amount of flash to make you shine.',
    price: 90,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Black', hex: '#000000' },
    ],
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    inStock: true,
    featured: true,
    tags: ['basketball', 'classic', 'low-top'],
  },
  {
    id: '3',
    name: 'Dunk Low Retro',
    description: 'Created for the hardwood but taken to the streets, the Dunk Low returns with classic colors and throwback hoops flair. Its padded, low-cut collar lets you take your game anywhere—in comfort.',
    price: 100,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'Panda', hex: '#000000' },
      { name: 'University Blue', hex: '#1E40AF' },
    ],
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    inStock: true,
    featured: true,
    tags: ['basketball', 'retro', 'low-top'],
  },
  {
    id: '4',
    name: 'Air Jordan 1 High OG',
    description: 'The Air Jordan 1 High OG remakes the classic sneaker, giving you a fresh look with a familiar feel. Premium materials and new colors give the iconic design a new identity.',
    price: 170,
    originalPrice: 200,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1605348532760-6753d2a43385?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'Bred', hex: '#DC2626' },
      { name: 'Royal', hex: '#1E40AF' },
    ],
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    inStock: true,
    featured: true,
    tags: ['basketball', 'jordan', 'high-top'],
  },
  {
    id: '5',
    name: 'React Element 55',
    description: 'The Nike React Element 55 delivers a bold, futuristic design that stands out on the street. React foam cushioning provides a smooth, responsive ride.',
    price: 130,
    category: 'men',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'Black/White', hex: '#000000' },
      { name: 'Grey', hex: '#6B7280' },
    ],
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    inStock: true,
    featured: false,
    tags: ['running', 'react', 'modern'],
  },
  {
    id: '6',
    name: 'Air Max 270',
    description: 'The Nike Air Max 270 delivers visible cushioning under every step. The design draws inspiration from Air Max icons, showcasing Nike\'s greatest innovation with its large window and fresh array of colors.',
    price: 150,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'Pink', hex: '#EC4899' },
      { name: 'White', hex: '#FFFFFF' },
    ],
    sizes: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'],
    inStock: true,
    featured: true,
    tags: ['running', 'air max', 'women'],
  },
  {
    id: '7',
    name: 'Blazer Mid \'77',
    description: 'In the \'70s, Nike was the new shoe on the block. So new, in fact, we were still breaking into the basketball scene and testing prototypes on the feet of our local team. The Nike Blazer Mid \'77 Vintage—classic since the beginning.',
    price: 85,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Black', hex: '#000000' },
    ],
    sizes: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'],
    inStock: true,
    featured: false,
    tags: ['basketball', 'vintage', 'mid-top'],
  },
  {
    id: '8',
    name: 'Court Vision Low',
    description: 'The Nike Court Vision Low takes the classic basketball aesthetic and remasters it with modern materials and comfort. Perfect for the court or the street.',
    price: 75,
    category: 'women',
    images: [
      'https://images.unsplash.com/photo-1605348532760-6753d2a43385?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'White/Pink', hex: '#FFFFFF' },
      { name: 'Black', hex: '#000000' },
    ],
    sizes: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'],
    inStock: true,
    featured: false,
    tags: ['basketball', 'low-top', 'casual'],
  },
  {
    id: '9',
    name: 'Air Max 90 Kids',
    description: 'The Nike Air Max 90 for kids brings the iconic style to smaller feet. With the same classic design and comfortable cushioning, your little ones can rock the same style as you.',
    price: 80,
    category: 'kids',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'Multicolor', hex: '#F59E0B' },
      { name: 'Black/White', hex: '#000000' },
    ],
    sizes: ['10C', '11C', '12C', '13C', '1Y', '2Y', '3Y', '4Y'],
    inStock: true,
    featured: false,
    tags: ['kids', 'air max', 'running'],
  },
  {
    id: '10',
    name: 'Tech Pack Backpack',
    description: 'The Nike Tech Pack Backpack features multiple compartments, padded laptop sleeve, and water-resistant materials. Perfect for everyday use.',
    price: 65,
    category: 'accessories',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&h=800&fit=crop',
    ],
    colors: [
      { name: 'Black', hex: '#000000' },
      { name: 'Grey', hex: '#6B7280' },
    ],
    sizes: ['One Size'],
    inStock: true,
    featured: false,
    tags: ['backpack', 'tech', 'accessories'],
  },
];

export function getProductById(id: string): StoreProduct | undefined {
  return mockProducts.find(p => p.id === id);
}

export function getProductsByCategory(category: string): StoreProduct[] {
  if (category === 'all') return mockProducts;
  return mockProducts.filter(p => p.category === category);
}

export function getFeaturedProducts(): StoreProduct[] {
  return mockProducts.filter(p => p.featured);
}

