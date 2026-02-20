import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type {
  TableStatusUpdate,
  SectionClaimEvent,
  LayoutUpdateEvent,
} from '@rfm/shared';

// userId -> socketId mapping for presence tracking
const onlineUsers = new Map<string, string>();

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    userName: string;
    role: string;
  };
}

function getSocketUser(socket: Socket): { userId: string; userName: string; role: string } {
  return socket.data as { userId: string; userName: string; role: string };
}

export function setupSocketHandlers(io: Server): void {
  // Authenticate socket connections via token in handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
      };

      // Fetch user name asynchronously and attach to socket data
      prisma.user
        .findUnique({
          where: { id: decoded.id },
          select: { name: true },
        })
        .then((user: any) => {
          socket.data = {
            userId: decoded.id,
            userName: user?.name ?? decoded.email,
            role: decoded.role,
          };
          next();
        })
        .catch(() => {
          next(new Error('User not found'));
        });
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, userName, role } = getSocketUser(socket);

    // Store userId -> socketId mapping
    onlineUsers.set(userId, socket.id);

    // Broadcast user online event
    io.emit('user:online', {
      userId,
      userName,
      role,
      online: true,
    });

    console.log(`Socket connected: ${userName} (${userId})`);

    // --- Join a floor room ---
    socket.on('join-floor', (floorId: string) => {
      socket.join(`floor:${floorId}`);
      console.log(`${userName} joined floor:${floorId}`);
    });

    // --- Table status update ---
    socket.on('table:status-update', async (data: TableStatusUpdate) => {
      try {
        const { tableId, status, guestCount, notes, serverName } = data;

        // Validate the table exists
        const table = await prisma.tableConfig.findUnique({
          where: { id: tableId },
          include: { layout: { select: { floorId: true } } },
        });

        if (!table) {
          socket.emit('error', { message: 'Table not found' });
          return;
        }

        // Create status entry in the database
        const statusEntry = await prisma.tableStatusEntry.create({
          data: {
            tableId,
            status: status as 'AVAILABLE' | 'RESERVED' | 'SEATED' | 'ORDERING' | 'SERVED' | 'CHECK_REQUESTED' | 'CLEANING',
            guestCount: guestCount ?? 0,
            notes,
            serverName,
            seatedAt: status === 'SEATED' ? new Date() : undefined,
          },
        });

        // Broadcast to all clients in the floor room
        const floorId = table.layout.floorId;
        io.to(`floor:${floorId}`).emit('table:status-changed', {
          tableId,
          status,
          guestCount: statusEntry.guestCount,
          notes: statusEntry.notes,
          serverName: statusEntry.serverName,
          updatedBy: userId,
          updatedAt: statusEntry.updatedAt,
        });
      } catch (err) {
        console.error('table:status-update error:', err);
        socket.emit('error', { message: 'Failed to update table status' });
      }
    });

    // --- Section claim ---
    socket.on('section:claim', async (data: SectionClaimEvent) => {
      try {
        const { shiftId, sectionId } = data;

        // Find the assignment for this user
        const assignment = await prisma.shiftAssignment.findUnique({
          where: {
            shiftId_userId: { shiftId, userId },
          },
          include: {
            section: { select: { floorId: true } },
          },
        });

        if (!assignment) {
          socket.emit('error', { message: 'No assignment found for this shift' });
          return;
        }

        if (assignment.sectionId !== sectionId) {
          socket.emit('error', { message: 'You are not assigned to this section' });
          return;
        }

        // Update the assignment
        const updated = await prisma.shiftAssignment.update({
          where: { id: assignment.id },
          data: {
            claimedAt: new Date(),
            status: 'CLAIMED',
          },
          include: {
            user: { select: { id: true, name: true } },
            section: true,
          },
        });

        // Broadcast to all clients in the floor room
        const floorId = assignment.section.floorId;
        io.to(`floor:${floorId}`).emit('section:claimed', {
          shiftId,
          sectionId,
          userId,
          userName: updated.user.name,
          claimedAt: updated.claimedAt,
        });
      } catch (err) {
        console.error('section:claim error:', err);
        socket.emit('error', { message: 'Failed to claim section' });
      }
    });

    // --- Layout update ---
    socket.on('layout:update', async (data: LayoutUpdateEvent) => {
      try {
        const { layoutId, elements } = data;

        const layout = await prisma.layout.findUnique({
          where: { id: layoutId },
          select: { floorId: true },
        });

        if (!layout) {
          socket.emit('error', { message: 'Layout not found' });
          return;
        }

        // Update layout in the database
        await prisma.layout.update({
          where: { id: layoutId },
          data: {
            elements: elements as unknown as Record<string, unknown>[],
            version: { increment: 1 },
          },
        });

        // Broadcast to all clients in the floor room (except sender)
        socket.to(`floor:${layout.floorId}`).emit('layout:changed', {
          layoutId,
          elements,
          updatedBy: userId,
        });
      } catch (err) {
        console.error('layout:update error:', err);
        socket.emit('error', { message: 'Failed to update layout' });
      }
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);

      io.emit('user:offline', {
        userId,
        userName,
        role,
        online: false,
      });

      console.log(`Socket disconnected: ${userName} (${userId})`);
    });
  });
}
