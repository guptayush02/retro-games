# Retro Game Website

A modern web app to play classic retro games (Snake, Tetris, Pong) with high score tracking. Built with React and Node.js/Express.

## Getting Started

### Server
1. `cd server`
2. `npm install`
3. `npm start`

### Client
1. `cd client`
2. `npm install`
3. `npm start`

The client expects the server to run on http://localhost:4000.

## Adding New Games
- Add a new game component to the `games/` folder.
- Register it in `client/src/App.js`.

## Features
- Play Snake, Tetris, and Pong in the browser
- High score tracking (in-memory)
- Modern retro-inspired UI
