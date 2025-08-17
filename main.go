package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
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

func main() {
	joke, err := getJoke()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(joke)
}
