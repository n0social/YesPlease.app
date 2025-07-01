// =================================================================
//                  SERVER.JS (CORRECTED & REORGANIZED)
// =================================================================

// 1. CORE MODULE IMPORTS
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import session from 'express-session';
import MySQLSession from 'express-mysql-session';
import multer from 'multer';
import dbPool from './database.js';
import nodemailer from 'nodemailer';





// 2. INITIAL SETUP & CONFIGURATION
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory to convert to base64
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// 3. MIDDLEWARE PIPELINE (ORDER IS CRITICAL)

// 3.1. JSON Body Parser: To parse `application/json` request bodies.
app.use(express.json());

// 3.2. Session Middleware: To create and manage sessions.
const MySQLStore = MySQLSession(session);
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Best practice: only save sessions that are modified
    store: sessionStore,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
        sameSite: 'lax'
    }
}));


// Email configuration
// Replace the existing email configuration (around line 50) with this enhanced version:

// Enhanced email configuration with multiple provider support
// Replace the existing createEmailTransporter function with this corrected version:
const createEmailTransporter = () => {
    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
    
    let transportConfig;
    
    switch (emailProvider.toLowerCase()) {
        case 'smtp':
        case 'domain':
            // Your own domain/hosting SMTP (RECOMMENDED FOR PRODUCTION)
            transportConfig = {
                host: process.env.SMTP_HOST || 'localhost',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: false,
                    ciphers: 'SSLv3'
                },
                connectionTimeout: 60000, // 60 seconds
                greetingTimeout: 30000,   // 30 seconds
                socketTimeout: 60000,     // 60 seconds
                debug: process.env.NODE_ENV === 'development', // Enable debug in development
                logger: process.env.NODE_ENV === 'development'
            };
            break;
            case 'gmail':
    transportConfig = {
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    };
    break;
        case 'cpanel':
            // cPanel hosting SMTP
            transportConfig = {
                host: process.env.CPANEL_SMTP_HOST, // Usually mail.yourdomain.com
                port: 587,
                secure: false,
                auth: {
                    user: process.env.CPANEL_EMAIL_USER, // noreply@yourdomain.com
                    pass: process.env.CPANEL_EMAIL_PASS
                },
                tls: { rejectUnauthorized: false }
            };
            break;
            
        case 'plesk':
            // Plesk hosting SMTP
            transportConfig = {
                host: process.env.PLESK_SMTP_HOST,
                port: 587,
                secure: false,
                auth: {
                    user: process.env.PLESK_EMAIL_USER,
                    pass: process.env.PLESK_EMAIL_PASS
                },
                tls: { rejectUnauthorized: false }
            };
            break;
            
        case 'vps':
            // VPS with Postfix/Sendmail
            transportConfig = {
                host: process.env.VPS_SMTP_HOST || 'localhost',
                port: parseInt(process.env.VPS_SMTP_PORT) || 25,
                secure: false,
                auth: process.env.VPS_SMTP_USER ? {
                    user: process.env.VPS_SMTP_USER,
                    pass: process.env.VPS_SMTP_PASS
                } : false, // No auth for local sendmail
                tls: { rejectUnauthorized: false }
            };
            break;
            
        case 'postfix':
            // Direct Postfix (no authentication)
            transportConfig = {
                sendmail: true,
                newline: 'unix',
                path: '/usr/sbin/sendmail'
            };
            break;
            
        case 'test':
            // For development/testing only
            transportConfig = {
                host: 'smtp.mailtrap.io',
                port: 2525,
                auth: {
                    user: process.env.MAILTRAP_USER,
                    pass: process.env.MAILTRAP_PASS
                }
            };
            break;
            
        default:
            // Default SMTP configuration
            transportConfig = {
                host: process.env.SMTP_HOST || 'localhost',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER || 'noreply@localhost',
                    pass: process.env.SMTP_PASS || 'password'
                },
                tls: { rejectUnauthorized: false }
            };
    }
    
    console.log(`📧 Creating email transporter: ${emailProvider}`);
    console.log(`📧 SMTP Host: ${transportConfig.host}:${transportConfig.port || 'default'}`);
    console.log(`📧 From: ${process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@localhost'}`);
    
    return nodemailer.createTransport(transportConfig);
};

// Production-ready password reset email function
const sendPasswordResetEmail = async (email, resetLink, username) => {
    try {
        const transporter = createEmailTransporter();
        
        // Verify transporter configuration
        console.log('🔄 Verifying email configuration...');
        await transporter.verify();
        console.log('✅ Email transporter verified and ready');
        
        // Prepare email content
        const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@localhost';
        const fromName = process.env.FROM_NAME || 'Welcome App';
        const appDomain = process.env.APP_DOMAIN || 'localhost:3006';
        
        const mailOptions = {
            from: {
                name: fromName,
                address: fromEmail
            },
            to: email,
            subject: `Password Reset Request - ${fromName}`,
            text: `Hello ${username},

We received a request to reset your password for your ${fromName} account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour for your security.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons, this email was sent from an automated system. Please do not reply to this email.

Best regards,
The ${fromName} Team

---
${fromName} - Secure Password Reset System
${appDomain}`,
            html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset - ${fromName}</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                        
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #00bcd4, #00a1b8); padding: 40px 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">${fromName}</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Secure Password Reset</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; font-weight: 400;">Hello ${username},</h2>
                            
                            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                                We received a request to reset your password for your ${fromName} account.
                            </p>
                            
                            <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                                Click the button below to securely reset your password:
                            </p>
                            
                            <!-- Reset Button -->
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${resetLink}" 
                                   style="background: linear-gradient(135deg, #00bcd4, #00a1b8); 
                                          color: white; 
                                          padding: 16px 40px; 
                                          text-decoration: none; 
                                          border-radius: 8px; 
                                          display: inline-block; 
                                          font-weight: 600; 
                                          font-size: 16px;
                                          box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
                                          transition: all 0.3s ease;
                                          letter-spacing: 0.5px;">
                                    🔒 Reset My Password
                                </a>
                            </div>
                            
                            <!-- Security Notice -->
                            <div style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; padding: 20px; margin: 30px 0;">
                                <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">🔒 Security Notice</h4>
                                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                                    This password reset link will expire in <strong>1 hour</strong> for your security. 
                                    If you didn't request this reset, you can safely ignore this email.
                                </p>
                            </div>
                            
                            <!-- Support Info -->
                            <div style="background: #e8f4fd; border-radius: 6px; padding: 20px; margin: 30px 0;">
                                <h4 style="margin: 0 0 10px 0; color: #0c5460; font-size: 16px;">💡 Need Help?</h4>
                                <p style="margin: 0; color: #0c5460; font-size: 14px; line-height: 1.5;">
                                    If you're having trouble clicking the button, you can copy and paste the link below into your browser:
                                </p>
                            </div>
                            
                            <p style="color: #666; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8f9fa; padding: 30px; border-top: 1px solid #e9ecef;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                                    If the button doesn't work, copy this link:
                                </p>
                                <p style="margin: 0; font-size: 12px; color: #999; word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 4px;">
                                    <a href="${resetLink}" style="color: #00bcd4; text-decoration: none;">${resetLink}</a>
                                </p>
                            </div>
                            
                            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e9ecef;">
                            
                            <div style="text-align: center;">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #999;">
                                    This is an automated security email from <strong>${fromName}</strong>
                                </p>
                                <p style="margin: 0; font-size: 12px; color: #999;">
                                    Please do not reply to this email. This mailbox is not monitored.
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                                    © ${new Date().getFullYear()} ${fromName}. All rights reserved.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer Message -->
                    <div style="text-align: center; margin: 20px; color: #999; font-size: 12px;">
                        <p>Powered by ${fromName} In-House Email System</p>
                    </div>
                </body>
                </html>
            `
        };
        
        console.log(`📤 Sending password reset email to: ${email}`);
        const result = await transporter.sendMail(mailOptions);
        
        console.log('✅ Password reset email sent successfully:', {
            messageId: result.messageId,
            to: email,
            from: fromEmail,
            provider: process.env.EMAIL_PROVIDER || 'smtp'
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        
        // Detailed error logging for troubleshooting
        if (error.code === 'EAUTH') {
            console.error('❌ Authentication failed - check SMTP credentials');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error('❌ Connection failed - check SMTP host and port');
        } else if (error.code === 'EMESSAGE') {
            console.error('❌ Message rejected - check email content and FROM address');
        } else if (error.code === 'ENOTFOUND') {
            console.error('❌ SMTP host not found - check SMTP_HOST configuration');
        }
        
        // Log the reset link for manual recovery (remove in production)
        if (process.env.NODE_ENV === 'development') {
            console.log('🔗 MANUAL RESET LINK (Development Only):');
            console.log(`📧 User: ${email}`);
            console.log(`🔗 Link: ${resetLink}`);
        }
        
        return false;
    }
};

// Test email configuration on startup
const testGmailConfiguration = async () => {
    try {
        console.log('📧 Testing Gmail configuration...');
        console.log(`📧 Gmail Account: ${process.env.EMAIL_USER}`);
        
        const transporter = createEmailTransporter();
        
        // Test 1: Verify Gmail connection
        await transporter.verify();
        console.log('✅ Gmail SMTP connection verified successfully');
        
        // Test 2: Send a test email to yourself
        const testResult = await transporter.sendMail({
            from: {
                name: process.env.FROM_NAME || 'Welcome App Team',
                address: process.env.EMAIL_USER
            },
            to: process.env.EMAIL_USER, // Send test email to yourself
            subject: 'Gmail Configuration Test - Welcome App',
            text: 'This is a test email to verify your Gmail configuration is working correctly.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #00bcd4;">Gmail Configuration Test</h2>
                    <p>This is a test email to verify your Gmail configuration is working correctly.</p>
                    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                    <p><strong>Server:</strong> Welcome App</p>
                    <p><strong>From Account:</strong> ${process.env.EMAIL_USER}</p>
                    <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>✅ Gmail is working correctly!</strong></p>
                        <p style="margin: 5px 0 0 0;">Password reset emails will now be sent from this account.</p>
                    </div>
                </div>
            `
        });
        
        console.log('✅ Test email sent successfully!');
        console.log(`📧 Message ID: ${testResult.messageId}`);
        console.log('🎉 Gmail configuration is ready for production!');
        
        return true;
    } catch (error) {
        console.error('❌ Gmail configuration test failed:', error.message);
        
        // Provide helpful error messages
        if (error.code === 'EAUTH') {
            console.error('💡 Fix: Invalid Gmail credentials. Check your email and app password.');
            console.error('💡 Make sure you\'re using an App Password, not your regular Gmail password.');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('💡 Fix: Connection timeout. Check your internet connection.');
        }
        
        return false;
    }
};

// Update your existing initializeEmailSystem function to use the Gmail test:
const initializeEmailSystem = async () => {
    console.log('🚀 Initializing Gmail email system...');
    
    const isEmailWorking = await testGmailConfiguration();
    
    if (isEmailWorking) {
        console.log('✅ Gmail email system ready for production');
        console.log(`📧 Password reset emails will be sent from: ${process.env.EMAIL_USER}`);
        
        // Create success notification
        await createSystemNotification(
            'success',
            'Gmail Email System Ready',
            `Gmail email system initialized successfully. Password reset emails will be sent from ${process.env.EMAIL_USER}.`
        );
    } else {
        console.error('❌ Gmail email system failed to initialize');
        console.log('⚠️  Password reset emails will not work until Gmail is configured correctly');
        
        // Create error notification
        await createSystemNotification(
            'error',
            'Gmail Email System Failed',
            'Gmail email system failed to initialize. Please check Gmail configuration and app password.'
        );
    }
    
    return isEmailWorking;
};

// Call this during server startup (replace your existing testEmailConfiguration() call)
initializeEmailSystem();

// 3.3. Static File Server: To serve assets like CSS, JS, and images.
app.use(express.static(path.resolve(__dirname, 'public')));

// DEBUG MIDDLEWARE - REMOVE AFTER TESTING
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        console.log(`🔍 API Request: ${req.method} ${req.path}`);
        console.log(`🔐 Session: userId=${req.session?.userId}, role=${req.session?.role}`);
        console.log(`📋 Body:`, req.body);
    }
    next();
});

// 4. HELPER FUNCTIONS (Password Hashing)

const PBKDF2_SALT_LENGTH = 16, PBKDF2_KEY_LENGTH = 64, PBKDF2_ITERATIONS = 100000, PBKDF2_DIGEST = 'sha512';

const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(PBKDF2_SALT_LENGTH).toString('hex');
        crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
};

const verifyPassword = (password, storedHash) => {
    return new Promise((resolve, reject) => {
        const [salt, key] = storedHash.split(':');
        if (!salt || !key) return reject(new Error('Invalid stored hash format.'));
        crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(key === derivedKey.toString('hex'));
        });
    });
};


// Add this function after your existing helper functions (around line 100):
const validateEmailDomain = (email) => {
    // List of allowed email domains
    const allowedDomains = [
        // Google
        'gmail.com', 'googlemail.com',
        
        // Microsoft
        'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
        
        // Yahoo
        'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.au', 'ymail.com',
        
        // Apple
        'icloud.com', 'me.com', 'mac.com',
        
        // AOL
        'aol.com',
        
        // Other major providers
        'protonmail.com', 'proton.me',
        'tutanota.com', 'tuta.io',
        'mail.com',
        'gmx.com', 'gmx.net',
        'fastmail.com',
        'zoho.com',
        'yandex.com', 'yandex.ru',
        
        // Educational domains (you might want to allow these)
        // Uncomment if you want to allow .edu domains
        // But we'll validate them separately since there are many
        
        // Business domains (you might want to allow these)
        // We can add a separate validation for common business domains
    ];
    
    // Extract domain from email
    const domain = email.toLowerCase().split('@')[1];
    
    if (!domain) {
        return { valid: false, reason: 'Invalid email format' };
    }
    
    // Check against whitelist
    if (allowedDomains.includes(domain)) {
        return { valid: true };
    }
    
    // Check for educational domains (.edu)
    if (domain.endsWith('.edu')) {
        return { valid: true };
    }
    
    // Check for government domains (.gov)
    if (domain.endsWith('.gov')) {
        return { valid: true };
    }
    
    // Additional checks for legitimate business domains
    // You can expand this list based on your needs
    const businessDomains = [
        'company.com', 'corp.com', 'inc.com', 'llc.com',
        // Add more as needed
    ];
    
    if (businessDomains.includes(domain)) {
        return { valid: true };
    }
    
    return { 
        valid: false, 
        reason: `Email domain "${domain}" is not supported. Please use a major email provider like Gmail, Outlook, Yahoo, or iCloud.`
    };
};

// Advanced email validation function
const validateEmailFormat = (email) => {
    // More comprehensive email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
        return { valid: false, reason: 'Invalid email format' };
    }
    
    // Check for common suspicious patterns
    const suspiciousPatterns = [
        /^\d+@/,  // Starts with only numbers
        /^.{1,2}@/, // Very short local part
        /\.\./,   // Double dots
        /\.$|^\./, // Starts or ends with dot
    ];
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(email)) {
            return { valid: false, reason: 'Email format appears suspicious' };
        }
    }
    
    return { valid: true };
};


// 5. CUSTOM MIDDLEWARE (Authentication & Permissions)

