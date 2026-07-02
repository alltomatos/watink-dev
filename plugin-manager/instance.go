package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"time"
)

// getInstanceID retorna o instanceId (fingerprint) desta instalação do
// plugin-manager, no formato "INST-{unix-timestamp}-{hash-curto}".
//
// A geração é idempotente: se o arquivo InstanceFile já existir, o valor
// persistido é lido e retornado; caso contrário um novo instanceId é gerado
// (uma única vez) e persistido em disco para os próximos boots.
func getInstanceID() (string, error) {
	if data, err := os.ReadFile(InstanceFile); err == nil {
		return string(data), nil
	}

	newID, err := generateInstanceID()
	if err != nil {
		return "", err
	}

	if err := os.WriteFile(InstanceFile, []byte(newID), 0644); err != nil {
		return "", err
	}

	return newID, nil
}

// generateInstanceID cria um novo instanceId no padrão "INST-{ts}-{hash}",
// mesmo esquema de fingerprint usado pelo watink-saas (ADR 0006 daquele
// repo), mas com prefixo "INST" para o plugin-manager.
func generateInstanceID() (string, error) {
	hashBytes := make([]byte, 6)
	if _, err := rand.Read(hashBytes); err != nil {
		return "", fmt.Errorf("failed to generate random hash for instanceId: %w", err)
	}
	return fmt.Sprintf("INST-%d-%s", time.Now().Unix(), hex.EncodeToString(hashBytes)), nil
}
