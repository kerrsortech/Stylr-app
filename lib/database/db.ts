import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Import ws for WebSocket support in Node.js environments
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

// Get DATABASE_URL and clean it up (in case it has extra quotes or prefixes)
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

// Clean up the URL if it has quotes or extra "DATABASE_URL=" prefix
databaseUrl = databaseUrl.trim();
if (databaseUrl.startsWith('DATABASE_URL=')) {
  databaseUrl = databaseUrl.substring('DATABASE_URL='.length);
}
if (databaseUrl.startsWith("'") && databaseUrl.endsWith("'")) {
  databaseUrl = databaseUrl.slice(1, -1);
}
if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
  databaseUrl = databaseUrl.slice(1, -1);
}

// Configure Neon for local development
if (process.env.NODE_ENV === 'development' && databaseUrl.includes('db.localtest.me')) {
  neonConfig.fetchEndpoint = (host) => {
    const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
    return `${protocol}://${host}:${port}/sql`;
  };
  
  const connectionStringUrl = new URL(databaseUrl);
  neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
  neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

