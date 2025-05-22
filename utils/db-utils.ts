import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
if (!process.env.CI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'emp_db',
  connectTimeout: 60000
};

// Connection pool
let pool: mysql.Pool | null = null;

/**
 * Initialize the database connection pool
 */
export async function initPool(): Promise<mysql.Pool> {
  try {
    if (!pool) {
      console.log('Creating new MySQL connection pool');
      pool = mysql.createPool(dbConfig);
    }
    return pool;
  } catch (error) {
    console.error('Error initializing MySQL connection pool:', error);
    throw error;
  }
}

/**
 * Execute a query and return results
 * @param query - SQL query to execute
 * @param params - Parameters for prepared statement
 * @returns Query results
 */
export async function executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const connection = await initPool();
    const [results] = await connection.execute(query, params);
    return results as T[];
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('MySQL connection pool closed');
    }
  } catch (error) {
    console.error('Error closing MySQL connection pool:', error);
    throw error;
  }
}

/**
 * Execute a transaction with multiple queries
 * @param queries - Array of objects containing query strings and parameters
 * @returns Result of the transaction
 */
export async function executeTransaction(
  queries: { query: string; params: any[] }[]
): Promise<any[]> {
  const connection = await initPool();
  const conn = await connection.getConnection();
  
  try {
    // Set stronger transaction isolation level
    await conn.execute('SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    await conn.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await conn.execute(query, params);
      results.push(result);
    }
    
    await conn.commit();
    return results;
  } catch (error) {
    // Ensure rollback happens on any error
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Helper function to insert a record into a table
 * @param tableName - Name of the table
 * @param data - Object with column:value pairs
 * @returns Insert result
 */
export async function insertRecord(tableName: string, data: Record<string, any>): Promise<any> {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  
  const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
  
  const connection = await initPool();
  const [result] = await connection.execute(query, values);
  return result;
}

/**
 * Helper function to select records from a table
 * @param tableName - Name of the table
 * @param columns - Columns to select (default: *)
 * @param whereClause - WHERE clause without 'WHERE' keyword
 * @param params - Parameters for WHERE clause
 * @returns Selected records
 */
export async function selectRecords<T>(
  tableName: string, 
  columns: string[] = ['*'], 
  whereClause?: string, 
  params: any[] = []
): Promise<T[]> {
  const columnsStr = columns.join(', ');
  let query = `SELECT ${columnsStr} FROM ${tableName}`;
  
  if (whereClause) {
    query += ` WHERE ${whereClause}`;
  }
  
  return executeQuery<T>(query, params);
}

/**
 * Helper function to update records in a table
 * @param tableName - Name of the table
 * @param data - Object with column:value pairs to update
 * @param whereClause - WHERE clause without 'WHERE' keyword
 * @param params - Parameters for WHERE clause
 * @returns Update result
 */
export async function updateRecords(
  tableName: string,
  data: Record<string, any>,
  whereClause: string,
  params: any[] = []
): Promise<any> {
  const setClause = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = [...Object.values(data), ...params];
  
  const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
  
  const connection = await initPool();
  const [result] = await connection.execute(query, values);
  return result;
}

/**
 * Helper function to delete records from a table
 * @param tableName - Name of the table
 * @param whereClause - WHERE clause without 'WHERE' keyword
 * @param params - Parameters for WHERE clause
 * @returns Delete result
 */
export async function deleteRecords(
  tableName: string,
  whereClause: string,
  params: any[] = []
): Promise<any> {
  const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
  
  const connection = await initPool();
  const [result] = await connection.execute(query, params);
  return result;
}