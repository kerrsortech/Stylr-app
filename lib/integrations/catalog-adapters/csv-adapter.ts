/**
 * CSV adapter for fetching products from CSV files
 */

import { CatalogAdapter, Product } from './base-adapter';
import { mapProduct, SchemaMapping, autoDetectMapping } from './schema-mapper';
import { logger } from '@/lib/utils/logger';

// Simple CSV parser (can be replaced with papaparse for better support)
function parseCsv(
  csvContent: string,
  options: { hasHeader: boolean; delimiter: string }
): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const delimiter = options.delimiter || ',';
  const headers = options.hasHeader
    ? lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
    : null;

  const rows: any[] = [];
  const startIndex = options.hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === 0) continue;

    const row: any = {};
    if (headers) {
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
    } else {
      values.forEach((value, index) => {
        row[`column${index + 1}`] = value;
      });
    }
    rows.push(row);
  }

  return rows;
}

interface CsvConfig {
  fileUrl?: string;
  s3Key?: string;
  csvContent?: string; // Direct CSV content
  hasHeader?: boolean;
  delimiter?: string;
}

export class CsvAdapter implements CatalogAdapter {
  async fetchProducts(
    config: CsvConfig,
    schemaMapping?: SchemaMapping,
    limit?: number,
    offset: number = 0
  ): Promise<{ products: Product[]; total?: number; hasMore: boolean }> {
    try {
      let csvContent: string;

      // Get CSV content
      if (config.csvContent) {
        csvContent = config.csvContent;
      } else if (config.fileUrl) {
        const response = await fetch(config.fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        csvContent = await response.text();
      } else if (config.s3Key) {
        // TODO: Implement S3 file fetching
        throw new Error('S3 CSV fetching not yet implemented');
      } else {
        throw new Error('No CSV source provided');
      }

      // Parse CSV (simple parser - can be replaced with papaparse)
      const rows = parseCsv(csvContent, {
        hasHeader: config.hasHeader !== false,
        delimiter: config.delimiter || ',',
      });

      // Auto-detect mapping if not provided
      let mapping = schemaMapping;
      if (!mapping && rows.length > 0) {
        mapping = autoDetectMapping(rows.slice(0, 10));
      }

      // Map products
      const allProducts = rows.map((row) => mapProduct(row, mapping || {}));

      // Apply pagination
      const paginatedProducts = limit
        ? allProducts.slice(offset, offset + limit)
        : allProducts;

      return {
        products: paginatedProducts,
        total: allProducts.length,
        hasMore: limit ? offset + limit < allProducts.length : false,
      };
    } catch (error: any) {
      logger.error('CSV adapter error', error);
      throw new Error(`Failed to fetch products from CSV: ${error.message}`);
    }
  }

  async testConnection(config: CsvConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (config.fileUrl) {
        const response = await fetch(config.fileUrl, { method: 'HEAD' });
        return {
          success: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`,
        };
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProductCount(config: CsvConfig): Promise<number | null> {
    try {
      const result = await this.fetchProducts(config, undefined, 1, 0);
      return result.total ?? null;
    } catch {
      return null;
    }
  }
}

