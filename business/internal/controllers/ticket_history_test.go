package controllers

import (
	"testing"
	"time"
)

func TestHistoryCutoff(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)

	cases := map[string]int64{
		"1d":  now.Add(-24 * time.Hour).Unix(),
		"2d":  now.Add(-48 * time.Hour).Unix(),
		"7d":  now.Add(-7 * 24 * time.Hour).Unix(),
		"1w":  now.Add(-7 * 24 * time.Hour).Unix(),
		"30d": now.Add(-30 * 24 * time.Hour).Unix(),
		"all": 0,
		"":    0,
		"xyz": 0,
	}

	for token, want := range cases {
		if got := historyCutoff(token, now); got != want {
			t.Errorf("historyCutoff(%q) = %d, want %d", token, got, want)
		}
	}
}
