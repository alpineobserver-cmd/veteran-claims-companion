FROM node:22-bookworm-slim@sha256:f32b81066cde10a75dbac96646099533316d94bac4150c55da1636e1f0ffdc46

ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="Debrief malware scanner" \
  org.opencontainers.image.source="https://github.com/alpineobserver-cmd/veteran-claims-companion" \
  org.opencontainers.image.revision=$VCS_REF

RUN apt-get update \
  && apt-get install --no-install-recommends -y ca-certificates clamav clamav-freshclam \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global npm@11.19.0 \
  && npm cache clean --force \
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
