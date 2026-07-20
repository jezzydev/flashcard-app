import pool from './pool.js';
import type { PoolClient } from 'pg';

export async function query<T>(text: string, params?: any[]): Promise<T[]> {
    const result = await pool.query(text, params);
    return result.rows as T[];
}

export async function execute(text: string, params?: any[]): Promise<number> {
    const result = await pool.query(text, params);
    return result.rowCount ?? 0;
}

export async function withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
