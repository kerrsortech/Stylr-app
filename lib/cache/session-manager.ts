import { getRedisClient } from './redis-client';
import { logger } from '@/lib/utils/logger';

const SESSION_TTL = 60 * 60 * 24; // 24 hours
const CONVERSATION_TTL = 60 * 60 * 2; // 2 hours

export interface Session {
  sessionId: string;
  shopDomain: string;
  customerId: string | null;
  currentPage: {
    type: 'home' | 'product' | 'cart' | 'collection' | 'other';
    productId: string | null;
  };
  cart: {
    itemCount: number;
    totalPrice: number;
  };
  metadata: Record<string, any>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Store session data
 */
export async function setSession(session: Session): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = `session:${session.sessionId}`;
    await redis.setex(key, SESSION_TTL, JSON.stringify(session));
  } catch (error) {
    logger.error('Failed to set session', error);
    throw error;
  }
}

/**
 * Get session data
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const redis = await getRedisClient();
    const key = `session:${sessionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Failed to get session', error);
    return null;
  }
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const session = await getSession(sessionId);
    if (session) {
      session.metadata.lastActivityAt = Date.now();
      await setSession(session);
    }
  } catch (error) {
    logger.error('Failed to update session activity', error);
  }
}

/**
 * Store conversation history (keep last 6 messages)
 */
export async function addMessage(
  sessionId: string,
  message: Message
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = `conversation:${sessionId}`;

    // Get existing messages
    const existing = await redis.get(key);
    const messages: Message[] = existing ? JSON.parse(existing) : [];

    // Add new message
    messages.push(message);

    // Keep only last 6 messages
    const trimmed = messages.slice(-6);

    await redis.setex(key, CONVERSATION_TTL, JSON.stringify(trimmed));
  } catch (error) {
    logger.error('Failed to add message', error);
    throw error;
  }
}

/**
 * Get conversation history
 */
export async function getConversation(sessionId: string): Promise<Message[]> {
  try {
    const redis = await getRedisClient();
    const key = `conversation:${sessionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Failed to get conversation', error);
    return [];
  }
}

/**
 * Clear conversation history
 */
export async function clearConversation(sessionId: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = `conversation:${sessionId}`;
    await redis.del(key);
  } catch (error) {
    logger.error('Failed to clear conversation', error);
  }
}

