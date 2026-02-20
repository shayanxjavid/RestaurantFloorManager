import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /turnover - average time tables spend in each status (last 7 days)
router.get('/turnover', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const statusEntries = await prisma.tableStatusEntry.findMany({
      where: {
        updatedAt: { gte: sevenDaysAgo },
      },
      orderBy: [{ tableId: 'asc' }, { updatedAt: 'asc' }],
    });

    // Calculate average time spent in each status
    const statusDurations: Record<string, { total: number; count: number }> = {};

    for (let i = 0; i < statusEntries.length - 1; i++) {
      const current = statusEntries[i];
      const next = statusEntries[i + 1];

      // Only measure duration if same table (consecutive entries)
      if (current.tableId === next.tableId) {
        const durationMs = next.updatedAt.getTime() - current.updatedAt.getTime();
        const durationMinutes = durationMs / (1000 * 60);

        // Skip unreasonably long durations (over 12 hours, likely overnight)
        if (durationMinutes > 720) continue;

        if (!statusDurations[current.status]) {
          statusDurations[current.status] = { total: 0, count: 0 };
        }
        statusDurations[current.status].total += durationMinutes;
        statusDurations[current.status].count += 1;
      }
    }

    const turnover = Object.entries(statusDurations).map(([status, data]) => ({
      status,
      averageMinutes: Math.round((data.total / data.count) * 10) / 10,
      occurrences: data.count,
    }));

    res.json({ turnover });
  } catch (err) {
    next(err);
  }
});

// GET /sections - section stats (total tables, total seats, assignment count)
router.get('/sections', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sections = await prisma.section.findMany({
      include: {
        tables: {
          include: {
            table: {
              select: { seats: true },
            },
          },
        },
        shiftAssignments: true,
      },
    });

    const sectionStats = sections.map((section: any) => ({
      id: section.id,
      name: section.name,
      color: section.color,
      layoutId: section.layoutId,
      floorId: section.floorId,
      totalTables: section.tables.length,
      totalSeats: section.tables.reduce((sum: number, st: any) => sum + st.table.seats, 0),
      assignmentCount: section.shiftAssignments.length,
    }));

    res.json({ sections: sectionStats });
  } catch (err) {
    next(err);
  }
});

// GET /staff/:date? - staff assignment history with section names
router.get('/staff/:date?', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateStr = req.params.date;

    const whereClause: Record<string, unknown> = {};
    if (dateStr) {
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      whereClause.shift = {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const assignments = await prisma.shiftAssignment.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        section: {
          select: { id: true, name: true, color: true },
        },
        shift: {
          select: { id: true, name: true, startTime: true, endTime: true, date: true },
        },
      },
      orderBy: { shift: { date: 'desc' } },
    });

    res.json({ assignments });
  } catch (err) {
    next(err);
  }
});

// GET /overview - total tables, occupied count, guest count for current active layout
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { floorId } = req.query;

    if (!floorId || typeof floorId !== 'string') {
      throw new AppError('floorId query parameter is required', 400);
    }

    // Find the active layout for the floor
    const activeLayout = await prisma.layout.findFirst({
      where: {
        floorId,
        isActive: true,
      },
      include: {
        tables: {
          include: {
            statuses: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!activeLayout) {
      throw new AppError('No active layout found for this floor', 404);
    }

    const totalTables = activeLayout.tables.length;
    let occupiedCount = 0;
    let totalGuests = 0;

    const occupiedStatuses = ['SEATED', 'ORDERING', 'SERVED', 'CHECK_REQUESTED'];

    for (const table of activeLayout.tables) {
      const latestStatus = table.statuses[0];
      if (latestStatus && occupiedStatuses.includes(latestStatus.status)) {
        occupiedCount += 1;
        totalGuests += latestStatus.guestCount;
      }
    }

    res.json({
      overview: {
        floorId,
        layoutId: activeLayout.id,
        layoutName: activeLayout.name,
        totalTables,
        occupiedCount,
        availableCount: totalTables - occupiedCount,
        totalGuests,
        occupancyRate:
          totalTables > 0
            ? Math.round((occupiedCount / totalTables) * 100)
            : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
