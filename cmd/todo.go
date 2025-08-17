package cmd

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

type TodoItem struct {
	ID          int    `json:"id"`
	Description string `json:"description"`
	Completed   bool   `json:"completed"`
}

var todoList []TodoItem
var todoFile string

func init() {
	homeDir, _ := os.UserHomeDir()
	todoFile = filepath.Join(homeDir, ".dobby", "todo.json")
}

func TodoCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "todo",
		Short: "Manage your todo list",
		Long:  "Add, list, complete, and delete todo items",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			loadTodoList()
		},
	}

	cmd.AddCommand(todoAddCmd())
	cmd.AddCommand(todoListCmd())
	cmd.AddCommand(todoCompleteCmd())
	cmd.AddCommand(todoDeleteCmd())

	return cmd
}

func todoAddCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "add <description>",
		Short: "Add a new todo item",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			newItem := TodoItem{
				ID:          len(todoList) + 1,
				Description: args[0],
				Completed:   false,
			}
			todoList = append(todoList, newItem)
			saveTodoList()
			fmt.Printf("Added todo item: %s\n", newItem.Description)
		},
	}
}

func todoListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List all todo items",
		Run: func(cmd *cobra.Command, args []string) {
			for _, item := range todoList {
				status := "[ ]"
				if item.Completed {
					status = "[x]"
				}
				fmt.Printf("%d. %s %s\n", item.ID, status, item.Description)
			}
		},
	}
}

func todoCompleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "complete <id>",
		Short: "Mark a todo item as completed",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			id := 0
			fmt.Sscanf(args[0], "%d", &id)
			for i, item := range todoList {
				if item.ID == id {
					todoList[i].Completed = true
					saveTodoList()
					fmt.Printf("Marked item %d as completed\n", id)
					return
				}
			}
			fmt.Printf("Item with ID %d not found\n", id)
		},
	}
}

func todoDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a todo item",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			id := 0
			fmt.Sscanf(args[0], "%d", &id)
			for i, item := range todoList {
				if item.ID == id {
					todoList = append(todoList[:i], todoList[i+1:]...)
					saveTodoList()
					fmt.Printf("Deleted item %d\n", id)
					return
				}
			}
			fmt.Printf("Item with ID %d not found\n", id)
		},
	}
}

func loadTodoList() {
	data, err := ioutil.ReadFile(todoFile)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		fmt.Printf("Error reading todo file: %v\n", err)
		return
	}

	err = json.Unmarshal(data, &todoList)
	if err != nil {
		fmt.Printf("Error parsing todo file: %v\n", err)
	}
}

func saveTodoList() {
	data, err := json.MarshalIndent(todoList, "", "  ")
	if err != nil {
		fmt.Printf("Error encoding todo list: %v\n", err)
		return
	}

	err = os.MkdirAll(filepath.Dir(todoFile), 0755)
	if err != nil {
		fmt.Printf("Error creating directory: %v\n", err)
		return
	}

	err = ioutil.WriteFile(todoFile, data, 0644)
	if err != nil {
		fmt.Printf("Error saving todo file: %v\n", err)
	}
}
