package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"

	"github.com/spf13/cobra"
)

type Joke struct {
	Joke string `json:"joke"`
}

func getJoke() (string, error) {
	req, err := http.NewRequest("GET", "https://icanhazdadjoke.com/", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var joke Joke
	err = json.Unmarshal(body, &joke)
	if err != nil {
		return "", err
	}

	return joke.Joke, nil
}

func dadJokeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "dadjoke",
		Short: "Get a random dad joke",
		Run: func(cmd *cobra.Command, args []string) {
			joke, err := getJoke()
			if err != nil {
				fmt.Println("Error:", err)
				return
			}
			fmt.Println(joke)
		},
	}
}

func main() {
	rootCmd := &cobra.Command{
		Use:   "dobby",
		Short: "Dobby is a helper CLI app",
	}

	rootCmd.AddCommand(dadJokeCmd())

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
