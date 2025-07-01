import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let isConnectedAtStartup = false;

const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Immediately test the connection and set the startup status.
dbPool.getConnection()
    .then(connection => {
        console.log('Database connected successfully at startup.');
        isConnectedAtStartup = true;
        connection.release();
    })
    .catch(err => {
        console.error('FATAL: Could not connect to the database at startup.', err);
        isConnectedAtStartup = false;
    });

/**
 * A function to get the database connection status that was determined at server startup.
 * @returns {boolean} True if the initial connection was successful.
 */
export const getDbConnectionStatus = () => {
    return isConnectedAtStartup;
};

export default dbPool;