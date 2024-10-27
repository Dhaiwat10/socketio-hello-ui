'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import ReactConfetti from 'react-confetti';

type Player = {
    id: string;
    name: string;
    symbol?: 'X' | 'O';
    inQueue: boolean;
    inGame: boolean;
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
    const [playerName, setPlayerName] = useState('');
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [inQueue, setInQueue] = useState(false);
    const [queueSize, setQueueSize] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        socketRef.current = io('http://localhost:3001');
        const socket = socketRef.current;

        socket.on('connect', () => {
            setError(null);
        });

        socket.on('error', (message: string) => {
            setError(message);
        });

        socket.on('queueSize', (size: number) => {
            setQueueSize(size);
        });

        socket.on('gameFound', (gameId: string) => {
            socket.emit('joinGame', { gameId });
            setInQueue(false);
        });

        socket.on('gameUpdate', (game: GameState) => {
            setGameState(game);
            setError(null);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const resetGame = () => {
        setGameState(null);
        setInQueue(false);
        setError(null);
    };

    const quickMatch = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }
        socketRef.current?.emit('joinQueue', playerName);
        setInQueue(true);
        setError(null);
    };

    const handlePlayAgain = () => {
        resetGame();
    };

    const leaveQueue = () => {
        socketRef.current?.emit('leaveQueue');
        setInQueue(false);
    };

    const makeMove = (position: number) => {
        if (!gameState) return;
        socketRef.current?.emit('makeMove', { gameId: gameState.id, position });
    };

    const isMyTurn = () => {
        return socketRef.current && gameState?.currentTurn === socketRef.current.id;
    };

    const renderGameEndOverlay = () => {
        if (gameState?.status !== 'finished') return null;

        let message;
        let color;
        if (gameState.winner === socketRef.current?.id) {
            message = "You Won! 🎉";
            color = "text-green-500";
        } else if (gameState.winner) {
            message = "You Lost!";
            color = "text-red-500";
        } else {
            message = "It's a Draw!";
            color = "text-gray-500";
        }

        return (
            <>
                {gameState.winner === socketRef.current?.id && (
                    <ReactConfetti
                        width={window.innerWidth}
                        height={window.innerHeight}
                        recycle={true}
                        numberOfPieces={200}
                    />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                        <h2 className={`text-4xl font-bold ${color} mb-4`}>
                            {message}
                        </h2>
                        <button
                            onClick={handlePlayAgain}
                            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            </>
        );
    };

    // Initial screen - Name input and Quick Match
    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-6 text-center">Tic Tac Toe</h1>
                    
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                    
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full p-2 mb-4 border rounded"
                        disabled={inQueue}
                    />
                    
                    {inQueue ? (
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="text-lg font-semibold">Finding a match...</div>
                                <div className="text-sm text-gray-600">
                                    Players in queue: {queueSize}
                                </div>
                                <div className="mt-2 flex justify-center">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
                                            style={{ animationDelay: '0s' }}></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
                                            style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
                                            style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={leaveQueue}
                                className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
                            >
                                Leave Queue
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={quickMatch}
                            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
                        >
                            Quick Match
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Game board
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <div className="mb-4 text-center">
                    <h1 className="text-2xl font-bold mb-2">Tic Tac Toe</h1>
                    <div className={`text-sm ${
                        gameState.status === 'playing' 
                            ? isMyTurn() 
                                ? 'text-green-600 font-bold animate-pulse' 
                                : 'text-gray-600'
                            : 'text-gray-600'
                    }`}>
                        {gameState.status === 'playing' && (
                            isMyTurn() ? 'Your turn!' : "Opponent's turn"
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    {gameState.board.map((cell, index) => {
                        const canMove = gameState.status === 'playing' && 
                                      isMyTurn() && 
                                      cell === null;
                        
                        return (
                            <button
                                key={index}
                                onClick={() => canMove && makeMove(index)}
                                disabled={!canMove}
                                className={`
                                    aspect-square text-4xl font-bold rounded
                                    ${canMove ? 'bg-gray-100 hover:bg-gray-200 hover:scale-105' : 'bg-gray-100'}
                                    disabled:cursor-not-allowed
                                    transition-all duration-200
                                    ${cell === 'X' ? 'text-blue-500' : 'text-red-500'}
                                `}
                            >
                                {cell}
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-2">
                    {gameState.players.map((player) => (
                        <div 
                            key={player.id}
                            className={`flex justify-between px-2 py-1 rounded ${
                                gameState.currentTurn === player.id
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'bg-gray-50'
                            }`}
                        >
                            <span className={player.symbol === 'X' ? 'text-blue-500' : 'text-red-500'}>
                                {player.name} ({player.symbol})
                            </span>
                            {gameState.currentTurn === player.id && (
                                <span className="text-green-500">•</span>
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
            </div>
            {renderGameEndOverlay()}
        </div>
    );
}