const authRequired = (req, res, next) => {
    if (req.session && req.session.userId) return next();
    if (req.path.startsWith('/api/')) return res.status(401).json({ status: 'error', message: 'Unauthorized. Please log in.' });
    if (req.path.startsWith('/admin')) return res.redirect('/admin/login');
    return res.redirect('/login');
};

const permit = (...allowedRoles) => {
    return (req, res, next) => {
        if (req.session && req.session.role && allowedRoles.includes(req.session.role)) return next();
        return res.status(403).json({ status: 'error', message: 'Forbidden: You do not have the required permissions.' });
    };
};

// Add database table modification function (add this before your routes)
const updateUserTableForProfilePhotos = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Add profile_photo column if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN profile_photo LONGTEXT NULL,
                ADD COLUMN profile_photo_mime VARCHAR(100) NULL
            `);
            console.log('✅ Added profile photo columns to users table');
        } catch (error) {
            if (error.message.includes('Duplicate column')) {
                console.log('ℹ️ Profile photo columns already exist');
            } else {
                console.log('ℹ️ Profile photo table update may have failed:', error.message);
            }
        }
    } catch (error) {
        console.error('❌ Error updating users table:', error);
    } finally {
        if (connection) connection.release();
    }
};

updateUserTableForProfilePhotos();


// 6. ROUTE DEFINITIONS

// 6.1. API Routes

// --- Authentication ---
app.post('/api/public/login', async (req, res) => {
    const { email, password } = req.body;
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Find user by email
        const [rows] = await connection.execute(
            'SELECT id, username, email, password_hash, role FROM users WHERE email = ?',
            [email]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
        }
        
        const user = rows[0];
        
        // Verify password
        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
        }
        
        // *** ADD THIS: Update the logged_in timestamp on successful login ***
        await connection.execute(
            'UPDATE users SET logged_in = NOW() WHERE id = ?',
            [user.id]
        );
        
        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        console.log(`✅ User logged in: ${user.username} (ID: ${user.id}) at ${new Date().toISOString()}`);
        
        res.json({ 
            status: 'success', 
            message: 'Login successful!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'error', message: 'Login failed. Please try again.' });
    } finally {
        if (connection) connection.release();
    }
});

// Add this function after your existing table creation functions:
const ensureLoggedInColumn = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if logged_in column exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'logged_in'
        `);
        
        if (columns.length === 0) {
            console.log('🔧 Adding logged_in column to users table...');
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN logged_in TIMESTAMP NULL AFTER created_at
            `);
            console.log('✅ logged_in column added successfully');
        } else {
            console.log('✅ logged_in column already exists');
        }
        
    } catch (error) {
        console.error('❌ Error ensuring logged_in column:', error);
    } finally {
        if (connection) connection.release();
    }
};

// Call this function during server startup (add it after your other table creation calls)
ensureLoggedInColumn();

// Update the admin login endpoint to handle NULL admin_id properly:
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // First, ensure admin_logs table allows NULL admin_id
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_id (admin_id),
                INDEX idx_timestamp (timestamp)
            )
        `);
        
        // Query by username and ensure role is admin
        const [rows] = await connection.execute(
            'SELECT id, username, email, password_hash, role FROM users WHERE username = ? AND role = ?', 
            [username, 'admin']
        );
        
        if (rows.length === 0) {
            // Log failed attempt without admin_id since user doesn't exist
            await connection.execute(
                'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
                [null, 'failed_login', `Failed admin login attempt for unknown username: ${username}`]
            );
            
            return res.status(401).json({ status: 'error', message: 'Invalid admin credentials.' });
        }
        
        const user = rows[0];
        if (!await verifyPassword(password, user.password_hash)) {
            // Log failed attempt with admin_id since user exists
            await connection.execute(
                'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
                [user.id, 'failed_login', `Failed password attempt for admin: ${username}`]
            );
            
            return res.status(401).json({ status: 'error', message: 'Invalid admin credentials.' });
        }
        
        // Successful login
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        // Update logged_in timestamp
        await connection.execute(
            'UPDATE users SET logged_in = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );
        
        // Log successful login
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [user.id, 'admin_login', `Admin ${username} logged in successfully`]
        );
        
        // Create welcome notification - ENSURE USER.ID IS PASSED
        console.log(`🔍 Creating notification for admin ID: ${user.id}`);
        await createSystemNotification(
            'info',
            'Admin Login',
            `Admin ${username} has logged into the system.`,
            user.id  // This is the critical fix - make sure user.id is not null
        );
        
        res.json({ status: 'success', message: 'Admin login successful.' });
        console.log(`✅ Admin login successful for user ID: ${user.id}`);
    } catch (error) {
        console.error('Admin login error:', error);
        console.error('Admin login error stack:', error.stack);
        
        // Create error notification - but don't pass null adminId
        try {
            await createSystemNotification(
                'error',
                'Admin Login System Error',
                `Login system error: ${error.message}`
                // Don't pass adminId here since we don't know which admin this is for
            );
        } catch (notifError) {
            console.error('Failed to create error notification:', notifError);
        }
        
        res.status(500).json({ status: 'error', message: 'Server error during admin login.' });
    } finally {
        if (connection) connection.release();
    }
});

// Update your existing user registration endpoint:
app.post('/api/public/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ status: 'error', message: 'All fields are required.' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters long.' });
    }
    
    // *** ADD EMAIL VALIDATION ***
    const emailFormatValidation = validateEmailFormat(email);
    if (!emailFormatValidation.valid) {
        return res.status(400).json({ 
            status: 'error', 
            message: emailFormatValidation.reason 
        });
    }
    
    const domainValidation = validateEmailDomain(email);
    if (!domainValidation.valid) {
        return res.status(400).json({ 
            status: 'error', 
            message: domainValidation.reason 
        });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if username or email already exists
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ status: 'error', message: 'Username or email already exists.' });
        }
        
        const hashedPassword = await hashPassword(password);
        
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, password_hash, role, logged_in) VALUES (?, ?, ?, ?, NOW())',
            [username, email, hashedPassword, 'user']
        );
        
        // Create session for the new user
        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.role = 'user';
        
        console.log(`✅ New user registered: ${username} (${email}) - ID: ${result.insertId}`);
        
        res.status(201).json({ 
            status: 'success', 
            message: 'Registration successful!',
            user: {
                id: result.insertId,
                username: username,
                email: email,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ status: 'error', message: 'Registration failed. Please try again.' });
    } finally {
        if (connection) connection.release();
    }
});

// Add this endpoint after your existing auth routes:
app.post('/api/public/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ status: 'error', message: 'Email is required.' });
    }
    
    // Validate email format and domain
    const emailFormatValidation = validateEmailFormat(email);
    if (!emailFormatValidation.valid) {
        return res.status(400).json({ 
            status: 'error', 
            message: emailFormatValidation.reason 
        });
    }
    
    const domainValidation = validateEmailDomain(email);
    if (!domainValidation.valid) {
        return res.status(400).json({ 
            status: 'error', 
            message: domainValidation.reason 
        });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if user exists
        const [users] = await connection.execute(
            'SELECT id, username, email FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            // For security, don't reveal if email exists or not
            return res.json({ 
                status: 'success', 
                message: 'If an account with that email exists, we have sent a password reset link.' 
            });
        }
        
        const user = users[0];
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
        
        // Store reset token in database
        await connection.execute(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [resetToken, resetTokenExpiry, user.id]
        );
        
        // Create reset link
        const resetLink = `http://localhost:3006/pages/reset-password.html?token=${resetToken}`;
        
        // *** SEND ACTUAL EMAIL ***
        const emailSent = await sendPasswordResetEmail(user.email, resetLink, user.username);
        
        if (emailSent) {
            console.log(`✅ Password reset email sent to: ${user.email}`);
            res.json({ 
                status: 'success', 
                message: 'Password reset instructions have been sent to your email address.' 
            });
        } else {
            console.log(`❌ Failed to send password reset email to: ${user.email}`);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to send reset email. Please try again later.' 
            });
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process password reset request.' });
    } finally {
        if (connection) connection.release();
    }
});

// Add this endpoint to handle password reset
app.post('/api/public/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
        return res.status(400).json({ status: 'error', message: 'Token and new password are required.' });
    }
    
    if (newPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters long.' });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Find user with valid reset token
        const [users] = await connection.execute(
            'SELECT id, username, email FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [token]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Invalid or expired reset token. Please request a new password reset.' 
            });
        }
        
        const user = users[0];
        
        // Hash new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password and clear reset token
        await connection.execute(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );
        
        console.log(`✅ Password reset successful for user: ${user.username} (${user.email})`);
        
        res.json({ 
            status: 'success', 
            message: 'Password reset successful! You can now log in with your new password.' 
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to reset password.' });
    } finally {
        if (connection) connection.release();
    }
});

