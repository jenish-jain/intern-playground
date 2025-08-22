package cmd

import (
	"fmt"
	"strconv"

	"github.com/spf13/cobra"
)

var xoCmd = &cobra.Command{
	Use:   "xo",
	Short: "Play X and O (Tic-Tac-Toe)",
	Long:  `Play a game of X and O (Tic-Tac-Toe) from the command line.`,
}

var newGameCmd = &cobra.Command{
	Use:   "new",
	Short: "Start a new game",
	Run:   startNewGame,
}

var moveCmd = &cobra.Command{
	Use:   "move [row] [col]",
	Short: "Make a move",
	Args:  cobra.ExactArgs(2),
	Run:   makeMove,
}

var game *Game

func init() {
	rootCmd.AddCommand(xoCmd)
	xoCmd.AddCommand(newGameCmd)
	xoCmd.AddCommand(moveCmd)
}

func startNewGame(cmd *cobra.Command, args []string) {
	game = NewGame()
	fmt.Println("New game started. X goes first.")
	printBoard()
}

func makeMove(cmd *cobra.Command, args []string) {
	if game == nil {
		fmt.Println("No active game. Start a new game with 'dobby xo new'")
		return
	}

	row, err := strconv.Atoi(args[0])
	if err != nil {
		fmt.Println("Invalid row. Please use a number between 1 and 3.")
		return
	}

	col, err := strconv.Atoi(args[1])
	if err != nil {
		fmt.Println("Invalid column. Please use a number between 1 and 3.")
		return
	}

	if err := game.MakeMove(row-1, col-1); err != nil {
		fmt.Println(err)
		return
	}

	printBoard()

	if winner := game.CheckWinner(); winner != ' ' {
		fmt.Printf("Player %c wins!\n", winner)
		game = nil
	} else if game.IsBoardFull() {
		fmt.Println("It's a draw!")
		game = nil
	}
}

func printBoard() {
	fmt.Println("Current board:")
	for i := 0; i < 3; i++ {
		fmt.Printf(" %c | %c | %c \n", game.board[i][0], game.board[i][1], game.board[i][2])
		if i < 2 {
			fmt.Println("-----------")
		}
	}
	fmt.Printf("Current turn: %c\n", game.currentPlayer)
}

type Game struct {
	board         [3][3]rune
	currentPlayer rune
}

func NewGame() *Game {
	return &Game{
		board:         [3][3]rune{{' ', ' ', ' '}, {' ', ' ', ' '}, {' ', ' ', ' '}},
		currentPlayer: 'X',
	}
}

func (g *Game) MakeMove(row, col int) error {
	if row < 0 || row > 2 || col < 0 || col > 2 {
		return fmt.Errorf("invalid move: row and column must be between 1 and 3")
	}

	if g.board[row][col] != ' ' {
		return fmt.Errorf("invalid move: cell is already occupied")
	}

	g.board[row][col] = g.currentPlayer
	g.currentPlayer = 'O'
	if g.currentPlayer == 'O' {
		g.currentPlayer = 'X'
	}

	return nil
}

func (g *Game) CheckWinner() rune {
	// Check rows and columns
	for i := 0; i < 3; i++ {
		if g.board[i][0] != ' ' && g.board[i][0] == g.board[i][1] && g.board[i][1] == g.board[i][2] {
			return g.board[i][0]
		}
		if g.board[0][i] != ' ' && g.board[0][i] == g.board[1][i] && g.board[1][i] == g.board[2][i] {
			return g.board[0][i]
		}
	}

	// Check diagonals
	if g.board[0][0] != ' ' && g.board[0][0] == g.board[1][1] && g.board[1][1] == g.board[2][2] {
		return g.board[0][0]
	}
	if g.board[0][2] != ' ' && g.board[0][2] == g.board[1][1] && g.board[1][1] == g.board[2][0] {
		return g.board[0][2]
	}

	return ' '
}

func (g *Game) IsBoardFull() bool {
	for i := 0; i < 3; i++ {
		for j := 0; j < 3; j++ {
			if g.board[i][j] == ' ' {
				return false
			}
		}
	}
	return true
}