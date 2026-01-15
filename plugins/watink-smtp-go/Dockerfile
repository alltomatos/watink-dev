FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o /plugin-smtp main.go

FROM alpine:latest

WORKDIR /
COPY --from=builder /plugin-smtp /plugin-smtp

ENTRYPOINT ["/plugin-smtp"]
