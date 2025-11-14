import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${uuidv4().substring(0, 9)}`;
}

/**
 * Get or create session ID from localStorage
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return generateSessionId();
  }

  const key = 'closelook_session_id';
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(key, sessionId);
  }

  return sessionId;
}