// Add this function after your existing table creation functions:
const ensureResetTokenColumns = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if reset_token column exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('reset_token', 'reset_token_expiry')
        `);
        
        if (columns.length < 2) {
            console.log('🔧 Adding reset token columns to users table...');
            
            // Add reset_token column if it doesn't exist
            if (!columns.find(col => col.COLUMN_NAME === 'reset_token')) {
                await connection.execute(`
                    ALTER TABLE users 
                    ADD COLUMN reset_token VARCHAR(64) NULL
                `);
                console.log('✅ reset_token column added');
            }
            
            // Add reset_token_expiry column if it doesn't exist
            if (!columns.find(col => col.COLUMN_NAME === 'reset_token_expiry')) {
                await connection.execute(`
                    ALTER TABLE users 
                    ADD COLUMN reset_token_expiry DATETIME NULL
                `);
                console.log('✅ reset_token_expiry column added');
            }
            
            console.log('✅ Reset token columns added successfully');
        } else {
            console.log('✅ Reset token columns already exist');
        }
        
    } catch (error) {
        console.error('❌ Error ensuring reset token columns:', error);
    } finally {
        if (connection) connection.release();
    }
};

// Call this function during server startup (add it after other table creation functions)
ensureResetTokenColumns();

// Add this logout endpoint to server.js
app.post('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({ status: 'error', message: 'Failed to logout' });
            }
            
            res.clearCookie('connect.sid'); // Clear the session cookie
            res.json({ status: 'success', message: 'Logged out successfully' });
            console.log('✅ User logged out successfully');
        });
    } else {
        res.json({ status: 'success', message: 'Already logged out' });
    }
});

app.get('/api/session-check', authRequired, (req, res) => {
    res.json({
        status: 'success',
        message: 'Session is active.',
        user: { id: req.session.userId, username: req.session.username, role: req.session.role }
    });
});

// --- User Profile & Searching ---
app.get('/api/me', authRequired, async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute('SELECT id, username, email, role FROM users WHERE id = ?', [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found.' });
        res.json({ status: 'success', user: rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Database error.' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/users/search', authRequired, async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ status: 'error', message: 'Search query is required.' });
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [users] = await connection.execute(
            'SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10',
            [`${q}%`, req.session.userId]
        );
        res.json({ status: 'success', users });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to search for users.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- Friend Management ---

// --- REPLACE THE EXISTING /api/friends and /api/friends/requests ROUTES WITH THIS SINGLE ROUTE ---
app.get('/api/friendships', authRequired, async (req, res) => {
    const userId = req.session.userId;
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute(`
            SELECT 
                u.id, 
                u.username, 
                u.email,
                f.status,
                f.requester_id,
                f.addressee_id
            FROM friendships f
            JOIN users u ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id)
            WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status IN ('accepted', 'pending')
        `, [userId, userId, userId]);
        res.json({ status: 'success', friendships: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch friendship data.' });
    } finally {
        if (connection) connection.release();
    }
});
// --- END OF REPLACEMENT ---


app.post('/api/friends/request', authRequired, async (req, res) => {
    const { addresseeId } = req.body;
    const requesterId = req.session.userId;
    if (!addresseeId || requesterId.toString() === addresseeId.toString()) return res.status(400).json({ status: 'error', message: 'Invalid request.' });
    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.execute(
            'INSERT IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)', 
            [requesterId, addresseeId, 'pending']
        );
        await connection.execute(
            'INSERT INTO friendship_logs (requester_id, addressee_id, action_user_id, action) VALUES (?, ?, ?, ?)',
            [requesterId, addresseeId, requesterId, 'request_sent']
        );
        res.status(201).json({ status: 'success', message: 'Friend request sent.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to send friend request.' });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/friends/request/:requesterId', authRequired, async (req, res) => {
    const { requesterId } = req.params;
    const { response } = req.body;
    const addresseeId = req.session.userId;
    if (!['accept', 'deny'].includes(response)) return res.status(400).json({ status: 'error', message: 'Invalid response.' });
    
    const newStatus = response === 'accept' ? 'accepted' : 'denied';
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [result] = await connection.execute(
            'UPDATE friendships SET status = ?, action_user_id = ? WHERE requester_id = ? AND addressee_id = ? AND status = "pending"',
            [newStatus, addresseeId, requesterId, addresseeId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'Request not found or already handled.' });

        const logAction = response === 'accept' ? 'request_accepted' : 'request_denied';
        await connection.execute(
            'INSERT INTO friendship_logs (requester_id, addressee_id, action_user_id, action) VALUES (?, ?, ?, ?)',
            [requesterId, addresseeId, addresseeId, logAction]
        );
        res.json({ status: 'success', message: `Request ${newStatus}.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to respond to request.' });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/friends/:friendId', authRequired, async (req, res) => {
    const { friendId } = req.params;
    const userId = req.session.userId;
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute(
            'SELECT id, requester_id, addressee_id FROM friendships WHERE status = "accepted" AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))',
            [userId, friendId, friendId, userId]
        );
        if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'Friendship not found.' });
        
        const friendship = rows[0];
        await connection.execute(
            `UPDATE friendships SET status = 'removed', action_user_id = ? WHERE id = ?`,
            [userId, friendship.id]
        );
        await connection.execute(
            'INSERT INTO friendship_logs (requester_id, addressee_id, action_user_id, action) VALUES (?, ?, ?, ?)',
            [friendship.requester_id, friendship.addressee_id, userId, 'friend_removed']
        );
        res.json({ status: 'success', message: 'Friend removed.' });
    } catch (error) {
        console.error("Error removing friend:", error);
        res.status(500).json({ status: 'error', message: 'Failed to remove friend.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- Messaging ---
app.get('/api/messages/:friendId', authRequired, async (req, res) => {
    const { friendId } = req.params;
    const userId = req.session.userId;
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [messages] = await connection.execute(`
            SELECT id, sender_id, receiver_id, content, created_at 
            FROM messages 
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC
        `, [userId, friendId, friendId, userId]);
        res.json({ status: 'success', messages });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch messages.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/messages', authRequired, async (req, res) => {
    const { receiverId, content } = req.body;
    const senderId = req.session.userId;
    if (!receiverId || !content) return res.status(400).json({ status: 'error', message: 'Receiver and content are required.' });
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [result] = await connection.execute(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [senderId, receiverId, content]
        );
        res.status(201).json({ status: 'success', message: 'Message sent.', messageId: result.insertId });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to send message.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- Meet Up Sessions ---
app.post('/api/meetups/request', authRequired, async (req, res) => {
    const { addresseeId } = req.body;
    const requesterId = req.session.userId;
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if there's already an active session between these users
        const [existingSessions] = await connection.execute(`
            SELECT id, status, requester_id, addressee_id 
            FROM meetup_sessions 
            WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
            AND status IN ('pending', 'waiting_confirmation')
        `, [requesterId, addresseeId, addresseeId, requesterId]);
        
        if (existingSessions.length > 0) {
            const existingSession = existingSessions[0];
            console.log(`🔄 Found existing session ${existingSession.id} between users ${requesterId} and ${addresseeId}`);
            
            return res.status(200).json({ 
                status: 'success', 
                message: 'Joining existing meet-up session.', 
                sessionId: existingSession.id 
            });
        }
        
        // Create new session only if none exists
        const [result] = await connection.execute(
            'INSERT INTO meetup_sessions (requester_id, addressee_id, status) VALUES (?, ?, ?)',
            [requesterId, addresseeId, 'pending']
        );
        
        console.log(`✅ Created new meetup session ${result.insertId} between users ${requesterId} and ${addresseeId}`);
        
        res.status(201).json({ 
            status: 'success', 
            message: 'Meet-up request initiated.', 
            sessionId: result.insertId 
        });
    } catch (error) {
        console.error('Error creating/finding meetup session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to initiate request.' });
    } finally {
        if (connection) connection.release();
    }
});
app.post('/api/meetups/confirm/:sessionId', authRequired, async (req, res) => {
    const { sessionId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.session.userId;
    
    console.log(`🔄 Meetup confirmation attempt - Session: ${sessionId}, User: ${userId}`);
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get the current session state
        const [rows] = await connection.execute('SELECT * FROM meetup_sessions WHERE id = ?', [sessionId]);
        if (rows.length === 0) {
            console.log(`❌ Session ${sessionId} not found`);
            return res.status(404).json({ status: 'error', message: 'Session not found.' });
        }
        
        const session = rows[0];
        console.log(`📋 Current session state:`, {
            id: session.id,
            requester_id: session.requester_id,
            addressee_id: session.addressee_id,
            requester_confirmed: session.requester_nda_confirmed,
            addressee_confirmed: session.addressee_nda_confirmed,
            status: session.status
        });
        
        // Determine which user is confirming
        let columnToUpdate = '';
        let userRole = '';
        if (userId === session.requester_id) {
            columnToUpdate = 'requester';
            userRole = 'requester';
        } else if (userId === session.addressee_id) {
            columnToUpdate = 'addressee';
            userRole = 'addressee';
        } else {
            console.log(`❌ User ${userId} is not part of session ${sessionId}`);
            return res.status(403).json({ status: 'error', message: 'Not part of this session.' });
        }
        
        console.log(`👤 User ${userId} is the ${userRole}, updating ${columnToUpdate} columns`);

        // Update the user's confirmation and location
        const updateQuery = `UPDATE meetup_sessions SET ${columnToUpdate}_nda_confirmed = TRUE, ${columnToUpdate}_lat = ?, ${columnToUpdate}_lon = ? WHERE id = ?`;
        console.log(`🔄 Executing query: ${updateQuery}`);
        console.log(`📍 With values: [${latitude}, ${longitude}, ${sessionId}]`);
        
        const [updateResult] = await connection.execute(updateQuery, [latitude, longitude, sessionId]);
        console.log(`✅ Update result:`, updateResult);

        // Get the updated session
        const [updatedRows] = await connection.execute('SELECT * FROM meetup_sessions WHERE id = ?', [sessionId]);
        const updatedSession = updatedRows[0];
        
        console.log(`📋 Updated session state:`, {
            requester_confirmed: updatedSession.requester_nda_confirmed,
            addressee_confirmed: updatedSession.addressee_nda_confirmed,
            requester_lat: updatedSession.requester_lat,
            addressee_lat: updatedSession.addressee_lat
        });

        // Check if both users have confirmed
        if (updatedSession.requester_nda_confirmed && updatedSession.addressee_nda_confirmed) {
            console.log(`🎯 Both users confirmed! Calculating proximity...`);
            
            // Calculate distance using Haversine formula
            const R = 6371e3; // Earth's radius in meters
            const toRad = (x) => x * Math.PI / 180;
            
            const lat1 = updatedSession.requester_lat;
            const lon1 = updatedSession.requester_lon;
            const lat2 = updatedSession.addressee_lat;
            const lon2 = updatedSession.addressee_lon;
            
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceInMeters = R * c;
            const distanceInFeet = distanceInMeters * 3.28084;

            console.log(`📏 Distance calculated: ${distanceInFeet.toFixed(2)} feet (${distanceInMeters.toFixed(2)} meters)`);
            
            // Check if within 10 feet (proximity success)
            const proximitySuccess = distanceInFeet <= 10;
            const finalStatus = proximitySuccess ? 'completed' : 'failed_proximity';
            
            console.log(`🎯 Proximity check: ${proximitySuccess ? 'SUCCESS' : 'FAILED'} - Status: ${finalStatus}`);

            // Update session with final status
            await connection.execute(
                'UPDATE meetup_sessions SET status = ?, proximity_check_successful = ?, completed_at = NOW() WHERE id = ?',
                [finalStatus, proximitySuccess, sessionId]
            );
            
            console.log(`✅ Session ${sessionId} updated to status: ${finalStatus}`);
            
            res.json({ 
                status: 'success', 
                message: 'Proximity check complete.', 
                finalStatus: finalStatus,
                distance: distanceInFeet.toFixed(2),
                proximitySuccess: proximitySuccess
            });
        } else {
            console.log(`⏳ Still waiting for other user confirmation`);
            res.json({ 
                status: 'success', 
                message: 'Confirmation received. Waiting for other user.',
                finalStatus: 'pending'
            });
        }
    } catch (error) {
        console.error(`❌ Error confirming meetup session ${sessionId}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to confirm NDA.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/meetups/end/:sessionId', authRequired, async (req, res) => {
    const { sessionId } = req.params; // This line was missing!
    const userId = req.session.userId;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Verify user is part of this session
        const [sessionCheck] = await connection.execute(`
            SELECT requester_id, addressee_id 
            FROM meetup_sessions 
            WHERE id = ? AND (requester_id = ? OR addressee_id = ?)
        `, [sessionId, userId, userId]);
        
        if (sessionCheck.length === 0) {
            return res.status(403).json({ status: 'error', message: 'Not authorized to end this session.' });
        }
        
        // Update session status to ended
        const [result] = await connection.execute(`
            UPDATE meetup_sessions 
            SET status = 'ended', completed_at = NOW() 
            WHERE id = ?
        `, [sessionId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Session not found.' });
        }
        
        console.log(`🔚 Session ${sessionId} ended by user ${userId}`);
        
        res.json({ 
            status: 'success', 
            message: 'Session ended successfully.' 
        });
        
    } catch (error) {
        console.error(`❌ Error ending session ${sessionId}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to end session.' });
    } finally {
        if (connection) connection.release();
    }
});
app.get('/api/meetups/pending', authRequired, async (req, res) => {
    const userId = req.session.userId;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Get pending meetup requests where current user is the addressee
        const [pendingRequests] = await connection.execute(`
            SELECT 
                ms.id as session_id,
                ms.requester_id,
                u.username as requester_name,
                ms.created_at
            FROM meetup_sessions ms
            JOIN users u ON ms.requester_id = u.id
            WHERE ms.addressee_id = ? 
            AND ms.status = 'pending'
            ORDER BY ms.created_at DESC
        `, [userId]);
        
        res.json({
            status: 'success',
            pendingRequests: pendingRequests
        });
        
        console.log(`✅ Found ${pendingRequests.length} pending meetup requests for user ${userId}`);
    } catch (error) {
        console.error('Error fetching pending meetup requests:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch pending requests.' });
    } finally {
        if (connection) connection.release();
    }
});

// ADD THIS NEW ENDPOINT FOR REAL-TIME STATUS CHECKING
app.get('/api/meetups/status/:sessionId', authRequired, async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.session.userId;
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get the session and verify user is part of it
        const [rows] = await connection.execute(
            'SELECT * FROM meetup_sessions WHERE id = ? AND (requester_id = ? OR addressee_id = ?)',
            [sessionId, userId, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Session not found or access denied.' });
        }
        
        const session = rows[0];
        
        // Log the current state for debugging
        console.log(`📊 Status check for session ${sessionId}:`, {
            status: session.status,
            requester_confirmed: session.requester_nda_confirmed,
            addressee_confirmed: session.addressee_nda_confirmed,
            requester_id: session.requester_id,
            addressee_id: session.addressee_id,
            checking_user: userId
        });
        
        res.json({
            status: 'success',
            sessionId: session.id,
            meetupStatus: session.status,
            requesterConfirmed: session.requester_nda_confirmed,
            addresseeConfirmed: session.addressee_nda_confirmed,
            proximityCheckSuccessful: session.proximity_check_successful,
            createdAt: session.created_at,
            // Add debug info
            debug: {
                requesterId: session.requester_id,
                addresseeId: session.addressee_id,
                currentUserId: userId
            }
        });
        
    } catch (error) {
        console.error('Error checking meetup status:', error);
        res.status(500).json({ status: 'error', message: 'Failed to check meetup status.' });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/meetups/deny/:sessionId', authRequired, async (req, res) => {
    const { sessionId } = req.params;
    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.execute(
            "UPDATE meetup_sessions SET status = 'denied' WHERE id = ? AND (requester_id = ? OR addressee_id = ?)",
            [sessionId, req.session.userId, req.session.userId]
        );
        res.json({ status: 'success', message: 'Request denied.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to deny request.' });
    } finally {
        if (connection) connection.release();
    }
});

const updateMeetupSessionsTable = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // First, get current columns
        const [currentColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'meetup_sessions'
        `);
        
        const existingColumns = currentColumns.map(col => col.COLUMN_NAME);
        console.log('📋 Current meetup_sessions columns:', existingColumns);
        
        // Define columns we need
        const requiredColumns = [
            { name: 'requester_nda_confirmed', definition: 'BOOLEAN DEFAULT FALSE' },
            { name: 'addressee_nda_confirmed', definition: 'BOOLEAN DEFAULT FALSE' },
            { name: 'requester_lat', definition: 'DECIMAL(10, 8) NULL' },
            { name: 'requester_lon', definition: 'DECIMAL(11, 8) NULL' },
            { name: 'addressee_lat', definition: 'DECIMAL(10, 8) NULL' },
            { name: 'addressee_lon', definition: 'DECIMAL(11, 8) NULL' },
            { name: 'proximity_check_successful', definition: 'BOOLEAN NULL' },
            { name: 'completed_at', definition: 'TIMESTAMP NULL' }
        ];
        
        // Add only missing columns
        for (const column of requiredColumns) {
            if (!existingColumns.includes(column.name)) {
                try {
                    await connection.execute(`
                        ALTER TABLE meetup_sessions 
                        ADD COLUMN ${column.name} ${column.definition}
                    `);
                    console.log(`✅ Added column ${column.name} to meetup_sessions table`);
                } catch (error) {
                    console.log(`⚠️ Could not add column ${column.name}:`, error.message);
                }
            } else {
                console.log(`ℹ️ Column ${column.name} already exists in meetup_sessions table`);
            }
        }
        
        console.log('✅ Meetup sessions table update completed');
    } catch (error) {
        console.error('❌ Error updating meetup_sessions table:', error);
    } finally {
        if (connection) connection.release();
    }
};

// Add this line right after it:
updateMeetupSessionsTable();

// --- ADMIN PANEL ROUTES ---

// Get all users (for admin panel)
app.get('/api/users', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute(
            'SELECT id, username, email, role, created_at, logged_in FROM users ORDER BY created_at DESC'
        );
        res.json({ status: 'success', users: rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch users.' });
    } finally {
        if (connection) connection.release();
    }
});

// Get single user by ID (for editing)
app.get('/api/users/:id', authRequired, permit('admin'), async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute(
            'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        res.json({ status: 'success', user: rows[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch user.' });
    } finally {
        if (connection) connection.release();
    }
});

// Create new user (admin only)
app.post('/api/users', authRequired, permit('admin'), async (req, res) => {
    const { username, email, role, password } = req.body;
    
    if (!username || !email || !role || !password) {
        return res.status(400).json({ status: 'error', message: 'All fields are required.' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters long.' });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if username or email already exists
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ status: 'error', message: 'Username or email already exists.' });
        }
        
        const hashedPassword = await hashPassword(password);
        
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, role, password_hash) VALUES (?, ?, ?, ?)',
            [username, email, role, hashedPassword]
        );
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'user_created', `Created user: ${username} (ID: ${result.insertId})`]
        );
        
        // Create success notification
        await createSystemNotification(
            'success',
            'New User Created',
            `User "${username}" has been created successfully by admin.`,
            req.session.userId
        );
        
        res.status(201).json({ status: 'success', message: 'User created successfully.', userId: result.insertId });
    } catch (error) {
        console.error('Error creating user:', error);
        
        // Log the error and create notification
        await logAdminError(req.session.userId, 'user_creation', error, { username, email, role });
        
        res.status(500).json({ status: 'error', message: 'Failed to create user.' });
    } finally {
        if (connection) connection.release();
    }
});

// Update user (admin only)
app.put('/api/users/:id', authRequired, permit('admin'), async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password } = req.body;
    
    if (!username || !email || !role) {
        return res.status(400).json({ status: 'error', message: 'Username, email, and role are required.' });
    }
    
    if (password && password.length < 6) {
        return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters long if provided.' });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if user exists
        const [existing] = await connection.execute(
            'SELECT username FROM users WHERE id = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        
        const oldUsername = existing[0].username;
        
        // Check if new username/email conflicts with others
        const [conflicts] = await connection.execute(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, id]
        );
        
        if (conflicts.length > 0) {
            return res.status(400).json({ status: 'error', message: 'Username or email already exists.' });
        }
        
        // Update user
        if (password) {
            const hashedPassword = await hashPassword(password);
            await connection.execute(
                'UPDATE users SET username = ?, email = ?, role = ?, password_hash = ? WHERE id = ?',
                [username, email, role, hashedPassword, id]
            );
        } else {
            await connection.execute(
                'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
                [username, email, role, id]
            );
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'user_updated', `Updated user: ${oldUsername} -> ${username} (ID: ${id})`]
        );
        
        res.json({ status: 'success', message: 'User updated successfully.' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update user.' });
    } finally {
        if (connection) connection.release();
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', authRequired, permit('admin'), async (req, res) => {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(id) === req.session.userId) {
        return res.status(400).json({ status: 'error', message: 'Cannot delete your own account.' });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get user info before deletion
        const [userInfo] = await connection.execute(
            'SELECT username FROM users WHERE id = ?',
            [id]
        );
        
        if (userInfo.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        
        const username = userInfo[0].username;
        
        // Delete user
        const [result] = await connection.execute(
            'DELETE FROM users WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'user_deleted', `Deleted user: ${username} (ID: ${id})`]
        );
        
        res.json({ status: 'success', message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete user.' });
    } finally {
        if (connection) connection.release();
    }
});

// Database info endpoint
app.get('/api/db-info', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const dbName = process.env.DB_NAME || 'Unknown';
        
        // Test connection and get server version
        const startTime = Date.now();
        const [versionResult] = await connection.execute('SELECT VERSION() as version');
        const queryTime = Date.now() - startTime;
        
        const dbServerVersion = versionResult[0].version;
        
        // Alert if database is slow
        if (queryTime > 1000) {
            await createSystemNotification(
                'warning',
                'Slow Database Response',
                `Database info query took ${queryTime}ms to complete. Database may be under load.`
            );
        }
        
        res.json({
            status: 'success',
            dbName: dbName,
            connectedAtStartup: true,
            dbServerVersion: dbServerVersion,
            connectionPingStatus: 'Successful',
            responseTime: `${queryTime}ms`
        });
    } catch (error) {
        console.error('Database info error:', error);
        
        // Create critical error notification
        await createSystemNotification(
            'error',
            'Database Connection Failed',
            `Unable to retrieve database information: ${error.message}`
        );
        
        res.json({
            status: 'success',
            dbName: process.env.DB_NAME || 'Unknown',
            connectedAtStartup: false,
            dbServerVersion: 'Unknown',
            connectionPingStatus: 'Failed',
            connectionErrorMessage: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// Database table information endpoint
app.get('/api/db-tables', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get table information from the current database
        const [tables] = await connection.execute(`
            SELECT 
                TABLE_NAME as table_name,
                TABLE_ROWS as table_rows,
                ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb,
                ENGINE as engine,
                TABLE_COLLATION as collation
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);
        
        res.json({
            status: 'success',
            tables: tables
        });
        
        console.log(`✅ Database tables info sent: ${tables.length} tables`);
    } catch (error) {
        console.error('❌ Database tables error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch table information' });
    } finally {
        if (connection) connection.release();
    }
});

