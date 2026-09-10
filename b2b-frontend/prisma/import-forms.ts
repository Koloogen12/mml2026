// Imports historical demo-request submissions from data/forms/*.json into
// the LeadRequest table. Safe to run multiple times — skips any file whose
// mtime-based createdAt is already present in the DB for the same contact.
//
// Run: `npm run db:import-forms`

import fs from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JsonForm {
  name?: string;
  type?: string; // 'email' | 'tg' | 'wb' | 'tel'
  data?: string;
  ip?: string;
  date?: number; // ms epoch
}

async function main() {
  const dir = path.resolve(process.cwd(), 'data/forms');
  if (!fs.existsSync(dir)) {
    console.log(`no ${dir} — nothing to import`);
    return;
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('request-widget-demo-') && f.endsWith('.json'));

  console.log(`found ${files.length} JSON file(s)`);

  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const full = path.join(dir, file);
    let obj: JsonForm;
    try {
      obj = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      console.log(`  skip (bad json): ${file}`);
      skipped++;
      continue;
    }

    const name = obj.name?.trim();
    const type = obj.type?.trim();
    const value = obj.data?.trim();
    const ms =
      typeof obj.date === 'number' && obj.date > 0 ? obj.date : fs.statSync(full).mtimeMs;
    const createdAt = new Date(ms);

    if (!name || !type || !value) {
      skipped++;
      continue;
    }

    // De-dup on (createdAt, contact_value) — close enough for historical data.
    const dupe = await prisma.leadRequest.findFirst({
      where: {
        contactValue: value,
        createdAt: createdAt
      }
    });
    if (dupe) {
      skipped++;
      continue;
    }

    await prisma.leadRequest.create({
      data: {
        name,
        contactType: type,
        contactValue: value,
        ip: obj.ip ?? null,
        userAgent: null,
        referer: null,
        read: false,
        createdAt
      }
    });
    imported++;
  }

  console.log(`imported=${imported} skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
