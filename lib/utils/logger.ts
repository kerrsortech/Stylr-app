export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({ 
      level: 'info', 
      message, 
      timestamp: new Date().toISOString(),
      ...meta 
    }));
  },

  error: (message: string, error: any, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },

  performance: (operation: string, durationMs: number, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'perf',
      operation,
      durationMs,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
};

