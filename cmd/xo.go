package cmd

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
)

var activeGame *TicTacToe

var xoCmd = &cobra.Command{
	Use:   "xo",
	Short: "Play Tic-Tac-Toe",
	Long:  "Play Tic-Tac-Toe in the terminal",
}

var newGameCmd = &cobra.Command{
	Use:   "new",
	Short: "Start a new Tic-Tac-Toe game",
	Run: func(cmd *cobra.Command, args []string) {
		activeGame = NewTicTacToe()
		fmt.Println("New game started. Use 'dobby xo move <position>' to make a move.")
		activeGame.PrintBoard()
	},
}

var moveCmd = &cobra.Command{
	Use:   "move <position>",
	Short: "Make a move in the current game",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		if activeGame == nil {
			fmt.Println("No active game. Start a new game with 'dobby xo new'")
			return
		}

		pos, err := strconv.Atoi(args[0])
		if err != nil || pos < 1 || pos > 9 {
			fmt.Println("Invalid position. Use a number between 1 and 9.")
			return
		}

		if err := activeGame.MakeMove(pos - 1); err != nil {
			fmt.Println(err)
			return
		}

		activeGame.PrintBoard()

		if winner := activeGame.CheckWinner(); winner != " " {
			fmt.Printf("Player %s wins!\n", winner)
			activeGame = nil
		} else if activeGame.IsBoardFull() {
			fmt.Println("It's a draw!")
			activeGame = nil
		}
	},
}

func init() {
	xoCmd.AddCommand(newGameCmd)
	xoCmd.AddCommand(moveCmd)
	rootCmd.AddCommand(xoCmd)
}

type TicTacToe struct {
	board      [9]string
	currentPlayer string
}

func NewTicTacToe() *TicTacToe {
	return &TicTacToe{
		board:      [9]string{" ", " ", " ", " ", " ", " ", " ", " ", " "},
		currentPlayer: "X",
	}
}

func (t *TicTacToe) MakeMove(pos int) error {
	if pos < 0 || pos > 8 || t.board[pos] != " " {
		return fmt.Errorf("Invalid move")
	}
	t.board[pos] = t.currentPlayer
	if t.currentPlayer == "X" {
		t.currentPlayer = "O"
	} else {
		t.currentPlayer = "X"
	}
	return nil
}

func (t *TicTacToe) PrintBoard() {
	for i := 0; i < 9; i += 3 {
		fmt.Printf(" %s | %s | %s \n", t.board[i], t.board[i+1], t.board[i+2])
		if i < 6 {
			fmt.Println("-----------")
		}
	}
}

func (t *TicTacToe) CheckWinner() string {
	winningCombos := [][3]int{
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8}, // Rows
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8}, // Columns
		{0, 4, 8}, {2, 4, 6}, // Diagonals
	}

	for _, combo := range winningCombos {
		if t.board[combo[0]] != " " &&
			t.board[combo[0]] == t.board[combo[1]] &&
			t.board[combo[1]] == t.board[combo[2]] {
			return t.board[combo[0]]
		}
	}

	return " "
}

func (t *TicTacToe) IsBoardFull() bool {
	for _, cell := range t.board {
		if cell == " " {
			return false
		}
	}
	return true
}
