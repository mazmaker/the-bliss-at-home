import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', 'apps', 'server', '.env') })

const connectionString = 'postgresql://postgres.rbdvlfriqjnwpxmmgisf:Chitpon59.@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'

const client = new Client({ connectionString })

console.log('🔌 Connecting to database...')
await client.connect()

// Read the migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '020_fix_customers_insert_policy.sql')
const sql = readFileSync(migrationPath, 'utf-8')

console.log('🚀 Running migration: 020_fix_customers_insert_policy.sql\n')

try {
  const result = await client.query(sql)
  console.log('✅ Migration completed successfully!')
  console.log('📊 Rows affected:', result.rowCount)
} catch (error) {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
} finally {
  await client.end()
  console.log('🔌 Disconnected from database')
}
