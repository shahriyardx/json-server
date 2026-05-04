FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock prisma.config.ts ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
RUN bun prisma generate
RUN bun prisma migrate deploy
COPY . .
RUN bun run build

FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
