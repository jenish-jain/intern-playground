package main

import (
	"fmt"
	"os"

	"dobby/cmd"

	"github.com/spf13/cobra"
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "dobby",
		Short: "Dobby CLI application",
	}

	rootCmd.AddCommand(cmd.GeneratePasswordCmd())
	rootCmd.AddCommand(cmd.DadJokeCmd())

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
