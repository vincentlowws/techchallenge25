# Use an official Node.js image as the base
FROM node:18 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the React app
RUN npm run build

# Use Nginx to serve the static frontend files
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Expose the port Nginx will run on
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]