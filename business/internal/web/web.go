package web

import "embed"

//go:embed all:placeholder.txt
var StaticFiles embed.FS
