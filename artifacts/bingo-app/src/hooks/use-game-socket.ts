import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { Game } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCurrentGameQueryKey, getGetGameQueryKey } from '@workspace/api-client-react';

interface GameSocketEvents {
  gameUpdate: { game: Game };
  numberDrawn: { number: number; game: Game };
  bingoWinner: { winner: { username: string; prizeAmount: number; pattern: string } };
  gameStarting: { game: Game; startsInMs: number };
  gameStarted: { game: Game };
  gameFinished: { game: Game };
  newGame: { game: Game };
  playerJoined: { playerCount: number };
}

export function useGameSocket(gameId?: number) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastDrawnNumber, setLastDrawnNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<GameSocketEvents['bingoWinner']['winner'] | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const queryClient = useQueryClient();
  const gameIdRef = useRef(gameId);
  gameIdRef.current = gameId;

  useEffect(() => {
    const token = localStorage.getItem('bingoToken');
    if (!token) return;

    const socketInstance = io({
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('[socket] connected');
      // Join this game's room so we only receive events for it
      if (gameIdRef.current) {
        socketInstance.emit('joinGame', gameIdRef.current);
      }
    });

    socketInstance.on('gameUpdate', (data: GameSocketEvents['gameUpdate']) => {
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
      queryClient.setQueryData(getGetGameQueryKey(data.game.id), data.game);
    });

    socketInstance.on('numberDrawn', (data: GameSocketEvents['numberDrawn']) => {
      setLastDrawnNumber(data.number);
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
      queryClient.setQueryData(getGetGameQueryKey(data.game.id), data.game);
    });

    socketInstance.on('bingoWinner', (data: GameSocketEvents['bingoWinner']) => {
      setWinner(data.winner);
    });

    socketInstance.on('gameStarting', (data: GameSocketEvents['gameStarting']) => {
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
      queryClient.setQueryData(getGetGameQueryKey(data.game.id), data.game);
    });

    socketInstance.on('gameStarted', (data: GameSocketEvents['gameStarted']) => {
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
      queryClient.setQueryData(getGetGameQueryKey(data.game.id), data.game);
    });

    socketInstance.on('gameFinished', (data: GameSocketEvents['gameFinished']) => {
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
      queryClient.setQueryData(getGetGameQueryKey(data.game.id), data.game);
    });

    // A brand-new waiting game was created — redirect lobby users
    socketInstance.on('newGame', (data: GameSocketEvents['newGame']) => {
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
    });

    socketInstance.on('playerJoined', (data: GameSocketEvents['playerJoined']) => {
      setPlayerCount(data.playerCount);
      queryClient.setQueryData(getGetCurrentGameQueryKey(), (old: Game | undefined) => {
        if (!old) return old;
        return { ...old, playerCount: data.playerCount };
      });
      // Invalidate cartela availability so taken cells refresh
      if (gameIdRef.current) {
        queryClient.invalidateQueries({
          queryKey: [`/api/games/${gameIdRef.current}/cartelas`],
        });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  // Rejoin room if gameId changes after connection
  useEffect(() => {
    if (socket?.connected && gameId) {
      socket.emit('joinGame', gameId);
    }
  }, [socket, gameId]);

  const clearWinner = () => setWinner(null);
  const clearLastDrawnNumber = () => setLastDrawnNumber(null);

  return {
    socket,
    lastDrawnNumber,
    winner,
    playerCount,
    clearWinner,
    clearLastDrawnNumber,
  };
}
