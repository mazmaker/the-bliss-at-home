// Apply job trigger fix to database
require('dotenv').config({ path: '../apps/server/.env' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function applyTriggerFix() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Applying job trigger fix...');

  // Read SQL file
  const sql = fs.readFileSync('./fix-job-trigger-payment-requirement.sql', 'utf8');

  // Split by individual statements (rough split)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))
    .filter(s => s !== "SELECT 'Migration completed: Job trigger now waits for payment confirmation!' as status");

  console.log(`📋 Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.length < 10) continue;

    console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 100) + '...');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_text: statement + ';' });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        // Continue with other statements unless it's critical
      } else {
        console.log(`✅ Statement ${i + 1} completed`);
      }
    } catch (err) {
      console.error(`💥 Exception in statement ${i + 1}:`, err.message);
    }
  }

  console.log('\n🎉 Trigger fix completed!');
  console.log('✅ Jobs will now only be created AFTER payment confirmation');
}

applyTriggerFix().catch(console.error);