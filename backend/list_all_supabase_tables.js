const { Client } = require('pg');

const config = {
    user: 'postgres',
    host: 'db.quxtkdxrafulqibwbqld.supabase.co',
    database: 'postgres',
    password: 'Q!w2e3r4#@!',
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

async function listAllTables() {
    const client = new Client(config);
    try {
        await client.connect();
        const res = await client.query(`
            SELECT schemaname, tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY schemaname, tablename;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Database Error:', err.message);
    } finally {
        await client.end();
    }
}

listAllTables();
