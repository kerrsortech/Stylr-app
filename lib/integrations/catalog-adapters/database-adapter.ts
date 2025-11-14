/**
 * Database adapter for fetching products from PostgreSQL, MySQL, and MongoDB
 * Uses connection strings for secure read-only access
 * 
 * This file should only be used on the server side (API routes, server components)
 * Database drivers (pg, mysql2, mongodb) are marked as external in Next.js config
 */

import { CatalogAdapter, Product } from './base-adapter';
import { mapProduct, SchemaMapping } from './schema-mapper';
import { logger } from '@/lib/utils/logger';

interface DatabaseConfig {
  connectionString: string;
  query?: string; // SQL query for PostgreSQL/MySQL
  table?: string; // Table name (alternative to query)
  collection?: string; // Collection name for MongoDB
  schemaMapping?: SchemaMapping;
}

/**
 * PostgreSQL Database Adapter
 */
export class PostgreSQLAdapter implements CatalogAdapter {
  async fetchProducts(
    config: DatabaseConfig,
    schemaMapping?: SchemaMapping,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      // Dynamic import to avoid loading if not needed
      const pg = await import('pg');
      const { Pool } = pg;
      
      const pool = new Pool({
        connectionString: config.connectionString,
        // Read-only connection settings
        max: 1, // Single connection for read-only
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      try {
        // Build query
        let query = config.query;
        if (!query && config.table) {
          query = `SELECT * FROM ${config.table} LIMIT ${limit} OFFSET ${offset}`;
        } else if (query) {
          // Add LIMIT and OFFSET if not present
          if (!query.toLowerCase().includes('limit')) {
            query += ` LIMIT ${limit}`;
          }
          if (!query.toLowerCase().includes('offset')) {
            query += ` OFFSET ${offset}`;
          }
        } else {
          throw new Error('Either query or table must be provided');
        }

        // Execute query
        const result = await pool.query(query);
        const rows = result.rows || [];

        // Get total count
        let total: number | undefined;
        try {
          const countQuery = config.table 
            ? `SELECT COUNT(*) as count FROM ${config.table}`
            : query.replace(/SELECT.*FROM/i, 'SELECT COUNT(*) as count FROM');
          const countResult = await pool.query(countQuery);
          total = parseInt(countResult.rows[0]?.count || '0', 10);
        } catch (err) {
          // Count query failed, continue without total
          logger.warn('Failed to get total count', { error: err });
        }

        // Map products
        const products = rows.map((row) => mapProduct(row, schemaMapping || config.schemaMapping || {}));

        return {
          products,
          total,
          hasMore: total ? offset + limit < total : rows.length === limit,
        };
      } finally {
        await pool.end();
      }
    } catch (error: any) {
      logger.error('PostgreSQL adapter error', error);
      throw new Error(`Failed to fetch products from PostgreSQL: ${error.message}`);
    }
  }

  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: config.connectionString,
        max: 1,
        connectionTimeoutMillis: 5000,
      });

      try {
        await pool.query('SELECT 1');
        return { success: true };
      } finally {
        await pool.end();
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProductCount(config: DatabaseConfig): Promise<number | null> {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: config.connectionString,
        max: 1,
      });

      try {
        const countQuery = config.table 
          ? `SELECT COUNT(*) as count FROM ${config.table}`
          : 'SELECT COUNT(*) as count FROM (' + (config.query || 'SELECT 1') + ') as subquery';
        const result = await pool.query(countQuery);
        return parseInt(result.rows[0]?.count || '0', 10);
      } finally {
        await pool.end();
      }
    } catch {
      return null;
    }
  }
}

/**
 * MySQL Database Adapter
 */
