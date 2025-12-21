FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o engine-go ./cmd/engine

FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/engine-go .

CMD ["./engine-go"]
