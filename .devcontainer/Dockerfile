FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y \
       protobuf-compiler \
       pre-commit \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