// Admin logs endpoint
// Replace the existing GET /api/logs endpoint:
app.get('/api/logs', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Create admin_logs table if it doesn't exist (with NULL admin_id allowed)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_id (admin_id),
                INDEX idx_timestamp (timestamp)
            )
        `);
        
        // Build query with optional filter
        const filter = req.query.filter;
        let query = `
            SELECT 
                al.id,
                al.admin_id,
                COALESCE(u.username, 'System/Unknown') as username,
                al.action,
                al.details,
                al.timestamp
            FROM admin_logs al 
            LEFT JOIN users u ON al.admin_id = u.id 
        `;
        let params = [];
        
        if (filter) {
            query += ` WHERE al.action = ?`;
            params.push(filter);
        }
        
        query += ` ORDER BY al.timestamp DESC LIMIT 100`;
        
        const [logs] = await connection.execute(query, params);
        
        res.json({ status: 'success', logs: logs });
        console.log(`✅ Logs fetched: ${logs.length} entries${filter ? ` (filtered by: ${filter})` : ''}`);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch logs.' });
    } finally {
        if (connection) connection.release();
    }
});

// Clear old logs endpoint
app.post('/api/logs/clear', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Delete logs older than 30 days
        const [result] = await connection.execute(`
            DELETE FROM admin_logs 
            WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        // Log the clearing action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'logs_cleared', `Cleared ${result.affectedRows} old log entries`]
        );
        
        res.json({ 
            status: 'success', 
            message: `Successfully cleared ${result.affectedRows} old log entries.`,
            clearedCount: result.affectedRows
        });
        
        console.log(`✅ Cleared ${result.affectedRows} old log entries`);
    } catch (error) {
        console.error('Error clearing logs:', error);
        res.status(500).json({ status: 'error', message: 'Failed to clear logs.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- ANALYTICS ROUTES ---

// Dashboard Stats
app.get('/api/analytics/dashboard-stats', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get current stats
        const [userStats] = await connection.execute('SELECT COUNT(*) as total FROM users');
        const [friendshipStats] = await connection.execute('SELECT COUNT(*) as total FROM friendships WHERE status = "accepted"');
        const [meetupStats] = await connection.execute('SELECT COUNT(*) as total FROM meetups');
        const [messageStats] = await connection.execute('SELECT COUNT(*) as total FROM messages');
        
        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const [meetupsToday] = await connection.execute('SELECT COUNT(*) as total FROM meetups WHERE DATE(created_at) = ?', [today]);
        const [messagesToday] = await connection.execute('SELECT COUNT(*) as total FROM messages WHERE DATE(created_at) = ?', [today]);
        
        // Get previous month stats for growth calculation
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().split('T')[0];
        
        const [previousUsers] = await connection.execute('SELECT COUNT(*) as total FROM users WHERE created_at < ?', [lastMonthStr]);
        const [previousFriendships] = await connection.execute('SELECT COUNT(*) as total FROM friendships WHERE created_at < ? AND status = "accepted"', [lastMonthStr]);
        
        res.json({
            status: 'success',
            totalUsers: userStats[0].total,
            totalFriendships: friendshipStats[0].total,
            totalMeetups: meetupStats[0].total,
            totalMessages: messageStats[0].total,
            meetupsToday: meetupsToday[0].total,
            messagesToday: messagesToday[0].total,
            previousUsers: previousUsers[0].total,
            previousFriendships: previousFriendships[0].total
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard stats' });
    } finally {
        if (connection) connection.release();
    }
});

// Charts Data
app.get('/api/analytics/charts-data', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // User Growth (Last 30 days)
        const [userGrowthData] = await connection.execute(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        
        // Demographics (assuming you have a gender field in users table)
        const [demographicsData] = await connection.execute(`
            SELECT 
                COALESCE(gender, 'Not Specified') as gender,
                COUNT(*) as count
            FROM users 
            GROUP BY gender
        `);
        
        // Daily Meetups (Last 14 days)
        const [meetupsData] = await connection.execute(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM meetups 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        
        // User Locations (Top 10)
        const [locationsData] = await connection.execute(`
            SELECT 
                COALESCE(state, 'Unknown') as location,
                COUNT(*) as count
            FROM users 
            GROUP BY state
            ORDER BY count DESC
            LIMIT 10
        `);

        // Format data for Chart.js
        const userGrowthFormatted = {
            labels: userGrowthData.map(item => new Date(item.date).toLocaleDateString()),
            data: userGrowthData.map(item => item.count)
        };

        const demographicsFormatted = {
            labels: demographicsData.map(item => item.gender),
            data: demographicsData.map(item => item.count)
        };

        const meetupsFormatted = {
            labels: meetupsData.map(item => new Date(item.date).toLocaleDateString()),
            data: meetupsData.map(item => item.count)
        };

        const locationsFormatted = {
            labels: locationsData.map(item => item.location),
            data: locationsData.map(item => item.count)
        };

        res.json({
            status: 'success',
            userGrowth: userGrowthFormatted,
            demographics: demographicsFormatted,
            meetups: meetupsFormatted,
            locations: locationsFormatted
        });
    } catch (error) {
        console.error('Charts data error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch charts data' });
    } finally {
        if (connection) connection.release();
    }
});

// Detailed Analytics Data
app.get('/api/analytics/detailed-data', authRequired, permit('admin'), async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Daily Active Users (users who logged in each day)
        const [dailyActiveUsers] = await connection.execute(`
            SELECT DATE(logged_in) as date, COUNT(DISTINCT id) as count 
            FROM users 
            WHERE logged_in >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(logged_in)
            ORDER BY date
        `, [days]);
        
        // User Growth 
        const [userGrowthData] = await connection.execute(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `, [days]);
        
        // Message frequency by hour
        const [messageFrequencyData] = await connection.execute(`
            SELECT 
                CASE 
                    WHEN HOUR(created_at) BETWEEN 6 AND 11 THEN 'Morning'
                    WHEN HOUR(created_at) BETWEEN 12 AND 17 THEN 'Afternoon'
                    WHEN HOUR(created_at) BETWEEN 18 AND 23 THEN 'Evening'
                    ELSE 'Night'
                END as time_period,
                COUNT(*) as count
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY time_period
        `, [days]);
        
        // Friend requests data
        const [friendRequestsSent] = await connection.execute(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM friendships 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `, [days]);
        
        const [friendRequestsAccepted] = await connection.execute(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM friendships 
            WHERE status = 'accepted' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `, [days]);
        
        // Meetup success data
        const [meetupSuccessData] = await connection.execute(`
            SELECT 
                status,
                COUNT(*) as count
            FROM meetup_sessions 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY status
        `, [days]);
        
        // Format data for charts
        const response = {
            status: 'success',
            dailyActiveUsers: {
                labels: dailyActiveUsers.map(item => new Date(item.date).toLocaleDateString()),
                data: dailyActiveUsers.map(item => item.count)
            },
            userGrowth: {
                labels: userGrowthData.map(item => new Date(item.date).toLocaleDateString()),
                data: userGrowthData.map(item => item.count)
            },
            messageFrequency: {
                labels: ['Morning', 'Afternoon', 'Evening', 'Night'],
                data: ['Morning', 'Afternoon', 'Evening', 'Night'].map(period => {
                    const found = messageFrequencyData.find(item => item.time_period === period);
                    return found ? found.count : 0;
                })
            },
            friendRequests: {
                labels: friendRequestsSent.map(item => new Date(item.date).toLocaleDateString()),
                sent: friendRequestsSent.map(item => item.count),
                accepted: friendRequestsAccepted.map(item => {
                    const sentDate = new Date(item.date).toLocaleDateString();
                    const accepted = friendRequestsAccepted.find(acc => 
                        new Date(acc.date).toLocaleDateString() === sentDate
                    );
                    return accepted ? accepted.count : 0;
                })
            },
            meetupSuccess: {
                labels: ['completed', 'failed_proximity', 'denied', 'pending'],
                data: ['completed', 'failed_proximity', 'denied', 'pending'].map(status => {
                    const found = meetupSuccessData.find(item => item.status === status);
                    return found ? found.count : 0;
                })
            }
        };
        
        res.json(response);
        console.log(`✅ Detailed analytics data sent for ${days} days`);
        
    } catch (error) {
        console.error('❌ Detailed analytics error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch detailed analytics data' });
    } finally {
        if (connection) connection.release();
    }
});

// --- ADMIN SPECIFIC ROUTES ---

// Admin Friendships Data
app.get('/api/admin/friendships', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get friendship statistics
        const [totalFriendships] = await connection.execute('SELECT COUNT(*) as total FROM friendships WHERE status = "accepted"');
        const [pendingRequests] = await connection.execute('SELECT COUNT(*) as total FROM friendships WHERE status = "pending"');
        const [thisWeekFriendships] = await connection.execute(`
            SELECT COUNT(*) as total FROM friendships 
            WHERE status = "accepted" AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        // Get recent friendships with user details
        const [recentFriendships] = await connection.execute(`
            SELECT 
                f.id,
                f.status,
                f.created_at,
                u1.username as requester_name,
                u2.username as addressee_name
            FROM friendships f
            JOIN users u1 ON f.requester_id = u1.id
            JOIN users u2 ON f.addressee_id = u2.id
            ORDER BY f.created_at DESC
            LIMIT 50
        `);
        
        res.json({
            status: 'success',
            stats: {
                total: totalFriendships[0].total,
                pending: pendingRequests[0].total,
                thisWeek: thisWeekFriendships[0].total
            },
            friendships: recentFriendships
        });
        
        console.log(`✅ Admin friendships data sent: ${recentFriendships.length} friendships`);
    } catch (error) {
        console.error('❌ Admin friendships error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch friendships data' });
    } finally {
        if (connection) connection.release();
    }
});

// Admin Messages Data
app.get('/api/admin/messages', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get message statistics
        const [totalMessages] = await connection.execute('SELECT COUNT(*) as total FROM messages');
        const [todayMessages] = await connection.execute(`
            SELECT COUNT(*) as total FROM messages 
            WHERE DATE(created_at) = CURDATE()
        `);
        const [activeChats] = await connection.execute(`
            SELECT COUNT(DISTINCT CONCAT(LEAST(sender_id, receiver_id), '-', GREATEST(sender_id, receiver_id))) as total 
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);
        const [avgMessages] = await connection.execute(`
            SELECT ROUND(COUNT(*) / COUNT(DISTINCT sender_id), 1) as avg_per_user 
            FROM messages
        `);
        
        // Get message activity for the last 7 days
        const [messageActivity] = await connection.execute(`
            SELECT 
                DATE(created_at) as date, 
                COUNT(*) as count 
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        
        res.json({
            status: 'success',
            stats: {
                total: totalMessages[0].total,
                today: todayMessages[0].total,
                activeChats: activeChats[0].total,
                avgPerUser: avgMessages[0].avg_per_user || 0
            },
            activity: {
                labels: messageActivity.map(item => new Date(item.date).toLocaleDateString()),
                data: messageActivity.map(item => item.count)
            }
        });
        
        console.log(`✅ Admin messages data sent: ${totalMessages[0].total} total messages`);
    } catch (error) {
        console.error('❌ Admin messages error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch messages data' });
    } finally {
        if (connection) connection.release();
    }
});

