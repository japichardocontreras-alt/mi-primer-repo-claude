# MUDANZAS METEPEC | ERP — imagen de producción.
# NOTA: este archivo no pudo construirse en el entorno de desarrollo (sin demonio de Docker).
# Pruébelo primero en un servidor de pruebas: ver docs/DESPLIEGUE.md, sección «Opción B: Docker».

# ---------- Dependencias y compilación ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---------- Ejecución ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 STORAGE_DIR=/data/storage
# pg_dump 16 para «Descargar respaldo» desde Configuración (repositorio oficial de PostgreSQL)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl gnupg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 \
 && apt-get purge -y gnupg && rm -rf /var/lib/apt/lists/*
RUN groupadd -r erp && useradd -r -g erp erp && mkdir -p /data/storage && chown -R erp:erp /data
COPY --from=builder --chown=erp:erp /app/.next/standalone ./
COPY --from=builder --chown=erp:erp /app/.next/static ./.next/static
COPY --from=builder --chown=erp:erp /app/public ./public
# El .env copiado por Next al compilar no debe viajar en la imagen: las variables se pasan al contenedor.
RUN rm -f .env
USER erp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
