import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { updateUserRoleSchema } from '@rfm/shared';

const router = Router();

// All routes require ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET / - list all users (exclude password)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/role - update user role
router.patch(
  '/:id/role',
  validate(updateUserRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ user: updatedUser });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /:id - soft delete (set active=false)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (id === req.user!.id) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    res.json({ user: deactivatedUser, message: 'User deactivated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