// Admin Meetups Data
app.get('/api/admin/meetups', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get meetup statistics
        const [totalMeetups] = await connection.execute('SELECT COUNT(*) as total FROM meetup_sessions');
        const [completedMeetups] = await connection.execute('SELECT COUNT(*) as total FROM meetup_sessions WHERE status = "completed"');
        const [todayMeetups] = await connection.execute(`
            SELECT COUNT(*) as total FROM meetup_sessions 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        // Calculate success rate
        const successRate = totalMeetups[0].total > 0 
            ? Math.round((completedMeetups[0].total / totalMeetups[0].total) * 100)
            : 0;
        
        // Get recent meetup sessions
        const [recentSessions] = await connection.execute(`
            SELECT 
                ms.id,
                ms.status,
                ms.created_at,
                u1.username as requester_name,
                u2.username as addressee_name,
                ms.proximity_check_successful
            FROM meetup_sessions ms
            JOIN users u1 ON ms.requester_id = u1.id
            JOIN users u2 ON ms.addressee_id = u2.id
            ORDER BY ms.created_at DESC
            LIMIT 50
        `);
        
        res.json({
            status: 'success',
            stats: {
                total: totalMeetups[0].total,
                completed: completedMeetups[0].total,
                successRate: successRate,
                today: todayMeetups[0].total
            },
            sessions: recentSessions
        });
        
        console.log(`✅ Admin meetups data sent: ${totalMeetups[0].total} total sessions`);
    } catch (error) {
        console.error('❌ Admin meetups error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch meetups data' });
    } finally {
        if (connection) connection.release();
    }
});

// Get single meetup session details
app.get('/api/admin/meetups/:id', authRequired, permit('admin'), async (req, res) => {
    const sessionId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Get detailed session information
        const [session] = await connection.execute(`
            SELECT 
                ms.id,
                ms.status,
                ms.created_at,
                ms.completed_at,
                ms.proximity_check_successful,
                ms.requester_latitude,
                ms.requester_longitude,
                ms.addressee_latitude,
                ms.addressee_longitude,
                u1.username as requester_name,
                u1.email as requester_email,
                u2.username as addressee_name,
                u2.email as addressee_email,
                CASE 
                    WHEN ms.requester_latitude IS NOT NULL AND ms.addressee_latitude IS NOT NULL 
                    THEN ROUND(
                        ST_Distance_Sphere(
                            POINT(ms.requester_longitude, ms.requester_latitude),
                            POINT(ms.addressee_longitude, ms.addressee_latitude)
                        ) / 1000, 2
                    )
                    ELSE NULL
                END as distance_km
            FROM meetup_sessions ms
            JOIN users u1 ON ms.requester_id = u1.id
            JOIN users u2 ON ms.addressee_id = u2.id
            WHERE ms.id = ?
        `, [sessionId]);
        
        if (session.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Session not found' });
        }
        
        res.json(session[0]);
        console.log(`✅ Session details sent for ID: ${sessionId}`);
    } catch (error) {
        console.error('❌ Error fetching session details:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch session details' });
    } finally {
        if (connection) connection.release();
    }
});

// Complete meetup session
app.post('/api/admin/meetups/:id/complete', authRequired, permit('admin'), async (req, res) => {
    const sessionId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Update session status to completed
        const [result] = await connection.execute(`
            UPDATE meetup_sessions 
            SET status = 'completed', completed_at = NOW() 
            WHERE id = ?
        `, [sessionId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Session not found' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'session_completed', `Marked session ID: ${sessionId} as completed`]
        );
        
        res.json({ status: 'success', message: 'Session marked as completed successfully' });
        console.log(`✅ Session completed: ${sessionId}`);
    } catch (error) {
        console.error('❌ Error completing session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to complete session' });
    } finally {
        if (connection) connection.release();
    }
});

// Fail meetup session
app.post('/api/admin/meetups/:id/fail', authRequired, permit('admin'), async (req, res) => {
    const sessionId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Update session status to failed
        const [result] = await connection.execute(`
            UPDATE meetup_sessions 
            SET status = 'failed_proximity' 
            WHERE id = ?
        `, [sessionId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Session not found' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'session_failed', `Marked session ID: ${sessionId} as failed`]
        );
        
        res.json({ status: 'success', message: 'Session marked as failed successfully' });
        console.log(`✅ Session failed: ${sessionId}`);
    } catch (error) {
        console.error('❌ Error failing session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to mark session as failed' });
    } finally {
        if (connection) connection.release();
    }
});

// Reset meetup session
app.post('/api/admin/meetups/:id/reset', authRequired, permit('admin'), async (req, res) => {
    const sessionId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Reset session status to pending
        const [result] = await connection.execute(`
            UPDATE meetup_sessions 
            SET status = 'pending', completed_at = NULL 
            WHERE id = ?
        `, [sessionId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Session not found' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'session_reset', `Reset session ID: ${sessionId} to pending`]
        );
        
        res.json({ status: 'success', message: 'Session reset successfully' });
        console.log(`✅ Session reset: ${sessionId}`);
    } catch (error) {
        console.error('❌ Error resetting session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to reset session' });
    } finally {
        if (connection) connection.release();
    }
});

// Delete meetup session
app.delete('/api/admin/meetups/:id', authRequired, permit('admin'), async (req, res) => {
    const sessionId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Delete the session
        const [result] = await connection.execute(`
            DELETE FROM meetup_sessions WHERE id = ?
        `, [sessionId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Session not found' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'session_deleted', `Deleted session ID: ${sessionId}`]
        );
        
        res.json({ status: 'success', message: 'Session deleted successfully' });
        console.log(`✅ Session deleted: ${sessionId}`);
    } catch (error) {
        console.error('❌ Error deleting session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete session' });
    } finally {
        if (connection) connection.release();
    }
});

// Add these endpoints after the existing /api/admin/friendships endpoint:
// Add this after the existing /api/admin/friendships endpoint (around line 1100) and REMOVE any duplicates:

// Get single friendship details
app.get('/api/admin/friendships/:id', authRequired, permit('admin'), async (req, res) => {
    const friendshipId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        console.log(`🔍 Fetching friendship details for ID: ${friendshipId}`);
        
        // Get detailed friendship information
        const [friendship] = await connection.execute(`
            SELECT 
                f.id,
                f.status,
                f.created_at,
                f.accepted_at,
                u1.username as requester_name,
                u1.email as requester_email,
                u2.username as addressee_name,
                u2.email as addressee_email
            FROM friendships f
            JOIN users u1 ON f.requester_id = u1.id
            JOIN users u2 ON f.addressee_id = u2.id
            WHERE f.id = ?
        `, [friendshipId]);
        
        if (friendship.length === 0) {
            console.log(`❌ Friendship not found for ID: ${friendshipId}`);
            return res.status(404).json({ status: 'error', message: 'Friendship not found' });
        }
        
        console.log(`✅ Friendship details found for ID: ${friendshipId}`, friendship[0]);
        res.json(friendship[0]);
        
    } catch (error) {
        console.error('❌ Error fetching friendship details:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch friendship details' });
    } finally {
        if (connection) connection.release();
    }
});

// Approve friendship
app.post('/api/admin/friendships/:id/approve', authRequired, permit('admin'), async (req, res) => {
    const friendshipId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        console.log(`🔄 Approving friendship ID: ${friendshipId}`);
        
        // Update friendship status to accepted
        const [result] = await connection.execute(`
            UPDATE friendships 
            SET status = 'accepted', accepted_at = NOW() 
            WHERE id = ? AND status = 'pending'
        `, [friendshipId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Friendship not found or already processed' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'friendship_approved', `Approved friendship ID: ${friendshipId}`]
        );
        
        res.json({ status: 'success', message: 'Friendship approved successfully' });
        console.log(`✅ Friendship approved: ${friendshipId}`);
    } catch (error) {
        console.error('❌ Error approving friendship:', error);
        res.status(500).json({ status: 'error', message: 'Failed to approve friendship' });
    } finally {
        if (connection) connection.release();
    }
});

// Reject friendship
app.post('/api/admin/friendships/:id/reject', authRequired, permit('admin'), async (req, res) => {
    const friendshipId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        console.log(`🔄 Rejecting friendship ID: ${friendshipId}`);
        
        // Update friendship status to rejected
        const [result] = await connection.execute(`
            UPDATE friendships 
            SET status = 'rejected' 
            WHERE id = ? AND status = 'pending'
        `, [friendshipId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Friendship not found or already processed' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'friendship_rejected', `Rejected friendship ID: ${friendshipId}`]
        );
        
        res.json({ status: 'success', message: 'Friendship rejected successfully' });
        console.log(`✅ Friendship rejected: ${friendshipId}`);
    } catch (error) {
        console.error('❌ Error rejecting friendship:', error);
        res.status(500).json({ status: 'error', message: 'Failed to reject friendship' });
    } finally {
        if (connection) connection.release();
    }
});

// Delete friendship
app.delete('/api/admin/friendships/:id', authRequired, permit('admin'), async (req, res) => {
    const friendshipId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        console.log(`🔄 Deleting friendship ID: ${friendshipId}`);
        
        // Delete the friendship
        const [result] = await connection.execute(`
            DELETE FROM friendships WHERE id = ?
        `, [friendshipId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Friendship not found' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.session.userId, 'friendship_deleted', `Deleted friendship ID: ${friendshipId}`]
        );
        
        res.json({ status: 'success', message: 'Friendship deleted successfully' });
        console.log(`✅ Friendship deleted: ${friendshipId}`);
    } catch (error) {
        console.error('❌ Error deleting friendship:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete friendship' });
    } finally {
        if (connection) connection.release();
    }
});

// Users Report
app.get('/api/reports/users', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [users] = await connection.execute(`
            SELECT 
                id,
                username,
                email,
                role,
                created_at,
                logged_in,
                CASE 
                    WHEN logged_in IS NULL THEN 'Never'
                    WHEN logged_in >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'Active'
                    ELSE 'Inactive'
                END as status
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'users',
            generatedAt: new Date().toISOString(),
            summary: `${users.length} total users`,
            data: users
        });
        
        console.log(`✅ Users report generated: ${users.length} users`);
    } catch (error) {
        console.error('❌ Error generating users report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate users report' });
    } finally {
        if (connection) connection.release();
    }
});

// New Users Report (last 30 days)
app.get('/api/reports/new-users', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [newUsers] = await connection.execute(`
            SELECT 
                id,
                username,
                email,
                role,
                created_at,
                DATEDIFF(NOW(), created_at) as days_since_registration
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY created_at DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'new-users',
            generatedAt: new Date().toISOString(),
            summary: `${newUsers.length} new users in last 30 days`,
            data: newUsers
        });
        
        console.log(`✅ New users report generated: ${newUsers.length} new users`);
    } catch (error) {
        console.error('❌ Error generating new users report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate new users report' });
    } finally {
        if (connection) connection.release();
    }
});

// User Activity Report
app.get('/api/reports/user-activity', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [userActivity] = await connection.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.created_at,
                u.logged_in,
                COUNT(DISTINCT f.id) as total_friends,
                COUNT(DISTINCT m.id) as messages_sent,
                COUNT(DISTINCT ms.id) as meetups_initiated,
                CASE 
                    WHEN u.logged_in IS NULL THEN 'Never logged in'
                    WHEN u.logged_in >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'Very Active'
                    WHEN u.logged_in >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'Active'
                    ELSE 'Inactive'
                END as activity_level
            FROM users u
            LEFT JOIN friendships f ON (u.id = f.requester_id OR u.id = f.addressee_id) AND f.status = 'accepted'
            LEFT JOIN messages m ON u.id = m.sender_id
            LEFT JOIN meetup_sessions ms ON u.id = ms.requester_id
            GROUP BY u.id
            ORDER BY u.logged_in DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'user-activity',
            generatedAt: new Date().toISOString(),
            summary: `${userActivity.length} users analyzed for activity`,
            data: userActivity
        });
        
        console.log(`✅ User activity report generated: ${userActivity.length} users`);
    } catch (error) {
        console.error('❌ Error generating user activity report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate user activity report' });
    } finally {
        if (connection) connection.release();
    }
});


// Friendships Report
app.get('/api/reports/friendships', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [friendships] = await connection.execute(`
            SELECT 
                f.id,
                u1.username as requester_name,
                u1.email as requester_email,
                u2.username as addressee_name,
                u2.email as addressee_email,
                f.status,
                f.created_at,
                f.accepted_at,
                DATEDIFF(COALESCE(f.accepted_at, NOW()), f.created_at) as days_to_accept
            FROM friendships f
            JOIN users u1 ON f.requester_id = u1.id
            JOIN users u2 ON f.addressee_id = u2.id
            ORDER BY f.created_at DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'friendships',
            generatedAt: new Date().toISOString(),
            summary: `${friendships.length} total friendships`,
            data: friendships
        });
        
        console.log(`✅ Friendships report generated: ${friendships.length} friendships`);
    } catch (error) {
        console.error('❌ Error generating friendships report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate friendships report' });
    } finally {
        if (connection) connection.release();
    }
});

// Pending Requests Report
app.get('/api/reports/pending-requests', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [pendingRequests] = await connection.execute(`
            SELECT 
                f.id,
                u1.username as requester_name,
                u1.email as requester_email,
                u2.username as addressee_name,
                u2.email as addressee_email,
                f.created_at,
                DATEDIFF(NOW(), f.created_at) as days_pending
            FROM friendships f
            JOIN users u1 ON f.requester_id = u1.id
            JOIN users u2 ON f.addressee_id = u2.id
            WHERE f.status = 'pending'
            ORDER BY f.created_at ASC
        `);
        
        res.json({
            status: 'success',
            reportType: 'pending-requests',
            generatedAt: new Date().toISOString(),
            summary: `${pendingRequests.length} pending friendship requests`,
            data: pendingRequests
        });
        
        console.log(`✅ Pending requests report generated: ${pendingRequests.length} requests`);
    } catch (error) {
        console.error('❌ Error generating pending requests report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate pending requests report' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/reports/friendship-stats', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [friendshipStats] = await connection.execute(`
            SELECT 
                'Total Friendships' as metric,
                COUNT(*) as value
            FROM friendships
            UNION ALL
            SELECT 
                'Accepted Friendships' as metric,
                COUNT(*) as value
            FROM friendships WHERE status = 'accepted'
            UNION ALL
            SELECT 
                'Pending Requests' as metric,
                COUNT(*) as value
            FROM friendships WHERE status = 'pending'
            UNION ALL
            SELECT 
                'Rejected Requests' as metric,
                COUNT(*) as value
            FROM friendships WHERE status = 'rejected'
            UNION ALL
            SELECT 
                'This Week' as metric,
                COUNT(*) as value
            FROM friendships WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            UNION ALL
            SELECT 
                'This Month' as metric,
                COUNT(*) as value
            FROM friendships WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        res.json({
            status: 'success',
            reportType: 'friendship-stats',
            generatedAt: new Date().toISOString(),
            summary: `Friendship statistics overview`,
            data: friendshipStats
        });
        
        console.log(`✅ Friendship statistics report generated`);
    } catch (error) {
        console.error('❌ Error generating friendship statistics report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate friendship statistics report' });
    } finally {
        if (connection) connection.release();
    }
});

// Meetup Success Analysis Report
app.get('/api/reports/meetup-success', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [meetupSuccess] = await connection.execute(`
            SELECT 
                ms.status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM meetup_sessions), 2) as percentage,
                AVG(CASE 
                    WHEN ms.completed_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(MINUTE, ms.created_at, ms.completed_at) 
                    ELSE NULL 
                END) as avg_completion_time_minutes
            FROM meetup_sessions ms
            GROUP BY ms.status
            ORDER BY count DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'meetup-success',
            generatedAt: new Date().toISOString(),
            summary: `Meetup success rate analysis`,
            data: meetupSuccess
        });
        
        console.log(`✅ Meetup success analysis report generated`);
    } catch (error) {
        console.error('❌ Error generating meetup success report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate meetup success report' });
    } finally {
        if (connection) connection.release();
    }
});

// Location Analysis Report
app.get('/api/reports/location-data', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [locationData] = await connection.execute(`
            SELECT 
                ms.id as session_id,
                u1.username as requester_name,
                u2.username as addressee_name,
                ms.requester_latitude,
                ms.requester_longitude,
                ms.addressee_latitude,
                ms.addressee_longitude,
                ms.proximity_check_successful,
                ms.status,
                ms.created_at,
                CASE 
                    WHEN ms.requester_latitude IS NOT NULL AND ms.addressee_latitude IS NOT NULL 
                    THEN ROUND(
                        ST_Distance_Sphere(
                            POINT(ms.requester_longitude, ms.requester_latitude),
                            POINT(ms.addressee_longitude, ms.addressee_latitude)
                        ) / 1000, 2
                    )
                    ELSE NULL
                END as distance_km
            FROM meetup_sessions ms
            JOIN users u1 ON ms.requester_id = u1.id
            JOIN users u2 ON ms.addressee_id = u2.id
            WHERE ms.requester_latitude IS NOT NULL 
            AND ms.addressee_latitude IS NOT NULL
            ORDER BY ms.created_at DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'location-data',
            generatedAt: new Date().toISOString(),
            summary: `${locationData.length} meetup sessions with location data`,
            data: locationData
        });
        
        console.log(`✅ Location analysis report generated: ${locationData.length} sessions`);
    } catch (error) {
        console.error('❌ Error generating location analysis report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate location analysis report' });
    } finally {
        if (connection) connection.release();
    }
});

