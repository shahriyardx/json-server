FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock prisma.config.ts ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
RUN bun prisma generate
COPY . .
ENV SKIP_ENV_VALIDATION=true
RUN bun run build

FROM oven/bun:1 AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN bun add prisma@^7.8.0

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3000
CMD ["./entrypoint.sh"]
