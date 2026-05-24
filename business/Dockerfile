# ESTÁGIO 1: Builder
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Instala dependências necessárias para o build
RUN apk add --no-cache git

# Cache de dependências
COPY go.mod go.sum ./
RUN go mod download

# Copia o código fonte
COPY . .

# Compilação estática do binário Business
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o watink-business cmd/server/main.go

# ESTÁGIO 2: Imagem Final (Distroless para Segurança e Tamanho)
FROM gcr.io/distroless/static-debian12

WORKDIR /

# Copia o binário compilado
COPY --from=builder /app/watink-business /watink-business

# Expõe a porta do servidor Business
EXPOSE 8082

# Variáveis de ambiente padrão
ENV PORT_GO=8082 \
    GIN_MODE=release

# Executa o binário diretamente
ENTRYPOINT ["/watink-business"]
