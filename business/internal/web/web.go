package web

import "embed"

//go:embed all:build/*
var StaticFiles embed.FS
