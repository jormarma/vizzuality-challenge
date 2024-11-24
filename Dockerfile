# Use a lightweight base image
FROM node:23-alpine

# Set the working directory
WORKDIR /app

# Copy only the dependency files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the code
COPY tsconfig.json .env ./
COPY ./src ./src 

# Compiles all source code and removes typescript sources
RUN npx tsc && \
    rm -rf src package*.json tsconfig.json

# Expose port
EXPOSE 3000

# Start the app
CMD [ "node", "dist/app.js" ]
