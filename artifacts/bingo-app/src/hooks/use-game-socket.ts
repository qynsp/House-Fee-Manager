import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { Game } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCurrentGameQueryKey, getGetGameQueryKey } from '@workspace/api-client-react';

interface GameSocketEvents {
  gameUpdate: { game: Game };
  numberDrawn: { number: number; game: Game };
  bingoWinner: { winner: { username: string; prizeAmount: number; pattern: string } };
  gameStarted: { game: Game };
  gameFinished: { game: Game };
  playerJoined: { playerCount: number };
}

export function useGameSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastDrawnNumber, setLastDrawnNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<GameSocketEvents['bingoWinner']['winner'] | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('bingoToken');
    if (!token) return;

    // We assume backend is on same origin under /api/socket.io
    const socketInstance = io({
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Connected to game socket');
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

    socketInstance.on('gameStarted', (data: GameSocketEvents['gameStarted']) => {
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
    });

    socketInstance.on('gameFinished', (data: GameSocketEvents['gameFinished']) => {
      queryClient.setQueryData(getGetCurrentGameQueryKey(), data.game);
      queryClient.setQueryData(getGetGameQueryKey(data.game.id), data.game);
    });

    socketInstance.on('playerJoined', (data: GameSocketEvents['playerJoined']) => {
      setPlayerCount(data.playerCount);
      queryClient.setQueryData(getGetCurrentGameQueryKey(), (old: Game | undefined) => {
        if (!old) return old;
        return { ...old, playerCount: data.playerCount };
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  const clearWinner = () => setWinner(null);
  const clearLastDrawnNumber = () => setLastDrawnNumber(null);

  return {
    socket,
    lastDrawnNumber,
    winner,
    playerCount,
    clearWinner,
    clearLastDrawnNumber
  };
}
