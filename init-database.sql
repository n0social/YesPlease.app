-- YesPlease.app Database Initialization Script
-- This script creates all the necessary tables for the application

-- Create database (optional - uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS yesplease_app;
-- USE yesplease_app;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    profile_photo LONGTEXT NULL,
    profile_photo_mime VARCHAR(100) NULL,
    reset_token VARCHAR(64) NULL,
    reset_token_expiry DATETIME NULL,
    logged_in TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'denied', 'removed') DEFAULT 'pending',
    action_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (action_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_friendship (requester_id, addressee_id),
    INDEX idx_requester (requester_id),
    INDEX idx_addressee (addressee_id),
    INDEX idx_status (status)
);

-- Friendship logs table
CREATE TABLE IF NOT EXISTS friendship_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    action_user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (action_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_conversation (sender_id, receiver_id),
    INDEX idx_created_at (created_at)
);

-- Meetup sessions table
CREATE TABLE IF NOT EXISTS meetup_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    status ENUM('pending', 'waiting_confirmation', 'completed', 'denied', 'failed_proximity', 'ended') DEFAULT 'pending',
    requester_nda_confirmed BOOLEAN DEFAULT FALSE,
    addressee_nda_confirmed BOOLEAN DEFAULT FALSE,
    requester_lat DECIMAL(10, 8) NULL,
    requester_lon DECIMAL(11, 8) NULL,
    addressee_lat DECIMAL(10, 8) NULL,
    addressee_lon DECIMAL(11, 8) NULL,
    proximity_check_successful BOOLEAN NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_requester (requester_id),
    INDEX idx_addressee (addressee_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Sessions table (for express-session)
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT(11) UNSIGNED NOT NULL,
    data MEDIUMTEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id)
);

-- Admin logs table
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- News posts table
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
    INDEX idx_is_active (is_active),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- News likes table
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
);

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create a default admin user (password: admin123)
-- Note: Change this password in production!
INSERT IGNORE INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@yesplease.app', '$2b$10$X8h8Kp8cY6fD1sA2qF5v3.rL6nP7hG9tQ3mE8kN1vR2sT4wX9zY8b', 'admin');

-- Insert some sample data for development/testing
-- You can remove this section for production

-- Sample users
INSERT IGNORE INTO users (username, email, password_hash, role) VALUES 
('demo_user1', 'user1@demo.com', '$2b$10$X8h8Kp8cY6fD1sA2qF5v3.rL6nP7hG9tQ3mE8kN1vR2sT4wX9zY8b', 'user'),
('demo_user2', 'user2@demo.com', '$2b$10$X8h8Kp8cY6fD1sA2qF5v3.rL6nP7hG9tQ3mE8kN1vR2sT4wX9zY8b', 'user');

-- Sample friendship (users 2 and 3 are friends)
INSERT IGNORE INTO friendships (requester_id, addressee_id, status, accepted_at) VALUES 
(2, 3, 'accepted', NOW());

-- Sample messages
INSERT IGNORE INTO messages (sender_id, receiver_id, content) VALUES 
(2, 3, 'Hey! How are you doing?'),
(3, 2, 'I\'m great! Thanks for asking. How about you?'),
(2, 3, 'Doing well, thanks! Want to meet up sometime?');

-- Sample news post
INSERT IGNORE INTO news_posts (admin_id, title, content, post_type, priority) VALUES 
(1, 'Welcome to YesPlease!', 'Welcome to our new social meetup platform! Connect with friends and arrange safe meetups.', 'announcement', 'high');

COMMIT;
