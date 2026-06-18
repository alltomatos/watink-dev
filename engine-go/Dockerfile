# Stage 1: Builder
FROM golang:1.25-alpine AS builder

ENV GOTOOLCHAIN=auto

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o watink-engine cmd/engine/main.go

# Stage 2: minimal runtime
FROM gcr.io/distroless/static-debian12

WORKDIR /

COPY --from=builder /app/watink-engine /watink-engine

ENTRYPOINT ["/watink-engine"]
