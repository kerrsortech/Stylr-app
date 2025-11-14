/**
 * Subscription Plans Configuration
 */

export interface Plan {
  id: number;
  name: 'basic' | 'pro' | 'elite' | 'enterprise';
  displayName: string;
  priceCents: number; // Monthly price in cents
  imageGenerationsLimit: number;
  chatOutputsLimit: number;
  imageResolution: '2K' | '4K';
  isPopular: boolean;
  description: string;
  features?: string[];
}

export const PLANS: Plan[] = [
  {
    id: 1,
    name: 'basic',
    displayName: 'Basic',
    priceCents: 7900, // $79.00
    imageGenerationsLimit: 600,
    chatOutputsLimit: 2000,
    imageResolution: '2K',
    isPopular: false,
    description: 'Perfect for small shops with a limited catalog—get started with photoreal try-ons and smart AI recommendations.',
    features: [
      '600 image generations per month',
      '2,000 chat outputs per month',
      '2K image resolution',
      'Basic support',
    ],
  },
  {
    id: 2,
    name: 'pro',
    displayName: 'Pro',
    priceCents: 14900, // $149.00
    imageGenerationsLimit: 1200,
    chatOutputsLimit: 4000,
    imageResolution: '4K',
    isPopular: true,
    description: 'Ideal for growing stores with high traffic and large product ranges—scale your business with advanced virtual try-on and AI features.',
    features: [
      '1,200 image generations per month',
      '4,000 chat outputs per month',
      '4K image resolution',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    id: 3,
    name: 'elite',
    displayName: 'Elite',
    priceCents: 29900, // $299.00
    imageGenerationsLimit: 2500,
    chatOutputsLimit: 10000,
    imageResolution: '4K',
    isPopular: false,
    description: 'Built for mature brands with diverse catalogs and high sales volumes—unlock premium virtual try-on and robust AI solutions for peak performance.',
    features: [
      '2,500 image generations per month',
      '10,000 chat outputs per month',
      '4K image resolution',
      'Premium support',
      'Advanced analytics',
      'Custom integrations',
    ],
  },
];

/**
 * Get plan by name
 */
export function getPlanByName(name: string): Plan | undefined {
  return PLANS.find(p => p.name === name);
}

/**
 * Get plan by ID
 */
export function getPlanById(id: number): Plan | undefined {
  return PLANS.find(p => p.id === id);
}

/**
 * Get default plan (Basic)
 */
export function getDefaultPlan(): Plan {
  return PLANS[0];
}

