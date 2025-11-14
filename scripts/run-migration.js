// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');
const { readFileSync } = require('fs');
const { join } = require('path');

async function runMigration() {
  try {
    let databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in .env.local');
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

    // Get migration file from command line argument or use default
    const migrationFile = process.argv[2] || '0002_create_missing_tables.sql';
    console.log(`📦 Running migration: ${migrationFile}\n`);
    
    const sql = neon(databaseUrl);
    const migrationPath = join(process.cwd(), 'drizzle', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split by statement breakpoints, but keep DO blocks together
    const parts = migrationSQL.split('--> statement-breakpoint');
    const statements = [];
    
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i].trim();
      // Skip completely empty parts
      if (!part) {
        continue;
      }
      
      // Remove comment-only lines but keep DO blocks and SQL statements
      const lines = part.split('\n');
      const cleanedLines = [];
      let inDoBlock = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comment-only lines
        if (trimmed.length === 0) continue;
        if (trimmed.startsWith('--') && !trimmed.includes('CREATE') && !trimmed.includes('ALTER') && !trimmed.includes('DO $$')) {
          continue; // Skip comment lines
        }
        
        if (trimmed.startsWith('DO $$')) {
          inDoBlock = true;
          cleanedLines.push(line);
        } else if (inDoBlock) {
          cleanedLines.push(line);
          if (trimmed.includes('END $$;')) {
            inDoBlock = false;
          }
        } else {
          // Keep all non-comment lines (including CREATE TABLE, ALTER TABLE, etc.)
          cleanedLines.push(line);
        }
      }
      
      const cleaned = cleanedLines.join('\n').trim();
      if (cleaned) {
        statements.push(cleaned);
      }
    }
    
    console.log(`Found ${statements.length} statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
      try {
        await sql(statement);
        console.log(`  ✅ Success`);
      } catch (error) {
        // If it's a "already exists" error, that's okay
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.code === '42P07' || // duplicate_table
          error.code === '42710' // duplicate_object (for enums)
        )) {
          console.log(`  ⚠️  Skipping (already exists): ${error.message.split('\n')[0]}`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

