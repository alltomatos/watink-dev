package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

// Structures for JSON responses
type Plugin struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Version     string  `json:"version"`
	Type        string  `json:"type"`     // free, premium
	Category    string  `json:"category"` // utility, channel, etc
	Price       float64 `json:"price"`
}

type CatalogResponse struct {
	Offline bool     `json:"offline"`
	Plugins []Plugin `json:"plugins"`
}

type InstalledResponse struct {
	Active []string `json:"active"`
}

type VersionResponse struct {
	Service     string `json:"service"`
	Version     string `json:"version"`
	LastUpdated string `json:"lastUpdated"`
}

type LicenseCheckRequest struct {
	InstanceUuid string `json:"instanceUuid"`
}

// Global Config
var (
	SupabaseURL    = os.Getenv("SUPABASE_URL")
	SupabaseAnonKey = os.Getenv("SUPABASE_ANON_KEY")
	InstanceFile   = ".instance_id"
)

func getInstanceID() string {
	// 1. Try to read existing ID
	data, err := ioutil.ReadFile(InstanceFile)
	if err == nil {
		return string(data)
	}

	// 2. Generate new if not exists (Simple UUID-like string)
	newID := fmt.Sprintf("%d-%x", time.Now().UnixNano(), time.Now().UnixNano())
	_ = ioutil.WriteFile(InstanceFile, []byte(newID), 0644)
	return newID
}

func getActivePluginsFromSupabase(instanceID string) ([]string, error) {
	if SupabaseURL == "" {
		return []string{}, fmt.Errorf("SUPABASE_URL not set")
	}

	url := fmt.Sprintf("%s/functions/v1/validate-license", SupabaseURL)
	
	reqBody, _ := json.Marshal(LicenseCheckRequest{InstanceUuid: instanceID})
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return []string{}, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+SupabaseAnonKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return []string{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []string{}, fmt.Errorf("supabase returned status: %d", resp.StatusCode)
	}

	var result InstalledResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return []string{}, err
	}

	return result.Active, nil
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	instanceID := getInstanceID()
	log.Printf("Instance ID: %s", instanceID)

	r := mux.NewRouter()

	// Health Check
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Version Endpoint
	r.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		currentVersion := "1.1.0" // Updated for Marketplace Alpha
		data, err := os.ReadFile("VERSION")
		if err == nil {
			currentVersion = string(data)
		}

		resp := VersionResponse{
			Service:     "plugin-manager",
			Version:     currentVersion,
			LastUpdated: time.Now().Format(time.RFC3339),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}).Methods("GET")

	// API V1 Routes
	api := r.PathPrefix("/api/v1/plugins").Subrouter()

	// Catalog Handler (Still returning fixed catalog, but can be dynamic later)
	api.HandleFunc("/catalog", func(w http.ResponseWriter, r *http.Request) {
		catalog := CatalogResponse{
			Offline: false,
			Plugins: []Plugin{
				{ID: "1", Slug: "plugin-smtp", Name: "SMTP Plugin", Description: "Envio de e-mails via RabbitMQ", Version: "1.0.0", Type: "premium", Category: "utility", Price: 49.99},
				{ID: "2", Slug: "clientes", Name: "Gestão de Clientes", Description: "CRM Básico", Version: "1.2.0", Type: "premium", Category: "crm", Price: 49.99},
				{ID: "3", Slug: "helpdesk", Name: "Helpdesk Pro", Description: "Tickets e Atendimento", Version: "2.0.0", Type: "premium", Category: "support", Price: 49.99},
				{ID: "4", Slug: "webchat", Name: "Webchat Widget", Description: "Chat em tempo real no site", Version: "1.0.0", Type: "premium", Category: "channel", Price: 49.99},
				{ID: "5", Slug: "whatsmeow", Name: "Engine WhatsMeow (Go)", Description: "Motor ultra rápido em Go", Version: "1.0.0", Type: "premium", Category: "engine", Price: 99.99},
				{ID: "6", Slug: "papi", Name: "Engine PAPI", Description: "Integração via Cloud API", Version: "1.0.0", Type: "premium", Category: "engine", Price: 99.99},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(catalog)
	}).Methods("GET")

	// Installed Handler (REAL VALIDATION)
	api.HandleFunc("/installed", func(w http.ResponseWriter, r *http.Request) {
		active, err := getActivePluginsFromSupabase(instanceID)
		if err != nil {
			log.Printf("Error fetching licenses: %v", err)
			// Fallback to empty if remote fails
			active = []string{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(InstalledResponse{Active: active})
	}).Methods("GET")

	// Instance Info Helper (to show the user their ID for licensing)
	api.HandleFunc("/instance", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"instanceId": instanceID})
	}).Methods("GET")

	log.Printf("Plugin Manager (Marketplace Enabled) running on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
