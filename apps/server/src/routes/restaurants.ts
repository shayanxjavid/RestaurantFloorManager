import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createRestaurantSchema } from '@rfm/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST / - create restaurant + default floor + default layout
router.post(
  '/',
  validate(createRestaurantSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, address, timezone } = req.body;

      const restaurant = await prisma.restaurant.create({
        data: {
          name,
          address,
          timezone,
          ownerId: req.user!.id,
          floors: {
            create: {
              name: 'Main Floor',
              level: 1,
              layouts: {
                create: {
                  name: 'Default Layout',
                  createdBy: req.user!.id,
                  isActive: true,
                },
              },
            },
          },
        },
        include: {
          floors: {
            include: {
              layouts: true,
            },
          },
        },
      });

      res.status(201).json({ restaurant });
    } catch (err) {
      next(err);
    }
  },
);

// GET / - list user's restaurants
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { ownerId: req.user!.id },
      include: {
        floors: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ restaurants });
  } catch (err) {
    next(err);
  }
});

// GET /:id - get restaurant with floors
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        floors: {
          orderBy: { level: 'asc' },
          include: {
            layouts: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    if (restaurant.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
});

export default router;
