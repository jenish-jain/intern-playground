package main

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

func generatePasswordCmd() *cobra.Command {
	var length int
	var includeCaps, includeNumbers, includeSpecial bool

	cmd := &cobra.Command{
		Use:   "generate-password",
		Short: "Generate a random password",
		RunE: func(cmd *cobra.Command, args []string) error {
			if length < 1 {
				return fmt.Errorf("invalid length: must be greater than 0")
			}

			password := generatePassword(length, includeCaps, includeNumbers, includeSpecial)
			fmt.Println(password)
			return nil
		},
	}

	cmd.Flags().IntVarP(&length, "length", "l", 16, "Length of the password")
	cmd.Flags().BoolVar(&includeCaps, "include-caps", true, "Include capital letters")
	cmd.Flags().BoolVar(&includeNumbers, "include-numbers", true, "Include numbers")
	cmd.Flags().BoolVar(&includeSpecial, "include-special", true, "Include special characters")

	return cmd
}

func generatePassword(length int, includeCaps, includeNumbers, includeSpecial bool) string {
	rand.Seed(time.Now().UnixNano())

	charSet := "abcdefghijklmnopqrstuvwxyz"
	if includeCaps {
		charSet += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	}
	if includeNumbers {
		charSet += "0123456789"
	}
	if includeSpecial {
		charSet += "!@#$%^&*()-_=+[]{}|;:,.<>?"
	}

	var password strings.Builder
	for i := 0; i < length; i++ {
		randomIndex := rand.Intn(len(charSet))
		password.WriteByte(charSet[randomIndex])
	}

	return password.String()
}
