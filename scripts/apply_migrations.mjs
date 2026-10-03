import fs from 'fs';
import path from 'path';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'ubphrqumpqdifupwbvpe';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

async function applyMigration(fileName) {
  if (!accessToken) {
    console.error('Missing SUPABASE_ACCESS_TOKEN environment variable.');
    process.exit(1);
  }

  const filePath = path.join(migrationsDir, fileName);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`Applying migration: ${fileName}...`);

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Failed to apply ${fileName}: ${response.status} ${errText}`);
    return false;
  }

  console.log(`Successfully applied ${fileName}!`);
  return true;
}

async function run() {
  const targetFiles = [
    '20261003000007_iteration6_household_rwa_ownership.sql'
  ];

  for (const file of targetFiles) {
    const success = await applyMigration(file);
    if (!success) {
      console.error(`Stopping migration run due to error in ${file}`);
      process.exit(1);
    }
  }
  console.log('Target database migration 0007 applied successfully!');
}

run();
