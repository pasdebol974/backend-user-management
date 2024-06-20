# backend-user-management
Backend API
# Description
This project is a backend for user management, including registration, login, updating emails and passwords, and email verification. It uses Node.js, Express, MongoDB, and JWT for authentication.

# Prerequisites
Node.js
MongoDB
# Installation
Clone the repository: https://github.com/pasdebol974/backend-user-management.git

# Install dependencies: npm install

#Create a .env file at the root of the project and add the environment variables:
- EMAIL_USER=your_email@gmail.com
- EMAIL_PASS=your_password
- JWT_ACCESS_TOKEN_SECRET=your_secret_key
- JWT_REFRESH_TOKEN_SECRET=your_other_secret_key
- MONGO_URI=your_mongodb_uri
- Usage
- Start the server: npm start

# The server will be accessible at http://localhost:5000.

# Tests
To run the tests, use the following command: npm test

# Routes
- POST /user/register: Register a new user.
- POST /user/login: Login an existing user.
- POST /user/logout: Logout the user.
- POST /user/refresh-token: Refresh the JWT token.
- GET /user/verify-email: Verify the email.
- POST /user/request-email-update: Request email update.
- GET /user/confirm-email-update: Confirm email update.
- POST /user/request-password-update: Request password update.
- GET /user/confirm-password-update: Confirm password update.
- PUT /user/: Update user information.
- DELETE /user/: Delete the user.

# Project Structure
├── config/
│ ├── db.js
│ ├── mailer.js
├── controllers/
│ ├── user.controller.js
├── models/
│ ├── user.model.js
├── routes/
│ ├── user.routes.js
├── tests/
│ ├── hashPassword.test.js
│ ├── userRoutes.test.js
│ ├── setup.js
├── .env
├── .gitignore
├── package.json
├── server.js
