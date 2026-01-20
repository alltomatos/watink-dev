package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/watink/plugin-manager/internal/config"
)

type contextKey string

const TenantIDKey contextKey = "tenantId"

func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for OPTIONS requests (CORS preflight)
			if r.Method == "OPTIONS" {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				log.Printf("[Auth] Missing Authorization header for %s %s", r.Method, r.URL.Path)
				http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				log.Printf("[Auth] Invalid Authorization header format for %s %s", r.Method, r.URL.Path)
				http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]
			log.Printf("[Auth] Token received (first 20 chars): %s...", tokenString[:min(20, len(tokenString))])

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					log.Printf("[Auth] Invalid signing method: %v", token.Header["alg"])
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil {
				log.Printf("[Auth] JWT parse error: %v", err)
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			if !token.Valid {
				log.Printf("[Auth] Token not valid")
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				log.Printf("[Auth] Claims: %+v", claims)
				if tenantId, ok := claims["tenantId"]; ok {
					// Add tenantId to context
					ctx := context.WithValue(r.Context(), TenantIDKey, tenantId)
					log.Printf("[Auth] Success! TenantId: %v", tenantId)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				log.Printf("[Auth] No tenantId in claims")
			}

			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		})
	}
}

func CORSMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			frontendURL := strings.TrimRight(cfg.FrontendURL, "/")

			// Build allowed origins list
			allowedOrigins := []string{
				frontendURL,
				strings.Replace(frontendURL, "http://", "https://", 1),
				strings.Replace(frontendURL, "https://", "http://", 1),
				"http://localhost:3000",
				"http://app.localhost",
			}

			allowed := false
			if origin == "" {
				allowed = true
			} else {
				for _, o := range allowedOrigins {
					if origin == o {
						allowed = true
						break
					}
				}
			}

			if allowed {
				if origin != "" {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
			} else {
				log.Printf("[CORS] Blocked origin: %s", origin)
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control, Pragma, x-tenant-id, x-user-profile")

			if r.Method == "OPTIONS" {
				if !allowed {
					w.WriteHeader(http.StatusForbidden)
					return
				}
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
