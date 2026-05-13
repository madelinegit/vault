import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS vault_projects (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id text NOT NULL REFERENCES vault_categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS project_id text REFERENCES vault_projects(id) ON DELETE CASCADE
`;

await sql.end();
console.log('[migrate] vault_projects table ready');
