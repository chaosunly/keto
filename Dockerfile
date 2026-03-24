# Stage 1: Bundle all namespace TypeScript files into a single file.
# Keto's embedded TS engine cannot resolve cross-file imports, so we use
# esbuild to flatten index.ts and all its imports into one self-contained file.
FROM node:20-alpine AS builder
WORKDIR /build
RUN npm install @ory/keto-namespace-types esbuild
COPY namespaces/ .
RUN npx esbuild index.ts \
    --bundle \
    --format=esm \
    --outfile=bundle.ts

# Stage 2: Final Keto image — only the bundle is needed.
FROM oryd/keto:v25.4.0
COPY keto.yml /etc/keto/keto.yml
COPY --from=builder /build/bundle.ts /etc/keto/namespaces.ts
COPY --chmod=755 entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
