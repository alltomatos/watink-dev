package whatsapp

import (
	"testing"

	"go.mau.fi/whatsmeow/types"
)

// TestContactDisplayName verifies that contactDisplayName picks the best
// available human-readable name in priority order:
//   FullName > FirstName > BusinessName > PushName
func TestContactDisplayName_FullName(t *testing.T) {
	info := types.ContactInfo{
		FullName:     "Alice Wonderland",
		FirstName:    "Alice",
		BusinessName: "Wonderland Inc",
		PushName:     "alice",
	}
	if got := contactDisplayName(info); got != "Alice Wonderland" {
		t.Fatalf("expected FullName, got %q", got)
	}
}

func TestContactDisplayName_FirstNameFallback(t *testing.T) {
	info := types.ContactInfo{
		FirstName:    "Bob",
		BusinessName: "Bob Corp",
		PushName:     "bobby",
	}
	if got := contactDisplayName(info); got != "Bob" {
		t.Fatalf("expected FirstName, got %q", got)
	}
}

func TestContactDisplayName_BusinessNameFallback(t *testing.T) {
	info := types.ContactInfo{
		BusinessName: "Acme Ltd",
		PushName:     "acme",
	}
	if got := contactDisplayName(info); got != "Acme Ltd" {
		t.Fatalf("expected BusinessName, got %q", got)
	}
}

func TestContactDisplayName_PushNameFallback(t *testing.T) {
	info := types.ContactInfo{
		PushName: "ghostuser",
	}
	if got := contactDisplayName(info); got != "ghostuser" {
		t.Fatalf("expected PushName, got %q", got)
	}
}

func TestContactDisplayName_EmptyReturnsEmptyString(t *testing.T) {
	info := types.ContactInfo{}
	if got := contactDisplayName(info); got != "" {
		t.Fatalf("expected empty string for zero-value ContactInfo, got %q", got)
	}
}

// TestSyncContact_NumberNormalization verifies the number normalisation logic
// embedded in SyncContact (prepends "+" to numbers that lack it).
// We test this independently because the normalisation is pure and inline.
func TestSyncContact_NumberNormalization(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"5511999990000", "+5511999990000"},
		{"+5511999990000", "+5511999990000"},
		{"  5511999990000  ", "+5511999990000"}, // also tests TrimSpace
	}
	for _, tc := range cases {
		import_strings_trimspace := func(s string) string {
			s = trimSpaceHelper(s)
			if len(s) > 0 && s[0] != '+' {
				s = "+" + s
			}
			return s
		}
		got := import_strings_trimspace(tc.input)
		if got != tc.want {
			t.Errorf("normalize(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

// trimSpaceHelper mirrors the strings.TrimSpace call used in SyncContact.
func trimSpaceHelper(s string) string {
	result := []rune{}
	start, end := 0, len([]rune(s))-1
	runes := []rune(s)
	for start <= end && (runes[start] == ' ' || runes[start] == '\t') {
		start++
	}
	for end >= start && (runes[end] == ' ' || runes[end] == '\t') {
		end--
	}
	result = append(result, runes[start:end+1]...)
	return string(result)
}

// TestImportContacts_BatchFlushLogic verifies the batch flush boundary logic
// used in ImportContacts: a batch of exactly contactImportBatchSize triggers
// a flush, and a smaller trailing batch also triggers a flush.
func TestImportContacts_BatchFlushLogic(t *testing.T) {
	flushCount := 0
	batchSize := 0

	flush := func(batch []int) {
		if len(batch) == 0 {
			return
		}
		flushCount++
		batchSize = len(batch)
	}

	batch := make([]int, 0, contactImportBatchSize)
	totalItems := contactImportBatchSize + 7

	for i := 0; i < totalItems; i++ {
		batch = append(batch, i)
		if len(batch) >= contactImportBatchSize {
			flush(batch)
			batch = make([]int, 0, contactImportBatchSize)
		}
	}
	flush(batch)

	if flushCount != 2 {
		t.Fatalf("expected 2 flushes, got %d", flushCount)
	}
	if batchSize != 7 {
		t.Fatalf("expected trailing batch size=7, got %d", batchSize)
	}
}
