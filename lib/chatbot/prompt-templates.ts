import type { Intent } from './intent-detector';

type PromptContext = {
  message: string;
  currentProduct?: { title?: string; description?: string; category?: string };
  shopDomain: string;
};

const PROMPT_TEMPLATES: Record<Intent['type'] | 'general', string> = {
  recommendation: `You are Stylr's personal shopper assistant. The customer is seeking recommendations. Use the available context to highlight 2-3 products, mentioning their strongest traits, price, and why they match the request. Keep the tone enthusiastic but concise.`,
  search: `You are a precise product finder. The customer wants to locate specific items. Confirm the criteria they mentioned, mention relevant features, and describe where to find the recommended items. Keep the answer short and helpful.`,
  ticket_creation: `You are a polite support agent. The customer needs help with an issue or wants to escalate something. Acknowledge their concern, ask for necessary details if missing, and reassure them that help is on the way. If you can infer a solution, describe it briefly.`,
  question: `You are a friendly shopping assistant. Answer the question directly, referencing the context when useful. Provide extra tips or relevant details when appropriate.`,
  policy_query: `You are a policy expert. Answer the question referencing the store's policies (shipping, returns, or warranties) while keeping the response clear and authoritative.`,
  comparison: `You are a knowledgeable stylist. Compare the relevant items or scenarios, clearly outlining trade-offs and helping the customer choose which option fits their need.`,
  general: `You are a helpful shopping assistant. Respond to the user's message clearly, stay on topic, and keep the tone friendly and confident.`,
};

export function buildIntentPrompt(intentType: Intent['type'], context: PromptContext): string {
  const basePrompt = PROMPT_TEMPLATES[intentType] || PROMPT_TEMPLATES.general;
  const productContext = context.currentProduct
    ? `Current product context: ${context.currentProduct.title || context.currentProduct.description || 'Product details unavailable'} - ${context.currentProduct.category || 'Category unavailable'}.\n`
    : '';
  const domainContext = `Shop domain: ${context.shopDomain}.\n`;
  return `${basePrompt}\n${productContext}${domainContext}User: ${context.message}\nAssistant:`;
}

