const { Client } = require('pg');

const config = {
    user: 'postgres',
    host: 'db.quxtkdxrafulqibwbqld.supabase.co',
    database: 'postgres',
    password: 'Q!w2e3r4#@!',
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

async function findMemory() {
    const client = new Client(config);
    try {
        await client.connect();
        
        // List all tables from all schemas
        const tablesRes = await client.query(`
            SELECT schemaname, tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        `);
        console.log('Tables:', tablesRes.rows);

        // Look for any table with 'memory', 'log', 'chat', 'conversation' in name
        for (const row of tablesRes.rows) {
            const table = row.tablename.toLowerCase();
            if (table.includes('memory') || table.includes('chat') || table.includes('conv') || table.includes('log') || table.includes('robot')) {
                console.log(`Checking table: ${row.schemaname}.${row.tablename}`);
                const dataRes = await client.query(`SELECT * FROM "${row.schemaname}"."${row.tablename}" LIMIT 20`);
                console.log(`Data from ${row.tablename}:`, dataRes.rows);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

findMemory();
