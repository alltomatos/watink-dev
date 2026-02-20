const { Client } = require('pg');

const config = {
    user: 'postgres',
    host: 'db.quxtkdxrafulqibwbqld.supabase.co',
    database: 'postgres',
    password: 'Q!w2e3r4#@!',
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

async function listTables() {
    const client = new Client(config);
    try {
        await client.connect();
        const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

listTables();
