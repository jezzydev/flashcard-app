import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
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
        console.log(
            'Database connection test successful.',
            result.rows[0].now.toLocaleString(),
        );
    } catch (error) {
        console.log('Database connection test failed.', error);
        throw error;
    }
};

export default pool;
