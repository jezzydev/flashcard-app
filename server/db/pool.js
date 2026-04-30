import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DB_URL,
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database.');
});

pool.on('error', (err, client) => {
    console.log(`${err}Unexpected database error: ${err}`);
    process.exit(1);
});

export const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection test successful.', result.rows[0]);
    } catch (error) {
        console.log('Database connection test failed.', error);
        throw error;
    }
};

export default pool;
