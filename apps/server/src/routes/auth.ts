import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { excludeFields } from '../utils/helpers';
import { loginSchema, registerSchema } from '@rfm/shared';

const router = Router();

interface TokenUser {
  id: string;
  email: string;
  role: string;
}

function generateAccessToken(user: TokenUser): string {
  const options: jwt.SignOptions = { expiresIn: '15m' };
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    options,
  );
}

function generateRefreshToken(user: TokenUser): string {
  const options: jwt.SignOptions = { expiresIn: '7d' };
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_REFRESH_SECRET,
    options,
  );
}

// POST /register
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, role } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new AppError('A user with this email already exists', 409);
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
        },
      });

      const safeUser = excludeFields(user as unknown as Record<string, unknown>, ['password']);

      const tokens = {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
      };

      res.status(201).json({ user: safeUser, tokens });
    } catch (err) {
      next(err);
    }
  },
);

// POST /login
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      if (!user.active) {
        throw new AppError('Account has been deactivated', 403);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      const safeUser = excludeFields(user as unknown as Record<string, unknown>, ['password']);

      const tokens = {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
      };

      res.json({ user: safeUser, tokens });
    } catch (err) {
      next(err);
    }
  },
);

// POST /refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.active) {
      throw new AppError('User not found or deactivated', 401);
    }

    const accessToken = generateAccessToken(user);

    res.json({ accessToken });
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid refresh token', 401));
      return;
    }
    next(err);
  }
});

// GET /me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const safeUser = excludeFields(user as unknown as Record<string, unknown>, ['password']);

    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

export default router;