// Message Frequency Analysis Report
app.get('/api/reports/message-frequency', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [messageFrequency] = await connection.execute(`
            SELECT 
                DATE(created_at) as message_date,
                COUNT(*) as total_messages,
                COUNT(DISTINCT sender_id) as unique_senders,
                COUNT(DISTINCT receiver_id) as unique_receivers,
                AVG(LENGTH(content)) as avg_message_length,
                MIN(LENGTH(content)) as min_message_length,
                MAX(LENGTH(content)) as max_message_length
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY message_date DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'message-frequency',
            generatedAt: new Date().toISOString(),
            summary: `Message frequency analysis for last 30 days`,
            data: messageFrequency
        });
        
        console.log(`✅ Message frequency analysis report generated`);
    } catch (error) {
        console.error('❌ Error generating message frequency report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate message frequency report' });
    } finally {
        if (connection) connection.release();
    }
});

// Peak Usage Times Report
app.get('/api/reports/popular-times', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [popularTimes] = await connection.execute(`
            SELECT 
                HOUR(created_at) as hour_of_day,
                COUNT(*) as message_count,
                COUNT(DISTINCT sender_id) as unique_users,
                CASE 
                    WHEN HOUR(created_at) BETWEEN 6 AND 11 THEN 'Morning'
                    WHEN HOUR(created_at) BETWEEN 12 AND 17 THEN 'Afternoon'
                    WHEN HOUR(created_at) BETWEEN 18 AND 23 THEN 'Evening'
                    ELSE 'Night'
                END as time_period,
                DAYNAME(created_at) as day_of_week
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY HOUR(created_at), DAYNAME(created_at)
            ORDER BY hour_of_day, FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        `);
        
        res.json({
            status: 'success',
            reportType: 'popular-times',
            generatedAt: new Date().toISOString(),
            summary: `Peak usage times analysis for last 30 days`,
            data: popularTimes
        });
        
        console.log(`✅ Popular times report generated`);
    } catch (error) {
        console.error('❌ Error generating popular times report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate popular times report' });
    } finally {
        if (connection) connection.release();
    }
});

// Database Statistics Report
app.get('/api/reports/database-stats', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get table statistics
        const [tableStats] = await connection.execute(`
            SELECT 
                TABLE_NAME as table_name,
                TABLE_ROWS as estimated_rows,
                ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb,
                ROUND((DATA_LENGTH / 1024 / 1024), 2) as data_size_mb,
                ROUND((INDEX_LENGTH / 1024 / 1024), 2) as index_size_mb,
                ENGINE as engine,
                TABLE_COLLATION as collation,
                CREATE_TIME as created_at,
                UPDATE_TIME as last_updated
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY size_mb DESC
        `);
        
        // Get database size
        const [dbSize] = await connection.execute(`
            SELECT 
                ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as total_size_mb,
                COUNT(*) as total_tables
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
        `);
        
        // Combine the data
        const combinedData = [
            { metric: 'Database Size (MB)', value: dbSize[0].total_size_mb },
            { metric: 'Total Tables', value: dbSize[0].total_tables },
            ...tableStats
        ];
        
        res.json({
            status: 'success',
            reportType: 'database-stats',
            generatedAt: new Date().toISOString(),
            summary: `Database statistics - ${dbSize[0].total_tables} tables, ${dbSize[0].total_size_mb} MB`,
            data: combinedData
        });
        
        console.log(`✅ Database statistics report generated`);
    } catch (error) {
        console.error('❌ Error generating database statistics report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate database statistics report' });
    } finally {
        if (connection) connection.release();
    }
});

// Performance Metrics Report
app.get('/api/reports/performance', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get various performance metrics
        const [performanceMetrics] = await connection.execute(`
            SELECT 
                'Total Users' as metric,
                COUNT(*) as value,
                'count' as unit
            FROM users
            UNION ALL
            SELECT 
                'Active Users (Last 30 Days)' as metric,
                COUNT(*) as value,
                'count' as unit
            FROM users WHERE logged_in >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            UNION ALL
            SELECT 
                'Messages Per Day (Avg Last 30 Days)' as metric,
                ROUND(COUNT(*) / 30, 2) as value,
                'messages/day' as unit
            FROM messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            UNION ALL
            SELECT 
                'Friendship Success Rate' as metric,
                ROUND(
                    (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') * 100.0 / 
                    (SELECT COUNT(*) FROM friendships WHERE status IN ('accepted', 'rejected')), 2
                ) as value,
                'percentage' as unit
            UNION ALL
            SELECT 
                'Meetup Success Rate' as metric,
                ROUND(
                    (SELECT COUNT(*) FROM meetup_sessions WHERE status = 'completed') * 100.0 / 
                    (SELECT COUNT(*) FROM meetup_sessions WHERE status IN ('completed', 'failed_proximity')), 2
                ) as value,
                'percentage' as unit
            UNION ALL
            SELECT 
                'Average Response Time (Friend Requests)' as metric,
                ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, COALESCE(accepted_at, NOW()))), 1) as value,
                'hours' as unit
            FROM friendships WHERE status = 'accepted'
        `);
        
        res.json({
            status: 'success',
            reportType: 'performance',
            generatedAt: new Date().toISOString(),
            summary: `Performance metrics analysis`,
            data: performanceMetrics
        });
        
        console.log(`✅ Performance metrics report generated`);
    } catch (error) {
        console.error('❌ Error generating performance metrics report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate performance metrics report' });
    } finally {
        if (connection) connection.release();
    }
});

// Date Range Report (Generic)
app.get('/api/reports/date-range', authRequired, permit('admin'), async (req, res) => {
    const { startDate, endDate, dataType } = req.query;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        // Default to last 30 days if no dates provided
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];
        
        // Get activity summary for date range
        const [activitySummary] = await connection.execute(`
            SELECT 
                DATE(created_at) as activity_date,
                'Users Registered' as activity_type,
                COUNT(*) as count
            FROM users 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            
            UNION ALL
            
            SELECT 
                DATE(created_at) as activity_date,
                'Friendships Created' as activity_type,
                COUNT(*) as count
            FROM friendships 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            
            UNION ALL
            
            SELECT 
                DATE(created_at) as activity_date,
                'Messages Sent' as activity_type,
                COUNT(*) as count
            FROM messages 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            
            UNION ALL
            
            SELECT 
                DATE(created_at) as activity_date,
                'Meetups Started' as activity_type,
                COUNT(*) as count
            FROM meetup_sessions 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            
            ORDER BY activity_date DESC, activity_type
        `, [start, end, start, end, start, end, start, end]);
        
        res.json({
            status: 'success',
            reportType: 'date-range',
            generatedAt: new Date().toISOString(),
            dateRange: { startDate: start, endDate: end },
            summary: `Activity summary from ${start} to ${end}`,
            data: activitySummary
        });
        
        console.log(`✅ Date range report generated: ${start} to ${end}`);
    } catch (error) {
        console.error('❌ Error generating date range report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate date range report' });
    } finally {
        if (connection) connection.release();
    }
});

// Meetups Report
app.get('/api/reports/meetups', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [meetups] = await connection.execute(`
            SELECT 
                ms.id,
                u1.username as requester_name,
                u2.username as addressee_name,
                ms.status,
                ms.created_at,
                ms.completed_at,
                ms.proximity_check_successful,
                CASE 
                    WHEN ms.requester_latitude IS NOT NULL AND ms.addressee_latitude IS NOT NULL 
                    THEN ROUND(
                        ST_Distance_Sphere(
                            POINT(ms.requester_longitude, ms.requester_latitude),
                            POINT(ms.addressee_longitude, ms.addressee_latitude)
                        ) / 1000, 2
                    )
                    ELSE NULL
                END as distance_km
            FROM meetup_sessions ms
            JOIN users u1 ON ms.requester_id = u1.id
            JOIN users u2 ON ms.addressee_id = u2.id
            ORDER BY ms.created_at DESC
        `);
        
        res.json({
            status: 'success',
            reportType: 'meetups',
            generatedAt: new Date().toISOString(),
            summary: `${meetups.length} total meetup sessions`,
            data: meetups
        });
        
        console.log(`✅ Meetups report generated: ${meetups.length} meetups`);
    } catch (error) {
        console.error('❌ Error generating meetups report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate meetups report' });
    } finally {
        if (connection) connection.release();
    }
});

// Messages Report
app.get('/api/reports/messages', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [messages] = await connection.execute(`
            SELECT 
                m.id,
                u1.username as sender_name,
                u2.username as receiver_name,
                LENGTH(m.content) as message_length,
                m.created_at,
                DATE(m.created_at) as message_date,
                HOUR(m.created_at) as message_hour
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            ORDER BY m.created_at DESC
            LIMIT 10000
        `);
        
        res.json({
            status: 'success',
            reportType: 'messages',
            generatedAt: new Date().toISOString(),
            summary: `${messages.length} messages (showing last 10,000)`,
            data: messages
        });
        
        console.log(`✅ Messages report generated: ${messages.length} messages`);
    } catch (error) {
        console.error('❌ Error generating messages report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate messages report' });
    } finally {
        if (connection) connection.release();
    }
});

// Admin Logs Report
app.get('/api/reports/admin-logs', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [logs] = await connection.execute(`
            SELECT 
                al.id,
                u.username as admin_name,
                al.action,
                al.details,
                al.timestamp
            FROM admin_logs al
            JOIN users u ON al.admin_id = u.id
            ORDER BY al.timestamp DESC
            LIMIT 5000
        `);
        
        res.json({
            status: 'success',
            reportType: 'admin-logs',
            generatedAt: new Date().toISOString(),
            summary: `${logs.length} admin log entries (showing last 5,000)`,
            data: logs
        });
        
        console.log(`✅ Admin logs report generated: ${logs.length} log entries`);
    } catch (error) {
        console.error('❌ Error generating admin logs report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate admin logs report' });
    } finally {
        if (connection) connection.release();
    }
});

// Custom Report
app.post('/api/reports/custom', authRequired, permit('admin'), async (req, res) => {
    const { reportType, startDate, endDate, format } = req.body;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        let query = '';
        let tableName = '';
        
        switch (reportType) {
            case 'users':
                tableName = 'users';
                query = `
                    SELECT * FROM users 
                    WHERE created_at BETWEEN ? AND ?
                    ORDER BY created_at DESC
                `;
                break;
                
            case 'friendships':
                tableName = 'friendships';
                query = `
                    SELECT 
                        f.*,
                        u1.username as requester_name,
                        u2.username as addressee_name
                    FROM friendships f
                    JOIN users u1 ON f.requester_id = u1.id
                    JOIN users u2 ON f.addressee_id = u2.id
                    WHERE f.created_at BETWEEN ? AND ?
                    ORDER BY f.created_at DESC
                `;
                break;
                
            case 'meetups':
                tableName = 'meetup_sessions';
                query = `
                    SELECT 
                        ms.*,
                        u1.username as requester_name,
                        u2.username as addressee_name
                    FROM meetup_sessions ms
                    JOIN users u1 ON ms.requester_id = u1.id
                    JOIN users u2 ON ms.addressee_id = u2.id
                    WHERE ms.created_at BETWEEN ? AND ?
                    ORDER BY ms.created_at DESC
                `;
                break;
                
            case 'messages':
                tableName = 'messages';
                query = `
                    SELECT 
                        m.*,
                        u1.username as sender_name,
                        u2.username as receiver_name
                    FROM messages m
                    JOIN users u1 ON m.sender_id = u1.id
                    JOIN users u2 ON m.receiver_id = u2.id
                    WHERE m.created_at BETWEEN ? AND ?
                    ORDER BY m.created_at DESC
                    LIMIT 10000
                `;
                break;
                
            default:
                return res.status(400).json({ status: 'error', message: 'Invalid report type' });
        }
        
        const [data] = await connection.execute(query, [startDate, endDate]);
        
        res.json({
            status: 'success',
            reportType: `custom-${reportType}`,
            generatedAt: new Date().toISOString(),
            dateRange: { startDate, endDate },
            summary: `${data.length} ${reportType} records from ${startDate} to ${endDate}`,
            data: data
        });
        
        console.log(`✅ Custom ${reportType} report generated: ${data.length} records`);
    } catch (error) {
        console.error('❌ Error generating custom report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate custom report' });
    } finally {
        if (connection) connection.release();
    }
});

// Export All Data
app.get('/api/reports/export-all', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get all data from main tables
        const [users] = await connection.execute('SELECT * FROM users ORDER BY created_at DESC');
        const [friendships] = await connection.execute(`
            SELECT 
                f.*,
                u1.username as requester_name,
                u2.username as addressee_name
            FROM friendships f
            JOIN users u1 ON f.requester_id = u1.id
            JOIN users u2 ON f.addressee_id = u2.id
            ORDER BY f.created_at DESC
        `);
        const [meetups] = await connection.execute(`
            SELECT 
                ms.*,
                u1.username as requester_name,
                u2.username as addressee_name
            FROM meetup_sessions ms
            JOIN users u1 ON ms.requester_id = u1.id
            JOIN users u2 ON ms.addressee_id = u2.id
            ORDER BY ms.created_at DESC
        `);
        const [messages] = await connection.execute(`
            SELECT 
                m.id,
                u1.username as sender_name,
                u2.username as receiver_name,
                LENGTH(m.content) as message_length,
                m.created_at
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            ORDER BY m.created_at DESC
            LIMIT 50000
        `);
        
        const exportData = {
            exportDate: new Date().toISOString(),
            summary: {
                totalUsers: users.length,
                totalFriendships: friendships.length,
                totalMeetups: meetups.length,
                totalMessages: messages.length
            },
            users,
            friendships,
            meetups,
            messages
        };
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="full_export_${new Date().toISOString().split('T')[0]}.json"`);
        
        res.json(exportData);
        
        console.log(`✅ Full data export completed: ${users.length} users, ${friendships.length} friendships, ${meetups.length} meetups, ${messages.length} messages`);
    } catch (error) {
        console.error('❌ Error exporting all data:', error);
        res.status(500).json({ status: 'error', message: 'Failed to export all data' });
    } finally {
        if (connection) connection.release();
    }
});

// Add these endpoints after your existing admin routes (around line 1400):

// Create the news_posts table if it doesn't exist
const createNewsPostsTable = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS news_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                post_type ENUM('announcement', 'update', 'maintenance', 'feature') DEFAULT 'announcement',
                priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_created_at (created_at),
                INDEX idx_is_active (is_active)
            )
        `);
        
        console.log('✅ News posts table created/verified');
    } catch (error) {
        console.error('❌ Error creating news posts table:', error);
    } finally {
        if (connection) connection.release();
    }
};

const createNewsLikesTable = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS news_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                post_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES news_posts(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_post (user_id, post_id),
                INDEX idx_post_id (post_id),
                INDEX idx_user_id (user_id)
            )
        `);
        
        console.log('✅ News likes table created/verified');
    } catch (error) {
        console.error('❌ Error creating news likes table:', error);
    } finally {
        if (connection) connection.release();
    }
};


// Call this function during server startup
createNewsPostsTable();
createNewsLikesTable(); // ADD THIS LINE

// --- NEWS FEED ENDPOINTS ---

