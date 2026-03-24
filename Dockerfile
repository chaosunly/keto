# Stage 1: Concatenate namespace files into a single bundle.
#
# Keto's OPL engine cannot resolve cross-file imports, and it also requires
# class declarations (not transpiled class expressions). esbuild is therefore
# not suitable here — it both strips TypeScript types (which carry Keto's
# relation schema) and converts `class Foo {}` to `var Foo = class {}`.
#
# Instead, build-namespaces.mjs inlines every file in dependency order,
# removing only import/export statements while leaving all type annotations
# intact.  No npm packages are needed — pure Node.js built-ins only.
FROM node:22-alpine AS builder
WORKDIR /build
COPY namespaces/ ./namespaces/
COPY build-namespaces.mjs .
RUN node build-namespaces.mjs

# Stage 2: Final Keto image — only the bundle is needed.
FROM oryd/keto:v25.4.0
COPY keto.yml /etc/keto/keto.yml
COPY --from=builder /build/bundle.ts /etc/keto/namespaces.ts
COPY --chmod=755 entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