export class MySQLAdapter implements CatalogAdapter {
  async fetchProducts(
    config: DatabaseConfig,
    schemaMapping?: SchemaMapping,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      const mysql = await import('mysql2/promise');
      
      const connection = await mysql.createConnection(config.connectionString);

      try {
        // Build query
        let query = config.query;
        if (!query && config.table) {
          query = `SELECT * FROM ${config.table} LIMIT ${limit} OFFSET ${offset}`;
        } else if (query) {
          // Add LIMIT and OFFSET if not present
          if (!query.toLowerCase().includes('limit')) {
            query += ` LIMIT ${limit}`;
          }
          if (!query.toLowerCase().includes('offset')) {
            query += ` OFFSET ${offset}`;
          }
        } else {
          throw new Error('Either query or table must be provided');
        }

        // Execute query
        const [rows] = await connection.execute(query);

        // Get total count
        let total: number | undefined;
        try {
          const countQuery = config.table 
            ? `SELECT COUNT(*) as count FROM ${config.table}`
            : query.replace(/SELECT.*FROM/i, 'SELECT COUNT(*) as count FROM');
          const [countResult]: any = await connection.execute(countQuery);
          total = countResult[0]?.count || 0;
        } catch (err) {
          logger.warn('Failed to get total count', { error: err });
        }

        // Map products
        const products = (rows as any[]).map((row) => mapProduct(row, schemaMapping || config.schemaMapping || {}));

        return {
          products,
          total,
          hasMore: total ? offset + limit < total : (rows as any[]).length === limit,
        };
      } finally {
        await connection.end();
      }
    } catch (error: any) {
      logger.error('MySQL adapter error', error);
      throw new Error(`Failed to fetch products from MySQL: ${error.message}`);
    }
  }

  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection(config.connectionString);

      try {
        await connection.execute('SELECT 1');
        return { success: true };
      } finally {
        await connection.end();
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProductCount(config: DatabaseConfig): Promise<number | null> {
    try {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection(config.connectionString);

      try {
        const countQuery = config.table 
          ? `SELECT COUNT(*) as count FROM ${config.table}`
          : 'SELECT COUNT(*) as count FROM (' + (config.query || 'SELECT 1') + ') as subquery';
        const [result]: any = await connection.execute(countQuery);
        return result[0]?.count || 0;
      } finally {
        await connection.end();
      }
    } catch {
      return null;
    }
  }
}

/**
 * MongoDB Database Adapter
 */
export class MongoDBAdapter implements CatalogAdapter {
  async fetchProducts(
    config: DatabaseConfig,
    schemaMapping?: SchemaMapping,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      const { MongoClient } = await import('mongodb');
      
      const client = new MongoClient(config.connectionString);
      await client.connect();

      try {
        const db = client.db();
        const collection = db.collection(config.collection || 'products');

        // Parse query (MongoDB filter)
        let filter: any = {};
        if (config.query) {
          try {
            filter = JSON.parse(config.query);
          } catch {
            // If not valid JSON, treat as empty filter
            logger.warn('Invalid MongoDB query JSON, using empty filter');
          }
        }

        // Fetch products
        const cursor = collection.find(filter).skip(offset).limit(limit);
        const documents = await cursor.toArray();

        // Get total count
        let total: number | undefined;
        try {
          total = await collection.countDocuments(filter);
        } catch (err) {
          logger.warn('Failed to get total count', { error: err });
        }

        // Map products
        const products = documents.map((doc) => {
          // Convert MongoDB _id to string
          const product = { ...doc, id: doc._id?.toString() || String(doc._id) };
          return mapProduct(product, schemaMapping || config.schemaMapping || {});
        });

        return {
          products,
          total,
          hasMore: total ? offset + limit < total : documents.length === limit,
        };
      } finally {
        await client.close();
      }
    } catch (error: any) {
      logger.error('MongoDB adapter error', error);
      throw new Error(`Failed to fetch products from MongoDB: ${error.message}`);
    }
  }

  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(config.connectionString);
      
      await client.connect();
      await client.db().admin().ping();
      await client.close();
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProductCount(config: DatabaseConfig): Promise<number | null> {
    try {
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(config.connectionString);
      await client.connect();

      try {
        const db = client.db();
        const collection = db.collection(config.collection || 'products');

        let filter: any = {};
        if (config.query) {
          try {
            filter = JSON.parse(config.query);
          } catch {
            // Empty filter
          }
        }

        return await collection.countDocuments(filter);
      } finally {
        await client.close();
      }
    } catch {
      return null;
    }
  }
}

