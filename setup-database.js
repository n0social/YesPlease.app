#!/usr/bin/env node

/**
 * Database Setup Script for YesPlease.app
 * 
 * This script automatically sets up the database by:
 * 1. Creating the database if it doesn't exist
 * 2. Running the initialization SQL script
 * 3. Verifying the setup
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
};

const dbName = process.env.DB_NAME || 'yesplease_app';

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🔄 Connecting to MySQL server...');
        
        // Connect to MySQL server (without specifying database)
        connection = await mysql.createConnection(config);
        
        console.log('✅ Connected to MySQL server');
        
        // Create database if it doesn't exist
        console.log(`🔄 Creating database '${dbName}' if it doesn't exist...`);
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Database '${dbName}' ready`);
        
        // Switch to the database
        await connection.execute(`USE \`${dbName}\``);
        
        // Read and execute the initialization SQL
        const sqlFilePath = path.join(__dirname, 'init-database.sql');
        
        if (!fs.existsSync(sqlFilePath)) {
            throw new Error(`SQL file not found: ${sqlFilePath}`);
        }
        
        console.log('🔄 Reading initialization SQL script...');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('🔄 Executing database initialization...');
        await connection.execute(sqlContent);
        
        console.log('✅ Database initialization completed successfully!');
        
        // Verify setup by checking if tables exist
        console.log('🔄 Verifying database setup...');
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            ORDER BY TABLE_NAME
        `, [dbName]);
        
        console.log('📋 Created tables:');
        tables.forEach(table => {
            console.log(`   - ${table.TABLE_NAME}`);
        });
        
        // Check if admin user exists
        const [adminUsers] = await connection.execute(`
            SELECT username, email, role 
            FROM users 
            WHERE role = 'admin'
        `);
        
        if (adminUsers.length > 0) {
            console.log('👤 Admin users:');
            adminUsers.forEach(admin => {
                console.log(`   - ${admin.username} (${admin.email})`);
            });
        }
        
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Update your .env file with the correct database credentials');
        console.log('2. Start the application with: npm start');
        console.log('3. Visit: http://localhost:3000');
        console.log('4. Admin panel: http://localhost:3000/admin/admin_login.html');
        console.log('5. Default admin login: admin / admin123 (⚠️  Change this password!)');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Troubleshooting:');
            console.error('- Check your MySQL username and password in .env file');
            console.error('- Make sure MySQL server is running');
            console.error('- Verify user has CREATE DATABASE privileges');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Troubleshooting:');
            console.error('- Make sure MySQL server is running');
            console.error('- Check if the host and port are correct in .env file');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
    setupDatabase();
}

export default setupDatabase;
