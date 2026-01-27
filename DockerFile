# Use a lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React frontend
RUN npm run build

# Expose the internal port (Standard Express port)
EXPOSE 3000

# Create the data directory volume mount point
VOLUME ["/app/data"]

# Start command: Run install (to ensure DB/Auth exists) then start server
CMD ["sh", "-c", "node install.js && node server.js"]
