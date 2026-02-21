import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  TableStatusUpdate,
  SectionClaimEvent,
  LayoutUpdateEvent,
  UserPresence,
  TableStatusEntry,
} from '@rfm/shared';
import { getAccessToken } from '@/api/client';
import { useFloorStore } from '@/stores/floorStore';
import { useCanvasStore } from '@/stores/canvasStore';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [connected, setConnected] = useState(false);
  const currentFloor = useFloorStore((s) => s.currentFloor);
  const updateTableStatus = useFloorStore((s) => s.updateTableStatus);
  const setElements = useCanvasStore((s) => s.setElements);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Table status updates
    socket.on('table:status-changed', (data: TableStatusEntry) => {
      updateTableStatus(data.tableId, data);
    });

    // Section claimed
    socket.on('section:claimed', (_data: SectionClaimEvent) => {
      // Re-load sections could be handled here
    });

    // Layout updates from other editors
    socket.on('layout:changed', (data: LayoutUpdateEvent) => {
      setElements(data.elements);
    });

    // User presence
    socket.on('user:online', (user: UserPresence) => {
      setOnlineUsers((prev) => {
        const existing = prev.find((u) => u.userId === user.userId);
        if (existing) {
          return prev.map((u) => (u.userId === user.userId ? { ...u, online: true } : u));
        }
        return [...prev, user];
      });
    });

    socket.on('user:offline', (user: UserPresence) => {
      setOnlineUsers((prev) =>
        prev.map((u) => (u.userId === user.userId ? { ...u, online: false } : u)),
      );
    });

    socket.on('users:list', (users: UserPresence[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [updateTableStatus, setElements]);

  // Join/leave floor rooms when current floor changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !currentFloor) return;

    socket.emit('floor:join', currentFloor.id);

    return () => {
      socket.emit('floor:leave', currentFloor.id);
    };
  }, [currentFloor]);

  // Emit functions
  const emitTableStatus = useCallback((data: TableStatusUpdate) => {
    socketRef.current?.emit('table:update-status', data);
  }, []);

  const emitSectionClaim = useCallback((data: SectionClaimEvent) => {
    socketRef.current?.emit('section:claim', data);
  }, []);

  const emitLayoutUpdate = useCallback((data: LayoutUpdateEvent) => {
    socketRef.current?.emit('layout:update', data);
  }, []);

  return {
    connected,
    onlineUsers,
    emitTableStatus,
    emitSectionClaim,
    emitLayoutUpdate,
  };
}
