import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createLayoutSchema, updateLayoutSchema } from '@rfm/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /floor/:floorId - get all layouts for a floor
router.get('/floor/:floorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { floorId } = req.params;

    const layouts = await prisma.layout.findMany({
      where: { floorId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ layouts });
  } catch (err) {
    next(err);
  }
});

// GET /:id - get single layout with elements and tables
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const layout = await prisma.layout.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            sections: {
              include: {
                section: true,
              },
            },
            statuses: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
        sections: {
          include: {
            tables: {
              include: {
                table: true,
              },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!layout) {
      throw new AppError('Layout not found', 404);
    }

    res.json({ layout });
  } catch (err) {
    next(err);
  }
});

// POST / - create layout (Manager+)
router.post(
  '/',
  authorize('MANAGER', 'ADMIN'),
  validate(createLayoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, floorId, elements, gridSize, width, height } = req.body;

      // Verify floor exists
      const floor = await prisma.floor.findUnique({ where: { id: floorId } });
      if (!floor) {
        throw new AppError('Floor not found', 404);
      }

      const layout = await prisma.layout.create({
        data: {
          name,
          floorId,
          elements: elements ?? [],
          gridSize,
          width,
          height,
          createdBy: req.user!.id,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json({ layout });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id - update layout elements/metadata (Manager+)
router.put(
  '/:id',
  authorize('MANAGER', 'ADMIN'),
  validate(updateLayoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, elements, gridSize, width, height } = req.body;

      const existing = await prisma.layout.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Layout not found', 404);
      }

      const layout = await prisma.layout.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(elements !== undefined && { elements }),
          ...(gridSize !== undefined && { gridSize }),
          ...(width !== undefined && { width }),
          ...(height !== undefined && { height }),
          version: { increment: 1 },
        },
        include: {
          tables: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json({ layout });
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/activate - set as active (deactivate others on same floor) (Manager+)
router.post(
  '/:id/activate',
  authorize('MANAGER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const layout = await prisma.layout.findUnique({ where: { id } });
      if (!layout) {
        throw new AppError('Layout not found', 404);
      }

      // Deactivate all other layouts on the same floor, then activate this one
      await prisma.$transaction([
        prisma.layout.updateMany({
          where: { floorId: layout.floorId },
          data: { isActive: false },
        }),
        prisma.layout.update({
          where: { id },
          data: { isActive: true },
        }),
      ]);

      const updatedLayout = await prisma.layout.findUnique({
        where: { id },
        include: {
          tables: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json({ layout: updatedLayout });
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/duplicate - clone layout with new name (Manager+)
router.post(
  '/:id/duplicate',
  authorize('MANAGER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name } = req.body as { name?: string };

      const source = await prisma.layout.findUnique({
        where: { id },
        include: { tables: true },
      });

      if (!source) {
        throw new AppError('Layout not found', 404);
      }

      const duplicatedLayout = await prisma.layout.create({
        data: {
          name: name ?? `${source.name} (Copy)`,
          floorId: source.floorId,
          elements: source.elements ?? [],
          gridSize: source.gridSize,
          width: source.width,
          height: source.height,
          createdBy: req.user!.id,
          isActive: false,
          tables: {
            create: source.tables.map((table: any) => ({
              tableNumber: table.tableNumber,
              elementId: table.elementId,
              seats: table.seats,
              shape: table.shape,
              x: table.x,
              y: table.y,
              width: table.width,
              height: table.height,
              rotation: table.rotation,
            })),
          },
        },
        include: {
          tables: true,
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json({ layout: duplicatedLayout });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
