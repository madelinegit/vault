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

await sql`
  CREATE TABLE IF NOT EXISTS chat_conversations (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    persona text NOT NULL DEFAULT 'default',
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id text PRIMARY KEY NOT NULL,
    conversation_id text NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role text NOT NULL,
    content text NOT NULL,
    citations text,
    created_at timestamp DEFAULT now() NOT NULL
  )
`;

await sql.end();
console.log('[migrate] all tables ready');
