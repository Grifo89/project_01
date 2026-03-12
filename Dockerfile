# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies and common tools (bash, git)
RUN apk add --no-cache python3 make g++ gcc bash git

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
# Using npm install --loglevel=verbose to see any issues
RUN npm install

# Copy source code
COPY . .

# Expose port 3000 for Vite dev server
EXPOSE 3000

# Default command to run the dev server
CMD ["npm", "run", "dev"]
