# Use an official Node.js image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the React app
RUN npm run build

# Install a static file server (e.g., serve)
RUN npm install -g serve

# Expose the port the app will run on
EXPOSE 80

# Start the static file server
CMD ["serve", "-s", "build", "-l", "80"]