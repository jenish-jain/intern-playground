package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/spf13/cobra"
)

type Joke struct {
	ID     string `json:"id"`
	Joke   string `json:"joke"`
	Status int    `json:"status"`
}

func dadJokeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "dadjoke",
		Short: "Get a random dad joke",
		Run: func(cmd *cobra.Command, args []string) {
			joke, err := getDadJoke()
			if err != nil {
				fmt.Printf("Error: %v\n", err)
				return
			}
			fmt.Println(joke)
		},
	}
}

func getDadJoke() (string, error) {
	resp, err := http.Get("https://icanhazdadjoke.com/")
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
