// app/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import ReactConfetti from 'react-confetti';

// Types
type Player = {
  id: string;
  name: string;
  symbol: 'X' | 'O';
};

type GameState = {
  id: string;
  board: (string | null)[];
  players: Player[];
  currentTurn: string | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
};

export default function Home() {
  // State
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Effects
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    socketRef.current = io(
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SERVER_URL
        : `http://localhost:3001`
    );
    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('error', (message: string) => {
      setError(message);
    });

    socket.on('gameCreated', (game: GameState) => {
      setGameState(game);
      setGameId(game.id);
      setError(null);
    });

    socket.on('gameUpdate', (game: GameState) => {
      setGameState(game);
      setError(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Game state helpers
  const didIWin =
    gameState?.status === 'finished' &&
    gameState.winner === socketRef.current?.id;

  const didILose =
    gameState?.status === 'finished' &&
    gameState.winner &&
    gameState.winner !== socketRef.current?.id;

  const isGameDraw = gameState?.status === 'finished' && !gameState.winner;

  // Actions
  const createGame = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    socketRef.current?.emit('createGame', playerName);
  };

  const joinGame = () => {
    if (!playerName.trim() || !gameId.trim()) {
      setError('Please enter your name and game ID');
      return;
    }
    socketRef.current?.emit('joinGame', { gameId, playerName });
  };

  const makeMove = (position: number) => {
    socketRef.current?.emit('makeMove', { gameId: gameState?.id, position });
  };

  const getCurrentPlayer = () => {
    return gameState?.players.find(
      (p) => socketRef.current && p.id === socketRef.current.id
    );
  };

  const isMyTurn = () => {
    return socketRef.current && gameState?.currentTurn === socketRef.current.id;
  };

  // UI Components
  const renderGameEndOverlay = () => {
    if (!gameState || gameState.status !== 'finished') return null;

    if (didIWin) {
      return (
        <>
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={true}
            numberOfPieces={200}
            gravity={0.3}
          />
          <div className='absolute inset-0 bg-green-500 bg-opacity-20 backdrop-blur-sm flex items-center justify-center'>
            <div className='bg-white p-6 rounded-lg shadow-lg text-center transform animate-bounce'>
              <h2 className='text-4xl font-bold text-green-500 mb-2'>
                🎉 You Won! 🎉
              </h2>
              <p className='text-gray-600'>Congratulations!</p>
            </div>
          </div>
        </>
      );
    }

    if (didILose) {
      return (
        <div className='absolute inset-0 bg-red-500 bg-opacity-20 backdrop-blur-sm flex items-center justify-center animate-fade-in'>
          <div className='bg-white p-6 rounded-lg shadow-lg text-center transform animate-shake'>
            <h2 className='text-4xl font-bold text-red-500 mb-2'>Game Over</h2>
            <p className='text-gray-600'>Better luck next time!</p>
          </div>
        </div>
      );
    }

    if (isGameDraw) {
      return (
        <div className='absolute inset-0 bg-gray-500 bg-opacity-20 backdrop-blur-sm flex items-center justify-center'>
          <div className='bg-white p-6 rounded-lg shadow-lg text-center'>
            <h2 className='text-4xl font-bold text-gray-700 mb-2'>
              It&apos;s a Draw!
            </h2>
            <p className='text-gray-600'>Great game!</p>
          </div>
        </div>
      );
    }
  };

  // Loading State
  if (!connected) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto'></div>
          <p className='mt-4'>Connecting to server...</p>

          <p>
            {JSON.stringify(
              process.env.NODE_ENV === 'production'
                ? process.env.NEXT_PUBLIC_SERVER_URL
                : `http://localhost:3001`,
              null,
              2
            )}
          </p>

          <p>{JSON.stringify(socketRef, null, 2)}</p>
        </div>
      </div>
    );
  }

  // Game Setup State
  if (!gameState) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='bg-white p-8 rounded-lg shadow-lg max-w-md w-full'>
          <h1 className='text-2xl font-bold mb-6 text-center'>Tic Tac Toe</h1>

          {error && (
            <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
              {error}
            </div>
          )}

          <input
            type='text'
            placeholder='Your Name'
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className='w-full p-2 mb-4 border rounded'
          />

          <button
            onClick={createGame}
            className='w-full bg-blue-500 text-white p-2 rounded mb-2 hover:bg-blue-600 transition-colors'
          >
            Create New Game
          </button>

          <div className='text-center my-4'>or</div>

          <input
            type='text'
            placeholder='Game ID'
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className='w-full p-2 mb-4 border rounded'
          />

          <button
            onClick={joinGame}
            className='w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors'
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  // Game Board State
  return (
    <div className='min-h-screen flex items-center justify-center p-4 relative'>
      <div className='bg-white p-8 rounded-lg shadow-lg max-w-md w-full relative'>
        <div className='mb-4 text-center'>
          <h1 className='text-2xl font-bold mb-2'>Game ID: {gameState.id}</h1>
          <div
            className={`text-sm ${
              gameState.status === 'playing'
                ? isMyTurn()
                  ? 'text-green-600 font-bold animate-pulse'
                  : 'text-gray-600'
                : 'text-gray-600'
            }`}
          >
            {gameState.status === 'waiting' && (
              <div className='flex items-center justify-center space-x-2'>
                <span>Waiting for opponent</span>
                <div className='flex space-x-1'>
                  <div
                    className='w-2 h-2 bg-gray-500 rounded-full animate-bounce'
                    style={{ animationDelay: '0s' }}
                  ></div>
                  <div
                    className='w-2 h-2 bg-gray-500 rounded-full animate-bounce'
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className='w-2 h-2 bg-gray-500 rounded-full animate-bounce'
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            )}
            {gameState.status === 'playing' &&
              (isMyTurn() ? 'Your turn!' : "Opponent's turn")}
          </div>
        </div>

        <div className='grid grid-cols-3 gap-2 mb-4'>
          {gameState.board.map((cell, index) => {
            const isWinningCell =
              didIWin && cell === getCurrentPlayer()?.symbol;
            return (
              <button
                key={index}
                onClick={() => makeMove(index)}
                disabled={
                  cell !== null || gameState.status !== 'playing' || !isMyTurn()
                }
                className={`
                                    aspect-square text-4xl font-bold rounded
                                    ${
                                      isWinningCell
                                        ? 'bg-green-200 animate-pulse'
                                        : ''
                                    }
                                    ${
                                      cell === null &&
                                      isMyTurn() &&
                                      gameState.status === 'playing'
                                        ? 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                                        : 'bg-gray-100'
                                    }
                                    disabled:cursor-not-allowed
                                    transition-all duration-200
                                    ${
                                      cell === 'X'
                                        ? 'text-blue-500'
                                        : 'text-red-500'
                                    }
                                `}
              >
                {cell}
              </button>
            );
          })}
        </div>

        <div className='space-y-2'>
          <div
            className={`flex justify-between px-2 py-1 rounded transition-colors duration-300 ${
              gameState.currentTurn ===
              gameState.players.find((p) => p.symbol === 'X')?.id
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50'
            }`}
          >
            <span className='text-blue-500 font-bold'>Player X</span>
            <span>
              {gameState.players.find((p) => p.symbol === 'X')?.name ||
                'Waiting...'}
            </span>
          </div>
          <div
            className={`flex justify-between px-2 py-1 rounded transition-colors duration-300 ${
              gameState.currentTurn ===
              gameState.players.find((p) => p.symbol === 'O')?.id
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50'
            }`}
          >
            <span className='text-red-500 font-bold'>Player O</span>
            <span>
              {gameState.players.find((p) => p.symbol === 'O')?.name ||
                'Waiting...'}
            </span>
          </div>
        </div>

        {error && (
          <div className='mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded animate-shake'>
            {error}
          </div>
        )}
      </div>
      {renderGameEndOverlay()}
    </div>
  );
}
