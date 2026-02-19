import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createTableConfigSchema, updateTableStatusSchema } from '@rfm/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /layout/:layoutId - get all tables for layout
router.get('/layout/:layoutId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { layoutId } = req.params;

    const tables = await prisma.tableConfig.findMany({
      where: { layoutId },
      include: {
        sections: {
          include: {
            section: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        statuses: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    res.json({ tables });
  } catch (err) {
    next(err);
  }
});

// POST / - create table config (Manager+)
router.post(
  '/',
  authorize('MANAGER', 'ADMIN'),
  validate(createTableConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { layoutId, tableNumber, elementId, seats, shape, x, y, width, height, rotation } =
        req.body;

      // Verify layout exists
      const layout = await prisma.layout.findUnique({ where: { id: layoutId } });
      if (!layout) {
        throw new AppError('Layout not found', 404);
      }

      // Check for duplicate table number within the layout
      const existingTable = await prisma.tableConfig.findUnique({
        where: { layoutId_tableNumber: { layoutId, tableNumber } },
      });
      if (existingTable) {
        throw new AppError(
          `Table number ${tableNumber} already exists in this layout`,
          409,
        );
      }

      const table = await prisma.tableConfig.create({
        data: {
          layoutId,
          tableNumber,
          elementId,
          seats,
          shape,
          x,
          y,
          width,
          height,
          rotation,
        },
      });

      res.status(201).json({ table });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id - update table config (Manager+)
router.put(
  '/:id',
  authorize('MANAGER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existing = await prisma.tableConfig.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Table not found', 404);
      }

      const { tableNumber, seats, shape, x, y, width, height, rotation } = req.body;

      // If changing table number, check for conflicts
      if (tableNumber !== undefined && tableNumber !== existing.tableNumber) {
        const conflict = await prisma.tableConfig.findUnique({
          where: {
            layoutId_tableNumber: {
              layoutId: existing.layoutId,
              tableNumber,
            },
          },
        });
        if (conflict) {
          throw new AppError(
            `Table number ${tableNumber} already exists in this layout`,
            409,
          );
        }
      }

      const table = await prisma.tableConfig.update({
        where: { id },
        data: {
          ...(tableNumber !== undefined && { tableNumber }),
          ...(seats !== undefined && { seats }),
          ...(shape !== undefined && { shape }),
          ...(x !== undefined && { x }),
          ...(y !== undefined && { y }),
          ...(width !== undefined && { width }),
          ...(height !== undefined && { height }),
          ...(rotation !== undefined && { rotation }),
        },
      });

      res.json({ table });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /:id - delete table (Manager+)
router.delete(
  '/:id',
  authorize('MANAGER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existing = await prisma.tableConfig.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Table not found', 404);
      }

      await prisma.tableConfig.delete({ where: { id } });

      res.json({ message: 'Table deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /:id/status - update table status (any authenticated user)
router.patch(
  '/:id/status',
  validate(updateTableStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, guestCount, notes, serverName } = req.body;

      const table = await prisma.tableConfig.findUnique({ where: { id } });
      if (!table) {
        throw new AppError('Table not found', 404);
      }

      const statusEntry = await prisma.tableStatusEntry.create({
        data: {
          tableId: id,
          status,
          guestCount: guestCount ?? 0,
          notes,
          serverName,
          seatedAt: status === 'SEATED' ? new Date() : undefined,
        },
      });

      res.json({ statusEntry });
    } catch (err) {
      next(err);
    }
  },
);

// GET /:id/history - get status history for a table (last 50)
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const table = await prisma.tableConfig.findUnique({ where: { id } });
    if (!table) {
      throw new AppError('Table not found', 404);
    }

    const history = await prisma.tableStatusEntry.findMany({
      where: { tableId: id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    res.json({ history });
  } catch (err) {
    next(err);
  }
});

export default router;
