import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createShiftSchema, assignServerSchema } from '@rfm/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /date/:date - get shifts for date with assignments
router.get('/date/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.params;

    // Parse the date string to beginning and end of day
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, avatar: true },
            },
            section: {
              include: {
                tables: {
                  include: {
                    table: true,
                  },
                },
              },
            },
          },
        },
        floor: true,
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ shifts });
  } catch (err) {
    next(err);
  }
});

// POST / - create shift (Manager+)
router.post(
  '/',
  authorize('MANAGER', 'ADMIN'),
  validate(createShiftSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, startTime, endTime, date, floorId } = req.body;

      // Verify floor exists
      const floor = await prisma.floor.findUnique({ where: { id: floorId } });
      if (!floor) {
        throw new AppError('Floor not found', 404);
      }

      const shift = await prisma.shift.create({
        data: {
          name,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          date: new Date(date),
          floorId,
          createdBy: req.user!.id,
        },
        include: {
          assignments: true,
          floor: true,
        },
      });

      res.status(201).json({ shift });
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/assign - assign server to section (Manager+)
router.post(
  '/:id/assign',
  authorize('MANAGER', 'ADMIN'),
  validate(assignServerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: shiftId } = req.params;
      const { userId, sectionId } = req.body;

      // Verify shift exists
      const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
      if (!shift) {
        throw new AppError('Shift not found', 404);
      }

      // Verify user exists and is a SERVER
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify section exists
      const section = await prisma.section.findUnique({ where: { id: sectionId } });
      if (!section) {
        throw new AppError('Section not found', 404);
      }

      // Create or update assignment (upsert on shiftId + userId unique constraint)
      const assignment = await prisma.shiftAssignment.upsert({
        where: {
          shiftId_userId: { shiftId, userId },
        },
        create: {
          shiftId,
          userId,
          sectionId,
        },
        update: {
          sectionId,
          status: 'ASSIGNED',
          claimedAt: null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatar: true },
          },
          section: true,
        },
      });

      res.json({ assignment });
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/claim - server claims their section (sets claimedAt, status=CLAIMED)
router.post('/:id/claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: shiftId } = req.params;

    // Find the assignment for this user and shift
    const assignment = await prisma.shiftAssignment.findUnique({
      where: {
        shiftId_userId: { shiftId, userId: req.user!.id },
      },
    });

    if (!assignment) {
      throw new AppError('No assignment found for this shift', 404);
    }

    if (assignment.status !== 'ASSIGNED') {
      throw new AppError(
        `Cannot claim: assignment is already ${assignment.status}`,
        400,
      );
    }

    const updatedAssignment = await prisma.shiftAssignment.update({
      where: { id: assignment.id },
      data: {
        claimedAt: new Date(),
        status: 'CLAIMED',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        section: true,
      },
    });

    res.json({ assignment: updatedAssignment });
  } catch (err) {
    next(err);
  }
});

// PATCH /assignment/:id - update assignment status
router.patch('/assignment/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    const existing = await prisma.shiftAssignment.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Assignment not found', 404);
    }

    const validStatuses = ['ASSIGNED', 'CLAIMED', 'ACTIVE', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400,
      );
    }

    const assignment = await prisma.shiftAssignment.update({
      where: { id },
      data: { status: status as 'ASSIGNED' | 'CLAIMED' | 'ACTIVE' | 'COMPLETED' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        section: true,
      },
    });

    res.json({ assignment });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - delete shift (Manager+)
router.delete(
  '/:id',
  authorize('MANAGER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existing = await prisma.shift.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Shift not found', 404);
      }

      await prisma.shift.delete({ where: { id } });

      res.json({ message: 'Shift deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
