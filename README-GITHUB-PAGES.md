# GitHub Pages Setup

This repository is configured to show the **login page** as the main entry point on GitHub Pages.

## Live Site
Visit: https://n0social.github.io/YesPlease.app

## Important Notes
- The `index.html` in the root is a copy of `public/pages/login.html` with adjusted paths for GitHub Pages
- This is a **static preview only** - backend features (authentication, database, email) won't work on GitHub Pages
- For full functionality, the complete Node.js application needs to be deployed to a service like Heroku, Vercel, or Railway

## File Structure
- `index.html` - Main login page for GitHub Pages
- `public/` - All frontend assets (CSS, JS, images, other pages)
- `server.js` - Node.js backend (not used in GitHub Pages)
- `database.js` - Database configuration (not used in GitHub Pages)
