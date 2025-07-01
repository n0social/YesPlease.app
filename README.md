# YesPlease.app

A modern social meetup platform where users can connect with friends and arrange safe, proximity-based meetups.

## Features

- **User Authentication**: Secure registration and login system
- **Friend Management**: Send and accept friend requests
- **Real-time Messaging**: Chat with your friends
- **Meetup System**: Request and arrange meetups with proximity verification
- **Admin Panel**: Comprehensive admin dashboard for user and content management
- **News Feed**: System announcements and updates
- **Profile Management**: Customizable user profiles with photo uploads

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MySQL with connection pooling
- **Authentication**: Session-based authentication with bcrypt
- **File Uploads**: Multer for profile photos
- **Email**: Support for multiple email providers (SendGrid, Mailgun, Nodemailer)
- **Frontend**: Vanilla JavaScript with modern CSS
- **Admin Interface**: Custom admin dashboard

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn package manager

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/yesplease-app.git
cd yesplease-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

#### Option A: Automatic Setup (Recommended)
The application will automatically create the necessary database tables when you first run it.

#### Option B: Manual Setup
If you prefer to set up the database manually:

```bash
# Log into MySQL
mysql -u your_username -p

# Create database
CREATE DATABASE yesplease_app;

# Import the schema
mysql -u your_username -p yesplease_app < init-database.sql
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=yesplease_app

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Email Configuration (Optional - choose one)
# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# SMTP (Generic)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password

# Application Settings
PORT=3000
NODE_ENV=development
```

### 5. Start the Application

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Default Admin Account

After running the database initialization, you can log in to the admin panel with:

- **Username**: admin
- **Password**: admin123
- **Admin Panel**: `http://localhost:3000/admin/admin_login.html`

**⚠️ Important**: Change the admin password immediately after first login!

## Project Structure

```
YesPlease.app/
├── public/                 # Static frontend files
│   ├── admin/             # Admin panel interface
│   ├── assets/            # Images and static assets
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   └── pages/             # HTML pages
├── init-database.sql      # Database schema
├── database.js           # Database connection
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── .env                  # Environment variables (create this)
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user info

### Friends & Social
- `GET /api/friendships` - Get friend relationships
- `POST /api/friends/request` - Send friend request
- `PUT /api/friends/request/:id` - Accept/deny friend request
- `DELETE /api/friends/:id` - Remove friend

### Messages
- `GET /api/messages/:friendId` - Get conversation
- `POST /api/messages` - Send message

### Meetups
- `POST /api/meetups/request` - Request meetup
- `POST /api/meetups/confirm/:sessionId` - Confirm meetup with location
- `GET /api/meetups/status/:sessionId` - Check meetup status
- `POST /api/meetups/end/:sessionId` - End meetup session

### News Feed
- `GET /api/news-feed` - Get news posts
- `POST /api/news-posts/:id/like` - Like/unlike news post

## Development

### Running in Development Mode

```bash
# Install nodemon for auto-restart
npm install -g nodemon

# Run with auto-restart
nodemon server.js
```

### Database Migrations

The application automatically handles database schema updates. When you start the server, it will:

1. Check for missing columns and add them
2. Create any missing tables
3. Ensure proper indexes are in place

## Deployment

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

```env
NODE_ENV=production
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
DB_NAME=your-production-db-name
SESSION_SECRET=a-very-strong-random-string
```

### Security Considerations

1. **Change default admin password**
2. **Use strong session secrets**
3. **Set up HTTPS in production**
4. **Configure CORS appropriately**
5. **Set up rate limiting**
6. **Use environment variables for all secrets**

## Features in Detail

### Meetup System
- Users can request meetups with friends
- Both parties must accept an NDA agreement
- Location verification ensures users are within 10 feet
- Real-time status updates throughout the meetup process

### Admin Panel
- User management and moderation
- Friendship oversight
- Message monitoring
- Meetup session tracking
- System analytics and reporting
- News post management

### Security Features
- Password hashing with bcrypt
- Session-based authentication
- CSRF protection considerations
- Input validation and sanitization
- File upload restrictions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Contact the development team

## Roadmap

- [ ] Real-time notifications
- [ ] Mobile app development
- [ ] Enhanced location services
- [ ] Group meetups
- [ ] Event scheduling
- [ ] Advanced user profiles
- [ ] API rate limiting
- [ ] Email verification system
