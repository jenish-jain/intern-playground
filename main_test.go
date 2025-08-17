package main

import (
	"testing"
)

func TestGetJoke(t *testing.T) {
	joke, err := getJoke()
	if err != nil {
		t.Errorf("getJoke() returned an error: %v", err)
	}
	if joke == "" {
		t.Error("getJoke() returned an empty joke")
	}
}
