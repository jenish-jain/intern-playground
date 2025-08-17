# Dobby CLI

## Functionality
Dobby is a helper CLI application with the following features:
- Generate random passwords
- Fetch random dad jokes

## Code Structure
- `cmd/`: Contains the main application logic
  - `main.go`: Entry point of the application
  - `generate_password.go`: Password generation functionality
  - `dadjoke.go`: Dad joke fetching functionality
- `go.mod` and `go.sum`: Go module files
- `.gitignore`: Specifies intentionally untracked files to ignore

## Development Setup
1. Ensure Go 1.22.0 or later is installed
2. Clone the repository
3. Run `go mod tidy` to download dependencies
4. Use `go run cmd/main.go` to run the application

## Commands
- `dobby generate-password`: Generate a random password
  - Flags:
    - `--length`: Length of the password (default 16)
    - `--include-caps`: Include capital letters (default true)
    - `--include-numbers`: Include numbers (default true)
    - `--include-special`: Include special characters (default true)
- `dobby dadjoke`: Fetch a random dad joke

## Testing
Run tests using `go test ./...`

## Contributing
1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## Dependencies
- github.com/spf13/cobra: Command line interface library

Note: This README should be updated as new features are added or significant changes are made to the project structure.