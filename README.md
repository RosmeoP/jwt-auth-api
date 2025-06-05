# jwt-auth-api

A robust and extensible RESTful API for user authentication and authorization using JSON Web Tokens (JWT), built with JavaScript. This API is designed to serve as a secure authentication layer for web or mobile applications, providing endpoints for registration, login, protected resources, and token refreshing.

## Features

- User registration and login with secure password hashing
- JWT-based authentication (access & refresh tokens) for stateless session management
- Token refresh endpoint to maintain sessions securely
- Protected endpoints accessible only with valid tokens
- Easy integration with front-end applications
- Docker support for seamless deployment

## Technologies Used

- JavaScript (Node.js, Express)
- JWT (jsonwebtoken)
- bcryptjs for password hashing
- Docker for containerization
- MongoDB and Mongoose for data persistence

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

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

| Method | Endpoint             | Description                         | Auth Required |
|--------|----------------------|-------------------------------------|:------------:|
| POST   | `/register`          | Register a new user                 |      No      |
| POST   | `/login`             | Authenticate user, returns tokens   |      No      |
| POST   | `/refresh-token`     | Issue new access/refresh tokens     |      No*     |
| GET    | `/protected`         | Example protected route             |     Yes      |
| GET    | `/profile`           | Get user profile (protected)        |     Yes      |

> \* `/refresh-token` requires a valid refresh token in the request body.

### Example Usage

**Register:**
```http
POST /api/register
Content-Type: application/json

{
  "email": "youruser",
  "password": "yourpassword"
}
```

**Login:**
```http
POST /api/login
Content-Type: application/json

{
  "email": "youruser",
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
- `DB_URL` — Database connection string

## API Documentation

Interactive Swagger docs are available at [http://localhost:5000/api-docs](http://localhost:5000/api-docs) when running locally.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for improvements and fixes.

## License

This project is licensed under the MIT License.

---

Feel free to modify and expand this template according to the specifics of your jwt-auth-api! If you have more unique instructions or additional features, let me know and I can further tailor the README.
