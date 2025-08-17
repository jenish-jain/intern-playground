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

func main() {
	resp, err := http.Get("https://icanhazdadjoke.com/")
	if err != nil {
		fmt.Println("Error fetching joke:", err)
		return
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response:", err)
		return
	}

	var joke Joke
	err = json.Unmarshal(body, &joke)
	if err != nil {
		fmt.Println("Error parsing joke:", err)
		return
	}

	fmt.Println(joke.Joke)
}
