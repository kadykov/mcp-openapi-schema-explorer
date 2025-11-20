# Stage 1: Builder
FROM node:lts-alpine AS builder

WORKDIR /app

# Copy necessary files for installation and build
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY src ./src

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Build the project
RUN npm run build

# Stage 2: Release
FROM node:lts-alpine AS release

WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/dist ./dist

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Set the entrypoint to run the compiled server
# Corrected path based on tsconfig.json ("rootDir": ".", "outDir": "dist")
ENTRYPOINT ["node", "dist/src/index.js"]
