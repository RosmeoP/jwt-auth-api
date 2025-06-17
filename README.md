
# jwt-auth-api

A robust and extensible RESTful API for user authentication and authorization using JSON Web Tokens (JWT) and MongoDB, built with JavaScript. This API is designed to serve as a secure authentication layer for modern web and mobile applications, supporting both classic email/password login and Google OAuth. It also features email verification for new accounts.

## Features

- User registration and login with secure password hashing
- JWT-based authentication (access & refresh tokens) for stateless session management
- Token refresh endpoint to maintain sessions securely
- Google OAuth login for seamless third-party authentication
- Email verification for new user accounts
- Protected endpoints accessible only with valid tokens
- User profile endpoint
- Easy integration with front-end applications
- Docker support for seamless deployment

## Technologies Used

- JavaScript (Node.js, Express)
- JWT (jsonwebtoken)
- bcryptjs for password hashing
- MongoDB and Mongoose for data persistence
- Google OAuth (passport-google-oauth20)
- Nodemailer for email verification
- Docker for containerization

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)
- Google Cloud OAuth credentials (for Google auth features)
- SMTP credentials (for email verification)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RosmeoP/jwt-auth-api.git
   cd jwt-auth-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**  
   Create a `.env` file in the root directory and configure the following:
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret
   REFRESH_TOKEN_SECRET=your_refresh_secret
   DB_URL=your_database_url
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=your_google_callback_url
   SMTP_HOST=your_smtp_host
   SMTP_PORT=your_smtp_port
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_pass
   EMAIL_FROM=your_email_address
   ```

### Running Locally

```bash
npm start
# or
yarn start
```

The API will be available at `http://localhost:5000` by default.

### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t jwt-auth-api .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 --env-file .env jwt-auth-api
   ```

## API Endpoints

| Method | Endpoint                 | Description                                 | Auth Required |
|--------|--------------------------|---------------------------------------------|:------------:|
| POST   | `/register`              | Register a new user (email verification)    |      No      |
| POST   | `/login`                 | Authenticate user, returns tokens           |      No      |
| POST   | `/refresh-token`         | Issue new access/refresh tokens             |      No*     |
| GET    | `/protected`             | Example protected route                     |     Yes      |
| GET    | `/profile`               | Get user profile (protected)                |     Yes      |
| GET    | `/auth/google`           | Start Google OAuth flow                     |      No      |
| GET    | `/auth/google/callback`  | Google OAuth callback URL                   |      No      |
| GET    | `/verify-email/:token`   | Verify user email                           |      No      |

> \* `/refresh-token` requires a valid refresh token in the request body.

### Example Usage

**Register:**
```http
POST /api/register
Content-Type: application/json

{
  "email": "youruser@example.com",
  "password": "yourpassword"
}
```
> You will receive a verification email.

**Verify Email:**  
Click the verification link sent to your email.

**Login:**
```http
POST /api/login
Content-Type: application/json

{
  "email": "youruser@example.com",
  "password": "yourpassword"
}
```
Response:
```json
{
  "accessToken": "<jwt_access_token>",
  "refreshToken": "<jwt_refresh_token>"
}
```

**Google OAuth Login:**  
Visit `/api/auth/google` to start the flow.

**Refresh Token:**
```http
POST /api/refresh-token
Content-Type: application/json

{
  "refreshToken": "<your_refresh_token>"
}
```
Response:
```json
{
  "accessToken": "<new_access_token>",
  "refreshToken": "<new_refresh_token>"
}
```

**Access Protected Route:**
```http
GET /api/protected
Authorization: Bearer <your_access_token>
```

**Get Profile:**
```http
GET /api/profile
Authorization: Bearer <your_access_token>
```

## Environment Variables

- `PORT` — Port number the server will run on (default: 5000)
- `JWT_SECRET` — Secret key for signing access JWTs
- `REFRESH_TOKEN_SECRET` — Secret key for signing refresh tokens
- `DB_URL` — MongoDB connection string
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `GOOGLE_CALLBACK_URL` — Google OAuth callback URL
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` — Required for email verification

## API Documentation

Interactive Swagger docs are available at [http://localhost:5000/api-docs](http://localhost:5000/api-docs) when running locally.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for improvements and fixes.

## License

This project is licensed under the MIT License.





