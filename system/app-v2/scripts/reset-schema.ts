import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const TRIPOT_V2_ENDPOINT_FRAGMENT = 'ep-curly-credit-an64xi55';
if (!url.includes(TRIPOT_V2_ENDPOINT_FRAGMENT)) {
  console.error('❌ Safety check failed: DATABASE_URL does not point to tripot-v2 branch.');
  console.error(`   Expected to contain: ${TRIPOT_V2_ENDPOINT_FRAGMENT}`);
  console.error('   Refusing to drop schema on a non-tripot-v2 branch.');
  process.exit(1);
}

const sql = neon(url);

async function main() {
  console.log('🔍 Verifying connection target...');
  const dbInfo = await sql`SELECT current_database() as db, current_schema() as schema, inet_server_addr() as host`;
  console.log('   Connected:', dbInfo[0]);

  console.log('⚠️  Dropping public schema on tripot-v2 branch...');
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  console.log('   Dropped.');

  console.log('🆕 Creating fresh public schema...');
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO neondb_owner`;
  await sql`GRANT ALL ON SCHEMA public TO public`;
  console.log('   Created.');

  console.log('✅ tripot-v2 branch schema reset complete.');
  console.log('   Next: run `npm run db:migrate` to apply migrations.');
}

main().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