// Get news feed posts (for users)
app.get('/api/news-feed', authRequired, async (req, res) => {
    const userId = req.session.userId;
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [posts] = await connection.execute(`
            SELECT 
                np.id,
                np.title,
                np.content,
                np.post_type,
                np.priority,
                np.created_at,
                u.username as admin_name,
                COUNT(nl.id) as like_count,
                MAX(CASE WHEN nl.user_id = ? THEN 1 ELSE 0 END) as user_liked
            FROM news_posts np
            JOIN users u ON np.admin_id = u.id
            LEFT JOIN news_likes nl ON np.id = nl.post_id
            WHERE np.is_active = TRUE
            GROUP BY np.id, np.title, np.content, np.post_type, np.priority, np.created_at, u.username
            ORDER BY np.priority = 'high' DESC, np.created_at DESC
            LIMIT 20
        `, [userId]);
        
        res.json({
            status: 'success',
            posts: posts
        });
        
        console.log(`✅ News feed loaded: ${posts.length} posts for user ${userId}`);
    } catch (error) {
        console.error('❌ Error loading news feed:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load news feed' });
    } finally {
        if (connection) connection.release();
    }
});

// Like a news post
app.post('/api/news-posts/:postId/like', authRequired, async (req, res) => {
    const { postId } = req.params;
    const userId = req.session.userId;
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if post exists and is active
        const [postCheck] = await connection.execute(
            'SELECT id FROM news_posts WHERE id = ? AND is_active = TRUE',
            [postId]
        );
        
        if (postCheck.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Post not found or inactive' });
        }
        
        // Check if user already liked this post
        const [existingLike] = await connection.execute(
            'SELECT id FROM news_likes WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );
        
        if (existingLike.length > 0) {
            return res.status(400).json({ status: 'error', message: 'You have already liked this post' });
        }
        
        // Add the like
        await connection.execute(
            'INSERT INTO news_likes (user_id, post_id) VALUES (?, ?)',
            [userId, postId]
        );
        
        // Get updated like count
        const [likeCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM news_likes WHERE post_id = ?',
            [postId]
        );
        
        res.json({
            status: 'success',
            message: 'Post liked successfully',
            like_count: likeCount[0].count,
            user_liked: true
        });
        
        console.log(`✅ User ${userId} liked post ${postId}`);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'You have already liked this post' });
        }
        console.error('❌ Error liking post:', error);
        res.status(500).json({ status: 'error', message: 'Failed to like post' });
    } finally {
        if (connection) connection.release();
    }
});

// Unlike a news post
app.delete('/api/news-posts/:postId/like', authRequired, async (req, res) => {
    const { postId } = req.params;
    const userId = req.session.userId;
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Remove the like
        const [result] = await connection.execute(
            'DELETE FROM news_likes WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ status: 'error', message: 'You have not liked this post' });
        }
        
        // Get updated like count
        const [likeCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM news_likes WHERE post_id = ?',
            [postId]
        );
        
        res.json({
            status: 'success',
            message: 'Post unliked successfully',
            like_count: likeCount[0].count,
            user_liked: false
        });
        
        console.log(`✅ User ${userId} unliked post ${postId}`);
    } catch (error) {
        console.error('❌ Error unliking post:', error);
        res.status(500).json({ status: 'error', message: 'Failed to unlike post' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/admin/news-posts/analytics', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get post analytics
        const [analytics] = await connection.execute(`
            SELECT 
                np.id,
                np.title,
                np.post_type,
                np.priority,
                np.created_at,
                np.is_active,
                COUNT(nl.id) as total_likes,
                COUNT(DISTINCT nl.user_id) as unique_users_liked
            FROM news_posts np
            LEFT JOIN news_likes nl ON np.id = nl.post_id
            GROUP BY np.id, np.title, np.post_type, np.priority, np.created_at, np.is_active
            ORDER BY total_likes DESC, np.created_at DESC
        `);
        
        // Get overall stats
        const [overallStats] = await connection.execute(`
            SELECT 
                COUNT(DISTINCT np.id) as total_posts,
                COUNT(DISTINCT nl.id) as total_likes,
                COUNT(DISTINCT nl.user_id) as users_who_liked,
                AVG(like_counts.likes_per_post) as avg_likes_per_post
            FROM news_posts np
            LEFT JOIN news_likes nl ON np.id = nl.post_id
            LEFT JOIN (
                SELECT post_id, COUNT(*) as likes_per_post
                FROM news_likes
                GROUP BY post_id
            ) like_counts ON np.id = like_counts.post_id
        `);
        
        res.json({
            status: 'success',
            analytics: analytics,
            stats: overallStats[0]
        });
        
        console.log(`✅ News analytics loaded: ${analytics.length} posts`);
    } catch (error) {
        console.error('❌ Error loading news analytics:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load analytics' });
    } finally {
        if (connection) connection.release();
    }
});

// Get all news posts (for admin)
app.get('/api/admin/news-posts', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [posts] = await connection.execute(`
            SELECT 
                np.id,
                np.title,
                np.content,
                np.post_type,
                np.priority,
                np.is_active,
                np.created_at,
                np.updated_at,
                u.username as admin_name
            FROM news_posts np
            JOIN users u ON np.admin_id = u.id
            ORDER BY np.created_at DESC
        `);
        
        res.json({
            status: 'success',
            posts: posts
        });
        
        console.log(`✅ Admin news posts loaded: ${posts.length} posts`);
    } catch (error) {
        console.error('❌ Error loading admin news posts:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load news posts' });
    } finally {
        if (connection) connection.release();
    }
});

// Create new news post (admin only)
app.post('/api/admin/news-posts', authRequired, permit('admin'), async (req, res) => {
    const { title, content, post_type, priority } = req.body;
    const adminId = req.session.userId;
    
    if (!title || !content) {
        return res.status(400).json({ status: 'error', message: 'Title and content are required' });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [result] = await connection.execute(`
            INSERT INTO news_posts (admin_id, title, content, post_type, priority) 
            VALUES (?, ?, ?, ?, ?)
        `, [adminId, title, content, post_type || 'announcement', priority || 'normal']);
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [adminId, 'news_post_created', `Created news post: "${title}" (ID: ${result.insertId})`]
        );
        
        // Create notification for successful post creation
        await createSystemNotification(
            'success',
            'News Post Created',
            `News post "${title}" has been published successfully.`,
            adminId
        );
        
        res.status(201).json({
            status: 'success',
            message: 'News post created successfully',
            postId: result.insertId
        });
        
        console.log(`✅ News post created: "${title}" by admin ${adminId}`);
    } catch (error) {
        console.error('❌ Error creating news post:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create news post' });
    } finally {
        if (connection) connection.release();
    }
});

// Update news post (admin only)
app.put('/api/admin/news-posts/:id', authRequired, permit('admin'), async (req, res) => {
    const { id } = req.params;
    const { title, content, post_type, priority, is_active } = req.body;
    const adminId = req.session.userId;
    
    if (!title || !content) {
        return res.status(400).json({ status: 'error', message: 'Title and content are required' });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [result] = await connection.execute(`
            UPDATE news_posts 
            SET title = ?, content = ?, post_type = ?, priority = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        `, [title, content, post_type, priority, is_active, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'News post not found' });
        }
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [adminId, 'news_post_updated', `Updated news post ID: ${id} - "${title}"`]
        );
        
        res.json({
            status: 'success',
            message: 'News post updated successfully'
        });
        
        console.log(`✅ News post updated: ID ${id} by admin ${adminId}`);
    } catch (error) {
        console.error('❌ Error updating news post:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update news post' });
    } finally {
        if (connection) connection.release();
    }
});

// Delete news post (admin only)
app.delete('/api/admin/news-posts/:id', authRequired, permit('admin'), async (req, res) => {
    const { id } = req.params;
    const adminId = req.session.userId;
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Get post info before deletion
        const [postInfo] = await connection.execute(
            'SELECT title FROM news_posts WHERE id = ?',
            [id]
        );
        
        if (postInfo.length === 0) {
            return res.status(404).json({ status: 'error', message: 'News post not found' });
        }
        
        const title = postInfo[0].title;
        
        const [result] = await connection.execute(
            'DELETE FROM news_posts WHERE id = ?',
            [id]
        );
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [adminId, 'news_post_deleted', `Deleted news post: "${title}" (ID: ${id})`]
        );
        
        res.json({
            status: 'success',
            message: 'News post deleted successfully'
        });
        
        console.log(`✅ News post deleted: ID ${id} by admin ${adminId}`);
    } catch (error) {
        console.error('❌ Error deleting news post:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete news post' });
    } finally {
        if (connection) connection.release();
    }
});

// Toggle news post active status
app.put('/api/admin/news-posts/:id/toggle', authRequired, permit('admin'), async (req, res) => {
    const { id } = req.params;
    const adminId = req.session.userId;
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [result] = await connection.execute(`
            UPDATE news_posts 
            SET is_active = NOT is_active, updated_at = NOW()
            WHERE id = ?
        `, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'News post not found' });
        }
        
        // Get the new status
        const [updatedPost] = await connection.execute(
            'SELECT title, is_active FROM news_posts WHERE id = ?',
            [id]
        );
        
        const newStatus = updatedPost[0].is_active ? 'activated' : 'deactivated';
        
        // Log the action
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [adminId, 'news_post_toggled', `${newStatus} news post: "${updatedPost[0].title}" (ID: ${id})`]
        );
        
        res.json({
            status: 'success',
            message: `News post ${newStatus} successfully`,
            is_active: updatedPost[0].is_active
        });
        
        console.log(`✅ News post ${newStatus}: ID ${id} by admin ${adminId}`);
    } catch (error) {
        console.error('❌ Error toggling news post:', error);
        res.status(500).json({ status: 'error', message: 'Failed to toggle news post' });
    } finally {
        if (connection) connection.release();
    }
});



// NEW REGISTRATION ENDPOINT WITH PROFILE PHOTO SUPPORT
app.post('/api/auth/register', upload.single('profilePhoto'), async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ status: 'error', message: 'Username, email, and password are required.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check if username or email already exists
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ status: 'error', message: 'Username or email already exists.' });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.' 
            });
        }

        const hashedPassword = await hashPassword(password);
        
        // Handle profile photo if uploaded
        let profilePhotoData = null;
        let profilePhotoMime = null;
        
        if (req.file) {
            profilePhotoData = req.file.buffer.toString('base64');
            profilePhotoMime = req.file.mimetype;
            console.log(`📸 Profile photo uploaded: ${req.file.mimetype}, ${Math.round(req.file.size / 1024)}KB`);
        }

        // Insert new user with profile photo
        const [result] = await connection.execute(`
            INSERT INTO users (username, email, password_hash, profile_photo, profile_photo_mime, role) 
            VALUES (?, ?, ?, ?, ?, 'user')
        `, [username, email, hashedPassword, profilePhotoData, profilePhotoMime]);
        
        console.log(`✅ New user registered: ${username} (ID: ${result.insertId})`);
        
        // Create system notification for new user registration
        await createSystemNotification(
            'info',
            'New User Registration',
            `New user "${username}" has registered on the platform.`
        );
        
        res.status(201).json({ 
            status: 'success', 
            message: 'Account created successfully!',
            userId: result.insertId 
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ status: 'error', message: 'Registration failed. Please try again.' });
    } finally {
        if (connection) connection.release();
    }
});

// ROUTE 1: Get the CURRENT user's profile photo
app.get('/api/profile-photo', authRequired, async (req, res) => {
    const userId = req.session.userId;
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute(
            'SELECT profile_photo, profile_photo_mime FROM users WHERE id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Current user not found.' });
        }
        const user = rows[0];
        if (!user.profile_photo) {
            return res.json({ status: 'success', hasPhoto: false });
        }
        res.json({
            status: 'success',
            hasPhoto: true,
            photo: `data:${user.profile_photo_mime};base64,${user.profile_photo}`
        });
    } catch (error) {
        console.error('Error fetching current user profile photo:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch profile photo.' });
    } finally {
        if (connection) connection.release();
    }
});

// ROUTE 2: Get a SPECIFIC user's profile photo by ID
app.get('/api/profile-photo/:userId', authRequired, async (req, res) => {
    const { userId } = req.params;
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute(
            'SELECT profile_photo, profile_photo_mime FROM users WHERE id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }
        const user = rows[0];
        if (!user.profile_photo) {
            return res.json({ status: 'success', hasPhoto: false });
        }
        res.json({
            status: 'success',
            hasPhoto: true,
            photo: `data:${user.profile_photo_mime};base64,${user.profile_photo}`
        });
    } catch (error) {
        console.error(`Error fetching profile photo for user ${userId}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch profile photo.' });
    } finally {
        if (connection) connection.release();
    }
});

// UPDATE PROFILE PHOTO ENDPOINT
app.post('/api/update-profile-photo', authRequired, upload.single('profilePhoto'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No photo uploaded' });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const profilePhotoData = req.file.buffer.toString('base64');
        const profilePhotoMime = req.file.mimetype;
        
        await connection.execute(`
            UPDATE users 
            SET profile_photo = ?, profile_photo_mime = ? 
            WHERE id = ?
        `, [profilePhotoData, profilePhotoMime, req.session.userId]);
        
        console.log(`📸 Profile photo updated for user ${req.session.userId}`);
        
        res.json({ 
            status: 'success', 
            message: 'Profile photo updated successfully!',
            photo: `data:${profilePhotoMime};base64,${profilePhotoData}`
        });
        
    } catch (error) {
        console.error('Error updating profile photo:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update profile photo' });
    } finally {
        if (connection) connection.release();
    }
});

// Add this profile update endpoint
app.post('/api/update-profile', authRequired, async (req, res) => {
    const { username, email, password } = req.body;
    const userId = req.session.userId;
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        let updateFields = [];
        let values = [];
        
        // --- START OF FIX ---
        // Validate and add fields to update query only if they are provided
        if (username) {
            const [existingUser] = await connection.execute(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, userId]
            );
            if (existingUser.length > 0) {
                return res.status(400).json({ status: 'error', message: 'Username is already taken.' });
            }
            updateFields.push('username = ?');
            values.push(username);
        }
        
        if (email) {
            const [existingEmail] = await connection.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            if (existingEmail.length > 0) {
                return res.status(400).json({ status: 'error', message: 'Email is already in use.' });
            }
            updateFields.push('email = ?');
            values.push(email);
        }
        
        if (password) {
            const hashedPassword = await hashPassword(password);
            updateFields.push('password_hash = ?');
            values.push(hashedPassword);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No update information provided.' });
        }
        
        values.push(userId); // Add userId for the WHERE clause
        
        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await connection.execute(sql, values);
        // --- END OF FIX ---
        
        console.log(`✅ Profile updated for user ${userId}`);
        res.json({ status: 'success', message: 'Profile updated successfully' });
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update profile' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// --- NOTIFICATION ENDPOINTS ---

// Get admin notifications
// Replace the existing GET /api/admin/notifications endpoint with this debug version:
app.get('/api/admin/notifications', authRequired, permit('admin'), async (req, res) => {
    let connection;
    try {
        console.log(`🔍 Fetching notifications for admin ID: ${req.session.userId}`);
        
        connection = await dbPool.getConnection();
        
        // Create notifications table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                type ENUM('info', 'success', 'warning', 'error', 'user', 'system') DEFAULT 'info',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                \`read\` BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_id (admin_id),
                INDEX idx_created_at (created_at)
            )
        `);
        
        console.log(`✅ Notifications table ready`);
        
        // Get notifications for this admin (last 50)
        const [notifications] = await connection.execute(`
            SELECT * FROM admin_notifications 
            WHERE admin_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [req.session.userId]);
        
        console.log(`📋 Found ${notifications.length} notifications for admin ${req.session.userId}`);
        
        // If no notifications exist, create a welcome notification
        if (notifications.length === 0) {
            console.log(`🔔 Creating welcome notification for admin ${req.session.userId}`);
            
            await connection.execute(`
                INSERT INTO admin_notifications (admin_id, type, title, message) 
                VALUES (?, ?, ?, ?)
            `, [req.session.userId, 'info', 'Welcome to Admin Panel', 'Notification system is now active and monitoring your system.']);
            
            // Fetch the newly created notification
            const [newNotifications] = await connection.execute(`
                SELECT * FROM admin_notifications 
                WHERE admin_id = ? 
                ORDER BY created_at DESC 
                LIMIT 50
            `, [req.session.userId]);
            
            console.log(`✅ Created welcome notification, total: ${newNotifications.length}`);
            
            res.json({ 
                status: 'success', 
                notifications: newNotifications 
            });
        } else {
            res.json({ 
                status: 'success', 
                notifications: notifications 
            });
        }
        
        console.log(`✅ Notifications response sent: ${notifications.length} notifications`);
    } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ status: 'error', message: 'Failed to fetch notifications', error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// Mark notification as read
app.post('/api/admin/notifications/:id/read', authRequired, permit('admin'), async (req, res) => {
    const notificationId = req.params.id;
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        const [result] = await connection.execute(`
            UPDATE admin_notifications 
            SET \`read\` = TRUE 
            WHERE id = ? AND admin_id = ?
        `, [notificationId, req.session.userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Notification not found' });
        }
        
        res.json({ status: 'success', message: 'Notification marked as read' });
        console.log(`✅ Notification ${notificationId} marked as read`);
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.status(500).json({ status: 'error', message: 'Failed to mark notification as read' });
    } finally {
        if (connection) connection.release();
    }
});

// Mark all notifications as read
app.post('/api/admin/notifications/mark-all-read', authRequired, permit('admin'), async (req, res) => {
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        const [result] = await connection.execute(`
            UPDATE admin_notifications 
            SET \`read\` = TRUE 
            WHERE admin_id = ?
        `, [req.session.userId]);
        
        res.json({ 
            status: 'success', 
            message: 'All notifications marked as read',
            updatedCount: result.affectedRows
        });
        
        console.log(`✅ All notifications marked as read: ${result.affectedRows} notifications`);
    } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        res.status(500).json({ status: 'error', message: 'Failed to mark all notifications as read' });
    } finally {
        if (connection) connection.release();
    }
});

