import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Handle API errors - hide internal details from clients
 */
export function handleApiError(error: unknown): {
  status: number;
  body: { error: string; code?: string };
} {
  if (error instanceof AppError) {
    logger.error('Application error', error, {
      statusCode: error.statusCode,
      code: error.code,
    });

    return {
      status: error.statusCode,
      body: {
        error: error.userMessage || error.message,
        code: error.code,
      },
    };
  }

  // Log unexpected errors internally
  logger.error('Unexpected error', error);

  // Return generic error to client
  return {
    status: 500,
    body: {
      error: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
    },
  };
}

/**
 * Create user-friendly error messages
 */
export function createUserError(message: string, code?: string): AppError {
  return new AppError(400, message, code, message);
}

/**
 * Create server error (hidden from user)
 */
export function createServerError(message: string, code?: string): AppError {
  return new AppError(500, message, code, 'An error occurred. Please try again.');
}

/**
 * Sanitize error for client (remove sensitive info)
 */
export function sanitizeErrorForClient(error: any, requestId?: string): {
  error: string;
  errorType?: string;
  requestId?: string;
} {
  const errorMessage = error?.message || String(error);
  const errorType = error?.code || error?.errorType || "INTERNAL_ERROR";

  // Don't expose internal errors
  if (errorMessage.includes("API") || errorMessage.includes("key") || errorMessage.includes("token")) {
    return {
      error: "An error occurred during processing. Please try again.",
      errorType: "PROCESSING_ERROR",
      requestId,
    };
  }

  return {
    error: errorMessage,
    errorType,
    requestId,
  };
}

