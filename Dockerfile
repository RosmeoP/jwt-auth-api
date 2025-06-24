## Dockerfile for a Node.js application using pnpm
FROM node:18-slim

# Set the working directory
WORKDIR /app


COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application code
COPY . .

#port for the application
EXPOSE 3000

# Build the application
CMD ["pnpm", "start"]

