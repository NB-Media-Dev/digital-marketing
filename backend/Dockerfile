# MarkOps API — Express + Prisma
# Works on Render, Railway, Fly.io, or any Docker host.
FROM node:20-slim

# Prisma needs OpenSSL at runtime.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps (dev deps are needed to build; NODE_ENV is NOT set yet here,
# so npm ci installs devDependencies too — including typescript).
COPY package*.json ./
RUN npm ci

# Build: prisma generate + tsc → dist/
COPY . .
RUN npm run build

# Uploaded files live here (use object storage in real production — see docs).
RUN mkdir -p uploads

# Switch to production mode only now that the build is done.
ENV NODE_ENV=production

EXPOSE 5000
# Apply schema then start. For migration history use `prisma migrate deploy` instead of db push.
CMD ["sh", "-c", "npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate; node dist/server.js"]