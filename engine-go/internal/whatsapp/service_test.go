package whatsapp

import (
	"os"
	"testing"
)

func TestBuildPostgresDSN_UsesEnvVars(t *testing.T) {
	os.Setenv("DB_USER", "pguser")
	os.Setenv("DB_PASS", "pgpass")
	os.Setenv("DB_HOST", "dbhost")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("DB_NAME", "mydb")
	t.Cleanup(func() {
		for _, k := range []string{"DB_USER", "DB_PASS", "DB_HOST", "DB_PORT", "DB_NAME"} {
			os.Unsetenv(k)
		}
	})

	dsn := BuildPostgresDSN()
	expected := "postgres://pguser:pgpass@dbhost:5432/mydb?sslmode=disable"
	if dsn != expected {
		t.Fatalf("expected %q, got %q", expected, dsn)
	}
}

func TestEventPayloadWithTenant_AddsTenantID(t *testing.T) {
	payload := map[string]interface{}{"key": "value"}
	result := eventPayloadWithTenant("tenant-abc", payload)

	if result["tenantId"] != "tenant-abc" {
		t.Fatalf("expected tenantId=tenant-abc, got %v", result["tenantId"])
	}
	if result["key"] != "value" {
		t.Fatalf("expected key=value preserved, got %v", result["key"])
	}
}

func TestEventPayloadWithTenant_DoesNotMutateOriginal(t *testing.T) {
	original := map[string]interface{}{"foo": "bar"}
	_ = eventPayloadWithTenant("t1", original)
	if _, ok := original["tenantId"]; ok {
		t.Fatal("eventPayloadWithTenant must not mutate the original map")
	}
}

func TestEventPayloadWithTenant_OverwritesTenantID(t *testing.T) {
	payload := map[string]interface{}{"tenantId": "old"}
	result := eventPayloadWithTenant("new-tenant", payload)
	if result["tenantId"] != "new-tenant" {
		t.Fatalf("expected tenantId overwritten to new-tenant, got %v", result["tenantId"])
	}
}
