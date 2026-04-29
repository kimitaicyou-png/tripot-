import { db } from '../src/lib/db';
import { members } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const r = await db.select({ id: members.id, name: members.name, email: members.email, role: members.role })
    .from(members)
    .where(eq(members.email, 'k.toki@coaris.ai'));
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
