# Use Node.js 20 with Debian Slim (includes glibc for onnxruntime-node compatibility)
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Exclude problematic directories
RUN rm -rf "Landing-Design" "Chatbot Design" "esfera 3d" || true

# Accept build arguments for NEXT_PUBLIC_* variables
# These MUST be passed during docker build for them to be available during Next.js build
# If not provided, they will be empty and runtime env vars will be used instead
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_BILLING_ENABLED=""
ARG NEXT_PUBLIC_WOMPI_PUBLIC_KEY=""
ARG NEXT_PUBLIC_WOMPI_BASE_URL=""

# Set as environment variables for the build process
# If ARG values are empty, ENV will be empty, but Next.js will use runtime env vars for Server Components
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_BILLING_ENABLED=$NEXT_PUBLIC_BILLING_ENABLED
ENV NEXT_PUBLIC_WOMPI_PUBLIC_KEY=$NEXT_PUBLIC_WOMPI_PUBLIC_KEY
ENV NEXT_PUBLIC_WOMPI_BASE_URL=$NEXT_PUBLIC_WOMPI_BASE_URL

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# NOTE: We do NOT set NEXT_PUBLIC_* ENV variables here in the runner stage.
# This allows Dockploy's runtime environment variables to be used directly.
# For Server Components and API routes, process.env will read from runtime env vars.
# IMPORTANT: Make sure Dockploy has these variables configured in Settings > Environment Variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_APP_URL
# - NEXT_PUBLIC_SITE_URL
# - NEXT_PUBLIC_BILLING_ENABLED
# - NEXT_PUBLIC_WOMPI_PUBLIC_KEY
# - NEXT_PUBLIC_WOMPI_BASE_URL

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]

