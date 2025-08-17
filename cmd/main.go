package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "dobby",
		Short: "Dobby CLI application",
	}

	rootCmd.AddCommand(generatePasswordCmd())
	rootCmd.AddCommand(dadJokeCmd())

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
