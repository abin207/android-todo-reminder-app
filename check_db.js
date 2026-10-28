const { Pool } = require('./node_modules/pg');
require('./node_modules/dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, vault_id, title, status, deleted_at, updated_at FROM tasks ORDER BY updated_at DESC')
  .then(r => {
    console.log('All tasks in Supabase:', r.rows.length);
    r.rows.forEach(t => {
      console.log(' -', t.title, '| status:', t.status, '| deleted:', t.deleted_at ? 'YES' : 'no', '| vault:', t.vault_id.slice(0, 20));
    });
    return pool.end();
  })
  .catch(e => { console.error('Error:', e.message); pool.end(); });
