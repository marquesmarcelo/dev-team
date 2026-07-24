# Dockerfile de produção — backend Go + Gin
# Build multi-stage: imagem final sem toolchain Go, só o binário compilado.

FROM golang:1.23-alpine AS builder
WORKDIR /app
# Copiar go.mod e go.sum primeiro para aproveitar cache de layer quando
# só o código mudar (sem alteração de dependências).
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/api

FROM alpine:3.20 AS runner
WORKDIR /app
# Certificados TLS para chamadas HTTPS externas (ex: API da Anthropic)
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /server .
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3001/healthz || exit 1
CMD ["./server"]
