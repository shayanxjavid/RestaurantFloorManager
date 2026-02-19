import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createSectionSchema, assignTablesSchema } from '@rfm/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /layout/:layoutId - get sections with their tables
router.get('/layout/:layoutId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { layoutId } = req.params;

    const sections = await prisma.section.findMany({
      where: { layoutId },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    res.json({ sections });
  } catch (err) {
    next(err);
  }
});

// POST / - create section (Manager+)
router.post(
  '/',
  authorize('MANAGER', 'ADMIN'),
  validate(createSectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, color, layoutId, floorId } = req.body;

      // Verify layout and floor exist
      const layout = await prisma.layout.findUnique({ where: { id: layoutId } });
      if (!layout) {
        throw new AppError('Layout not found', 404);
      }

      const floor = await prisma.floor.findUnique({ where: { id: floorId } });
      if (!floor) {
        throw new AppError('Floor not found', 404);
      }

      const section = await prisma.section.create({
        data: {
          name,
          color,
          layoutId,
          floorId,
        },
        include: {
          tables: {
            include: {
              table: true,
            },
          },
        },
      });

      res.status(201).json({ section });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id - update section name/color (Manager+)
router.put(
  '/:id',
  authorize('MANAGER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, color } = req.body;

      const existing = await prisma.section.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Section not found', 404);
      }

      const section = await prisma.section.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(color !== undefined && { color }),
        },
        include: {
          tables: {
            include: {
              table: true,
            },
          },
        },
      });

      res.json({ section });
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/tables - assign tables to section (replace existing, Manager+)
router.post(
  '/:id/tables',
  authorize('MANAGER', 'ADMIN'),
  validate(assignTablesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { tableIds } = req.body as { tableIds: string[] };

      const section = await prisma.section.findUnique({ where: { id } });
      if (!section) {
        throw new AppError('Section not found', 404);
      }

      // Replace all table assignments: delete existing, then create new ones
      await prisma.$transaction([
        prisma.sectionTable.deleteMany({ where: { sectionId: id } }),
        ...tableIds.map((tableId: string) =>
          prisma.sectionTable.create({
            data: { sectionId: id, tableId },
          }),
        ),
      ]);

      const updatedSection = await prisma.section.findUnique({
        where: { id },
        include: {
          tables: {
            include: {
              table: true,
            },
          },
        },
      });

      res.json({ section: updatedSection });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /:id - delete section (Manager+)
router.delete(
  '/:id',
  authorize('MANAGER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existing = await prisma.section.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Section not found', 404);
      }

      await prisma.section.delete({ where: { id } });

      res.json({ message: 'Section deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
