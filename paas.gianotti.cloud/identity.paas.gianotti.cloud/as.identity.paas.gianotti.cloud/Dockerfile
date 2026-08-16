FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime

ENV NODE_ENV=production

RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app

WORKDIR /app
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json ./
COPY --chown=app:app src ./src

USER 10001

# No port: this is a worker. Liveness in Kubernetes uses an exec probe against
# the heartbeat file the worker touches each cycle.
CMD ["node", "src/worker.js"]