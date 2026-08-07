FROM node:24-trixie-slim@sha256:366fdef91728b1b7fa18c84fba63b6e79ed77b7e10cc206878e9705da4d7b169

ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="Debrief malware scanner" \
  org.opencontainers.image.source="https://github.com/alpineobserver-cmd/veteran-claims-companion" \
  org.opencontainers.image.revision=$VCS_REF

RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get install --no-install-recommends -y ca-certificates clamav clamav-freshclam \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /tmp/clamav-definitions /tmp/debrief-scan \
  && chown -R node:node /tmp/clamav-definitions /tmp/debrief-scan

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx
COPY index.mjs ./index.mjs

USER node
ENV NODE_ENV=production
ENV PORT=8080
CMD ["node","index.mjs"]
