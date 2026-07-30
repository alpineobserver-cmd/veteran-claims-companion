FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install --no-install-recommends -y ca-certificates clamav clamav-freshclam \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /tmp/clamav-definitions /tmp/debrief-scan \
  && chown -R node:node /tmp/clamav-definitions /tmp/debrief-scan

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY index.mjs ./index.mjs

USER node
ENV NODE_ENV=production
ENV PORT=8080
CMD ["node","index.mjs"]
