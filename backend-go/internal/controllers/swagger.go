package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func SwaggerUI(c *gin.Context) {
	html := `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Watink API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
      });
    </script>
  </body>
</html>`

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

func SwaggerJSON(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"openapi": "3.0.3",
		"info": gin.H{
			"title":       "Watink Business API",
			"version":     "2.0.0",
			"description": "Documentação básica da API do backend Go (binário único).",
		},
		"servers": []gin.H{{
			"url": "/",
		}},
		"paths": gin.H{
			"/api/health": gin.H{
				"get": gin.H{
					"summary":     "Health check",
					"responses":   gin.H{"200": gin.H{"description": "OK"}},
					"security":    []gin.H{},
					"tags":        []string{"system"},
				},
			},
			"/api/public-settings": gin.H{
				"get": gin.H{
					"summary":   "Lista configurações públicas",
					"responses": gin.H{"200": gin.H{"description": "OK"}},
					"security":  []gin.H{},
					"tags":      []string{"settings"},
				},
			},
			"/api/auth/login": gin.H{
				"post": gin.H{
					"summary":   "Login",
					"responses": gin.H{"200": gin.H{"description": "OK"}},
					"security":  []gin.H{},
					"tags":      []string{"auth"},
				},
			},
			"/api/tickets": gin.H{
				"get": gin.H{
					"summary":   "Lista tickets",
					"responses": gin.H{"200": gin.H{"description": "OK"}, "401": gin.H{"description": "Unauthorized"}},
					"tags":      []string{"tickets"},
				},
			},
		},
		"components": gin.H{
			"securitySchemes": gin.H{
				"bearerAuth": gin.H{
					"type":         "http",
					"scheme":       "bearer",
					"bearerFormat": "JWT",
				},
			},
		},
		"security": []gin.H{{"bearerAuth": []string{}}},
	})
}
