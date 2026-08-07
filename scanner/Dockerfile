FROM node:24-trixie-slim@sha256:366fdef91728b1b7fa18c84fba63b6e79ed77b7e10cc206878e9705da4d7b169

ARG VCS_REF=unknown
ARG CLAMAV_VERSION=1.5.3
LABEL org.opencontainers.image.title="Debrief malware scanner" \
  org.opencontainers.image.source="https://github.com/alpineobserver-cmd/veteran-claims-companion" \
  org.opencontainers.image.revision=$VCS_REF

# Cisco's release package is statically linked, so it avoids the lagging Debian
# ClamAV package while retaining a checksum-pinned, reproducible installation.
RUN node -e 'fetch(process.argv[1]).then(response=>{if(!response.ok)throw new Error(`download failed: ${response.status}`);return response.arrayBuffer()}).then(bytes=>require("node:fs").writeFileSync("/tmp/clamav.deb",Buffer.from(bytes)))' \
      "https://github.com/Cisco-Talos/clamav/releases/download/clamav-${CLAMAV_VERSION}/clamav-${CLAMAV_VERSION}.linux.x86_64.deb" \
  && echo "0c69e033a976855cfecfa1b6c36563822f2cc618f0c7e40ce5bcc2703d0dc436  /tmp/clamav.deb" | sha256sum --check --strict \
  && apt-get update \
  && apt-get upgrade -y \
  && apt-get install --no-install-recommends -y ca-certificates /tmp/clamav.deb \
  && test "$(clamscan --version | cut -d/ -f1)" = "ClamAV ${CLAMAV_VERSION}" \
  && rm -f /tmp/clamav.deb \
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
