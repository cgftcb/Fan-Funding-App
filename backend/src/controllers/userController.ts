import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const prisma = new PrismaClient();

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        profile: true,
        surgeonProfile: {
          include: {
            subscriptions: {
              include: { tier: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      surgeonProfile: user.surgeonProfile,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { fullName, bio, location, socialLinks } = req.body;

    const profile = await prisma.profile.upsert({
      where: { userId: req.user.userId },
      update: {
        fullName: fullName || undefined,
        bio: bio !== undefined ? bio : undefined,
        location: location !== undefined ? location : undefined,
        socialLinks: socialLinks ? JSON.stringify(socialLinks) : undefined,
      },
      create: {
        userId: req.user.userId,
        fullName: fullName || 'User',
        bio: bio || null,
        location: location || null,
        socialLinks: socialLinks ? JSON.stringify(socialLinks) : null,
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Delete old avatar if it exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
    });

    if (existingProfile?.avatarUrl) {
      const oldPath = path.join(env.UPLOADS_DIR, existingProfile.avatarUrl.replace('/uploads/', ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const profile = await prisma.profile.upsert({
      where: { userId: req.user.userId },
      update: { avatarUrl },
      create: {
        userId: req.user.userId,
        fullName: 'User',
        avatarUrl,
      },
    });

    res.json({ profile, avatarUrl });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
