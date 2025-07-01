@echo off
echo.
echo 🚀 YesPlease.app GitHub Setup
echo ==============================
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed. Please install Git first.
    echo    Download from: https://git-scm.com/downloads
    pause
    exit /b 1
)

echo ✅ Git is installed

REM Check if we're already in a git repository
if exist ".git" (
    echo ⚠️  This directory is already a Git repository.
    echo    If you want to start fresh, delete the .git folder first
    echo.
    set /p continue="Do you want to continue with the existing repository? (y/n): "
    if /i not "%continue%"=="y" (
        echo ❌ Aborted.
        pause
        exit /b 1
    )
) else (
    echo 📁 Initializing Git repository...
    git init
)

REM Check if .env file exists and warn about it
if exist ".env" (
    echo.
    echo ⚠️  WARNING: .env file detected!
    echo    Make sure your .env file is listed in .gitignore
    echo    This file contains sensitive information and should NOT be uploaded to GitHub
    echo.
)

REM Add files to git
echo 📝 Adding files to Git...
git add .

REM Show git status
echo.
echo 📋 Git Status:
git status --short

echo.
echo 💡 Next steps:
echo 1. Create a repository on GitHub:
echo    - Go to https://github.com/new
echo    - Repository name: yesplease-app (or your preferred name)
echo    - Make it public or private as needed
echo    - DO NOT initialize with README (we already have one)
echo.
echo 2. After creating the repository, run these commands:
echo.
echo    # Commit your files
echo    git commit -m "Initial commit: YesPlease.app setup"
echo.
echo    # Add your GitHub repository as remote
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
echo.
echo    # Push to GitHub
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual values
echo.

REM Offer to commit automatically
set /p commitnow="Would you like to create the initial commit now? (y/n): "
if /i "%commitnow%"=="y" (
    echo 📝 Creating initial commit...
    git commit -m "Initial commit: YesPlease.app setup - Complete social meetup platform - User authentication and profiles - Friend management system - Real-time messaging - Proximity-based meetup system - Admin panel with comprehensive management - Database initialization scripts - Deployment documentation"
    
    echo ✅ Initial commit created!
    echo.
    echo 🔗 Now add your GitHub remote and push:
    echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    echo    git push -u origin main
) else (
    echo 📝 Skipped commit. You can commit later with:
    echo    git commit -m "Your commit message"
)

echo.
echo 📋 Repository Information:
echo ├── 📄 README.md - Project documentation
echo ├── 🔧 .env.example - Environment variables template  
echo ├── 🗄️ init-database.sql - Database schema
echo ├── ⚙️ setup-database.js - Automatic database setup
echo ├── 🚀 DEPLOYMENT.md - Deployment guide
echo ├── 📦 package.json - Dependencies and scripts
echo └── 🙈 .gitignore - Files to ignore
echo.
echo 🎉 Your project is ready for GitHub!
echo.
echo 📚 After uploading to GitHub:
echo - Update the repository URL in package.json
echo - Update the clone URL in README.md  
echo - Consider setting up GitHub Pages for documentation
echo - Set up GitHub Actions for CI/CD if needed
echo.
pause
