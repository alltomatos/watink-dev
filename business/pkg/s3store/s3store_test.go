package s3store

import "testing"

func TestConfigFromEnv_Defaults(t *testing.T) {
	t.Setenv("S3_ENDPOINT", "minio:9000")
	t.Setenv("S3_ACCESS_KEY", "ak")
	t.Setenv("S3_SECRET_KEY", "sk")
	t.Setenv("S3_BUCKET", "")
	t.Setenv("S3_REGION", "")
	t.Setenv("S3_USE_SSL", "")

	cfg, ok := ConfigFromEnv()
	if !ok {
		t.Fatal("expected ok=true when S3_ENDPOINT is set")
	}
	if cfg.Endpoint != "minio:9000" {
		t.Errorf("endpoint = %q", cfg.Endpoint)
	}
	if cfg.Bucket != "watink-knowledge" {
		t.Errorf("bucket default = %q, want watink-knowledge", cfg.Bucket)
	}
	if cfg.Region != "us-east-1" {
		t.Errorf("region default = %q, want us-east-1", cfg.Region)
	}
	if cfg.UseSSL {
		t.Error("UseSSL should default to false")
	}
	if cfg.AccessKey != "ak" || cfg.SecretKey != "sk" {
		t.Errorf("creds = %q/%q", cfg.AccessKey, cfg.SecretKey)
	}
}

func TestConfigFromEnv_NoEndpoint(t *testing.T) {
	t.Setenv("S3_ENDPOINT", "")
	if _, ok := ConfigFromEnv(); ok {
		t.Fatal("expected ok=false when S3_ENDPOINT is empty")
	}
}
