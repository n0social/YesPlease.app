# Deployment Guide for YesPlease.app

This guide covers different deployment options for YesPlease.app.

## Table of Contents
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- Git

### Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/yesplease-app.git
   cd yesplease-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your database credentials
   nano .env  # or use your preferred editor
   ```

4. **Set up the database**
   ```bash
   # Option A: Automatic setup (recommended)
   npm run setup-db
   
   # Option B: Manual setup
   mysql -u root -p
   CREATE DATABASE yesplease_app;
   exit
   npm run init-db
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Main app: http://localhost:3000
   - Admin panel: http://localhost:3000/admin/admin_login.html
   - Default admin: `admin` / `admin123`

## Production Deployment

### 1. VPS/Dedicated Server Deployment

#### Server Requirements
- Ubuntu 20.04+ or CentOS 8+
- Node.js 16+
- MySQL 8.0+
- Nginx (recommended)
- SSL certificate

#### Setup Steps

1. **Prepare the server**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install MySQL
   sudo apt install mysql-server -y
   sudo mysql_secure_installation
   
   # Install Nginx
   sudo apt install nginx -y
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy the application**
   ```bash
   # Clone your repository
   cd /var/www
   sudo git clone https://github.com/yourusername/yesplease-app.git
   cd yesplease-app
   
   # Install dependencies
   sudo npm install --production
   
   # Set up environment variables
   sudo cp .env.example .env
   sudo nano .env  # Configure for production
   
   # Set up database
   sudo npm run setup-db
   
   # Start with PM2
   sudo pm2 start server.js --name "yesplease-app"
   sudo pm2 startup
   sudo pm2 save
   ```

3. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/yesplease-app
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   # Enable the site
   sudo ln -s /etc/nginx/sites-available/yesplease-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

### 2. Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install --production
   
   COPY . .
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DB_HOST=db
         - DB_USER=root
         - DB_PASSWORD=your_password
         - DB_NAME=yesplease_app
         - SESSION_SECRET=your_session_secret
       depends_on:
         - db
   
     db:
       image: mysql:8.0
       environment:
         - MYSQL_ROOT_PASSWORD=your_password
         - MYSQL_DATABASE=yesplease_app
       volumes:
         - mysql_data:/var/lib/mysql
         - ./init-database.sql:/docker-entrypoint-initdb.d/init.sql
       ports:
         - "3306:3306"
   
   volumes:
     mysql_data:
   ```

3. **Deploy with Docker**
   ```bash
   docker-compose up -d
   ```

### 3. Cloud Platform Deployment

#### Heroku
1. Install Heroku CLI
2. Create a new Heroku app
3. Add ClearDB MySQL add-on
4. Set environment variables
5. Deploy

#### AWS/GCP/Azure
- Use their respective app hosting services
- Set up managed database services
- Configure environment variables
- Deploy using their deployment tools

## Database Setup

### Production Database Considerations

1. **Security**
   - Use strong passwords
   - Limit database user privileges
   - Enable SSL connections
   - Regular backups

2. **Performance**
   - Optimize MySQL configuration
   - Set up connection pooling
   - Monitor query performance
   - Regular maintenance

3. **Backup Strategy**
   ```bash
   # Daily backup script
   #!/bin/bash
   mysqldump -u root -p yesplease_app > backup_$(date +%Y%m%d).sql
   ```

## Environment Variables

### Required Variables
```env
# Database
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=yesplease_app

# Security
SESSION_SECRET=your_very_long_random_string
NODE_ENV=production
```

### Optional Variables
```env
# Email service (choose one)
SENDGRID_API_KEY=your_sendgrid_key
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_mailgun_domain

# Application
PORT=3000
MAX_FILE_SIZE=5242880
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check database credentials
   - Verify MySQL is running
   - Check network connectivity
   - Verify database exists

2. **Port Already in Use**
   ```bash
   # Find what's using the port
   lsof -i :3000
   
   # Kill the process
   kill -9 PID
   ```

3. **Permission Errors**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER /path/to/app
   sudo chmod -R 755 /path/to/app
   ```

4. **Memory Issues**
   - Increase server memory
   - Optimize MySQL configuration
   - Monitor application memory usage

### Logs

```bash
# PM2 logs
pm2 logs yesplease-app

# System logs
sudo journalctl -u nginx
sudo tail -f /var/log/mysql/error.log
```

### Performance Monitoring

```bash
# Monitor server resources
htop
iotop
mysqladmin processlist

# Application monitoring
pm2 monit
```

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong session secrets
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Regular security updates
- [ ] Database security hardening
- [ ] File upload restrictions
- [ ] Input validation
- [ ] Regular backups

## Maintenance

### Regular Tasks
- Update dependencies
- Monitor logs
- Database maintenance
- Security updates
- Performance monitoring
- Backup verification

### Scaling Considerations
- Load balancing
- Database replication
- CDN for static assets
- Caching strategies
- Session store optimization
