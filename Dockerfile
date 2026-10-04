# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# adapter-node leaves runtime dependencies (minio) external, so they must be installed
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["node", "build"]
