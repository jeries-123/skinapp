# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
# RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run dev

# Expose the port the app runs on
EXPOSE 9112

# Start the Next.js application
CMD ["npm", "Run","start"]