// Clear all notifications
app.delete('/api/admin/notifications/clear', authRequired, permit('admin'), async (req, res) => {
    let connection;
    
    try {
        connection = await dbPool.getConnection();
        
        const [result] = await connection.execute(`
            DELETE FROM admin_notifications 
            WHERE admin_id = ?
        `, [req.session.userId]);
        
        res.json({ 
            status: 'success', 
            message: 'All notifications cleared',
            deletedCount: result.affectedRows
        });
        
        console.log(`✅ All notifications cleared: ${result.affectedRows} notifications`);
    } catch (error) {
        console.error('❌ Error clearing notifications:', error);
        res.status(500).json({ status: 'error', message: 'Failed to clear notifications' });
    } finally {
        if (connection) connection.release();
    }
});

// // Create a new notification (for system events)
// const createNotification = async (adminId, type, title, message) => {
//     let connection;
//     try {
//         connection = await dbPool.getConnection();
        
//         await connection.execute(`
//             INSERT INTO admin_notifications (admin_id, type, title, message) 
//             VALUES (?, ?, ?, ?)
//         `, [adminId, type, title, message]);
        
//         console.log(`🔔 Notification created: ${title} for admin ${adminId}`);
//     } catch (error) {
//         console.error('❌ Error creating notification:', error);
//     } finally {
//         if (connection) connection.release();
//     }
// };

// --- REAL NOTIFICATION SYSTEM ---

// Create a notification for system events
// Replace the existing createSystemNotification function:
const createSystemNotification = async (type, title, message, adminId = null) => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Create notifications table if it doesn't exist - MAKE admin_id NULLABLE
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NULL,
                type ENUM('info', 'success', 'warning', 'error', 'user', 'system') DEFAULT 'info',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                \`read\` BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_id (admin_id),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        if (adminId && adminId !== null) {
            // Send to specific admin
            await connection.execute(`
                INSERT INTO admin_notifications (admin_id, type, title, message) 
                VALUES (?, ?, ?, ?)
            `, [adminId, type, title, message]);
            console.log(`🔔 System notification created for admin ${adminId}: ${title}`);
        } else {
            // Send to all admins
            const [admins] = await connection.execute(`
                SELECT id FROM users WHERE role = 'admin'
            `);
            
            if (admins.length === 0) {
                console.log(`⚠️ No admin users found to send notification to`);
                return;
            }
            
            for (const admin of admins) {
                await connection.execute(`
                    INSERT INTO admin_notifications (admin_id, type, title, message) 
                    VALUES (?, ?, ?, ?)
                `, [admin.id, type, title, message]);
            }
            console.log(`🔔 System notification created for ${admins.length} admins: ${title}`);
        }
    } catch (error) {
        console.error('❌ Error creating system notification:', error);
        console.error('❌ Error details:', error);
    } finally {
        if (connection) connection.release();
    }
};

// Monitor database connection health
const monitorDatabaseHealth = async () => {
    try {
        const connection = await dbPool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        
        // Database is healthy - clear any previous error notifications
        console.log('💚 Database health check: OK');
    } catch (error) {
        console.error('💔 Database health check failed:', error);
        
        // Create critical error notification
        await createSystemNotification(
            'error',
            'Database Connection Failed',
            `Database connection error: ${error.message}. Please check database server status.`
        );
    }
};

// Monitor system performance
const monitorSystemPerformance = async () => {
    try {
        const memoryUsage = process.memoryUsage();
        const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        
        // Alert if memory usage is high (>500MB)
        if (memoryUsageMB > 500) {
            await createSystemNotification(
                'warning',
                'High Memory Usage Detected',
                `Server memory usage is ${memoryUsageMB}MB. Consider restarting the server if performance is affected.`
            );
        }
        
        // Check database performance
        let connection;
        try {
            connection = await dbPool.getConnection();
            const startTime = Date.now();
            await connection.execute('SELECT COUNT(*) FROM users');
            const queryTime = Date.now() - startTime;
            
            // Alert if query is slow (>1000ms)
            if (queryTime > 1000) {
                await createSystemNotification(
                    'warning',
                    'Slow Database Performance',
                    `Database query took ${queryTime}ms to complete. Database may be under heavy load.`
                );
            }
        } finally {
            if (connection) connection.release();
        }
        
        console.log(`⚡ Performance check: Memory ${memoryUsageMB}MB`);
    } catch (error) {
        console.error('❌ Performance monitoring error:', error);
        await createSystemNotification(
            'error',
            'Performance Monitoring Failed',
            `Unable to monitor system performance: ${error.message}`
        );
    }
};

// Monitor failed login attempts
const monitorFailedLogins = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check for multiple failed login attempts in last 10 minutes
        const [failedAttempts] = await connection.execute(`
            SELECT COUNT(*) as failed_count 
            FROM admin_logs 
            WHERE action = 'failed_login' 
            AND timestamp >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        `);
        
        const failedCount = failedAttempts[0].failed_count;
        
        if (failedCount >= 5) {
            await createSystemNotification(
                'error',
                'Multiple Failed Login Attempts',
                `${failedCount} failed login attempts detected in the last 10 minutes. Possible security threat.`
            );
        }
    } catch (error) {
        console.error('❌ Failed login monitoring error:', error);
    } finally {
        if (connection) connection.release();
    }
};

// Monitor disk space (simplified check)
const monitorDiskSpace = async () => {
    try {
        let connection;
        try {
            connection = await dbPool.getConnection();
            
            // Check database size
            const [dbSize] = await connection.execute(`
                SELECT 
                    ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as total_size_mb
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE()
            `);
            
            const sizeMB = dbSize[0].total_size_mb || 0;
            
            // Alert if database is getting large (>1GB)
            if (sizeMB > 1024) {
                await createSystemNotification(
                    'warning',
                    'Large Database Size',
                    `Database size is ${sizeMB}MB. Consider archiving old data or optimizing tables.`
                );
            }
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('❌ Disk space monitoring error:', error);
    }
};

// Monitor user activity anomalies
const monitorUserActivity = async () => {
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        // Check for unusual spikes in user registrations
        const [todayUsers] = await connection.execute(`
            SELECT COUNT(*) as today_count 
            FROM users 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        const [avgUsers] = await connection.execute(`
            SELECT AVG(daily_count) as avg_count 
            FROM (
                SELECT COUNT(*) as daily_count 
                FROM users 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
            ) as daily_stats
        `);
        
        const todayCount = todayUsers[0].today_count;
        const avgCount = avgUsers[0].avg_count || 0;
        
        // Alert if today's registrations are 3x higher than average
        if (todayCount > (avgCount * 3) && todayCount > 10) {
            await createSystemNotification(
                'warning',
                'Unusual User Registration Spike',
                `${todayCount} new users registered today (${Math.round(avgCount * 10) / 10} average). Monitor for potential bot activity.`
            );
        }
        
        // Check for failed meetups
        const [failedMeetups] = await connection.execute(`
            SELECT COUNT(*) as failed_count 
            FROM meetup_sessions 
            WHERE status = 'failed_proximity' 
            AND DATE(created_at) = CURDATE()
        `);
        
        if (failedMeetups[0].failed_count > 5) {
            await createSystemNotification(
                'warning',
                'High Meetup Failure Rate',
                `${failedMeetups[0].failed_count} meetups failed proximity checks today. Users may be having location issues.`
            );
        }
        
    } catch (error) {
        console.error('❌ User activity monitoring error:', error);
    } finally {
        if (connection) connection.release();
    }
};



// Start system monitoring
// Replace the existing startSystemMonitoring function:
const startSystemMonitoring = () => {
    console.log('🔍 Starting system monitoring...');
    
    // Database health check every 2 minutes
    setInterval(monitorDatabaseHealth, 2 * 60 * 1000);
    
    // Performance check every 5 minutes
    setInterval(monitorSystemPerformance, 5 * 60 * 1000);
    
    // Security monitoring every 3 minutes
    setInterval(monitorFailedLogins, 3 * 60 * 1000);
    
    // Disk space check every 15 minutes
    setInterval(monitorDiskSpace, 15 * 60 * 1000);
    
    // User activity monitoring every 10 minutes
    setInterval(monitorUserActivity, 10 * 60 * 1000);
    
    console.log('✅ System monitoring started - notifications will only appear for real system events');
};
// Enhanced error handling for all admin operations
const logAdminError = async (adminId, action, error, context = {}) => {
    try {
        // Log to admin_logs table
        let connection = await dbPool.getConnection();
        
        await connection.execute(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [adminId, `error_${action}`, `Error: ${error.message}. Context: ${JSON.stringify(context)}`]
        );
        
        connection.release();
        
        // Create notification for critical errors
        if (error.message.includes('database') || error.message.includes('connection')) {
            await createSystemNotification(
                'error',
                `Admin Operation Failed: ${action}`,
                `Error occurred during ${action}: ${error.message}`
            );
        }
    } catch (logError) {
        console.error('Failed to log admin error:', logError);
    }
};

// Export the notification function for use in other parts of the app
global.createSystemNotification = createSystemNotification;
global.logAdminError = logAdminError;

// Export the createNotification function for use in other parts of the app
// You can call this function whenever you want to create a notification
// Example: createNotification(adminId, 'success', 'User Created', 'A new user has been created successfully');

// 6.2. HTML Page Routes

// --- Public Routes ---
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'pages', 'login.html'));
});

// Serve login page
app.get('/login.html', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'pages', 'login.html'));
});

// Redirect /login to /login.html
app.get('/login', (req, res) => {
    res.redirect('/login.html');
});


// --- Admin Routes ---
app.get('/admin', authRequired, permit('admin'), (req, res) => {
    res.redirect('/admin/dashboard');
});


app.get('/admin/login', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'admin_Login.html'));
});

app.get('/admin/dashboard', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

// Handle all admin sub-routes (they all point to the same SPA)
app.get('/admin/users', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

app.get('/admin/analytics', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

app.get('/admin/friendships', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

app.get('/admin/messages', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

app.get('/admin/meetups', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

app.get('/admin/logs', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

app.get('/admin/settings', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

app.get('/admin/database', authRequired, permit('admin'), (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'admin', 'adminPanel.html'));
});

// --- 404 Handlers ---
// Admin 404 (must come before general 404)
app.get('/admin/*', (req, res) => {
    res.status(404).sendFile(path.resolve(__dirname, 'public', 'admin', '404.html'));
});

// General 404 (must be last)
app.get('*', (req, res) => {
    res.status(404).sendFile(path.resolve(__dirname, 'public', 'pages', '404.html'));
});

// Start the system monitoring (ADD THIS BEFORE app.listen())
startSystemMonitoring();

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    
    console.log('🌐 HTML Routes registered:');
    console.log('  📄 GET / (Homepage)');
    console.log('  📄 GET /admin/login (Admin Login)');
    console.log('  🔐 GET /admin/* (Admin Panel - All admin routes)');
    
    console.log('📋 Admin API Routes registered:');
    console.log('  🔐 GET /api/admin/friendships');
    console.log('  🔐 GET /api/admin/friendships/:id');
    console.log('  🔐 POST /api/admin/friendships/:id/approve');
    console.log('  🔐 POST /api/admin/friendships/:id/reject');
    console.log('  🔐 DELETE /api/admin/friendships/:id');
    console.log('  🔐 GET /api/admin/messages');
    console.log('  🔐 GET /api/admin/meetups');
    console.log('  🔐 GET /api/admin/meetups/:id');
    console.log('  🔐 POST /api/admin/meetups/:id/complete');
    console.log('  🔐 POST /api/admin/meetups/:id/fail');
    console.log('  🔐 POST /api/admin/meetups/:id/reset');
    console.log('  🔐 DELETE /api/admin/meetups/:id');
    console.log('  🔐 GET /api/analytics/dashboard-stats');
    console.log('  🔐 GET /api/analytics/charts-data');
    console.log('  🔐 GET /api/analytics/detailed-data');
    console.log('  🔐 GET /api/db-info');
    console.log('  🔐 GET /api/db-tables');
    console.log('  🔐 GET /api/logs');
    console.log('  🔐 POST /api/logs/clear');
    console.log('  🔐 GET /api/users');
    console.log('  🔐 POST /api/users');
    console.log('  🔐 PUT /api/users/:id');
    console.log('  🔐 DELETE /api/users/:id');
    
    console.log('');
    console.log('🚀 Access Points:');
    console.log(`   📱 Homepage: http://localhost:${port}/`);
    console.log(`   🔐 Admin Login: http://localhost:${port}/admin/login`);
    console.log(`   📊 Admin Panel: http://localhost:${port}/admin/dashboard`);
    console.log('');
    console.log('📋 Current Files Expected:');
    console.log('   📄 public/index.html');
    console.log('   📄 public/404.html');
    console.log('   📄 public/admin/adminLogin.html');
    console.log('   📄 public/admin/adminPanel.html');
    console.log('   📄 public/admin/404.html');
});
