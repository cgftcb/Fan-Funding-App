import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import * as notificationService from '../services/notificationService';

const prisma = new PrismaClient();

export async function uploadPicture(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { listingId } = req.params;
    const { phase, requirementId } = req.body;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!phase || !['BEFORE', 'AFTER'].includes(phase)) {
      res.status(400).json({ error: 'Phase must be BEFORE or AFTER' });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Only patient owner or admin can upload
    if (req.user.userId !== listing.patientId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized to upload photos for this listing' });
      return;
    }

    // BEFORE photos: listing must be DRAFT or ACTIVE
    // AFTER photos: listing must be FUNDED or COMPLETED
    if (phase === 'AFTER' && !['FUNDED', 'COMPLETED'].includes(listing.status)) {
      res.status(400).json({ error: 'After photos can only be uploaded after surgery is funded and completed' });
      return;
    }

    const picture = await prisma.picture.create({
      data: {
        listingId,
        uploadedBy: req.user.userId,
        phase: phase as any,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        requirementId: requirementId || null,
        isReleased: phase === 'BEFORE', // Before photos are released immediately
      },
    });

    // Check photo compliance for after photos
    if (phase === 'AFTER') {
      await checkAndReleasePictures(listingId);
    }

    res.status(201).json({ picture });
  } catch (error) {
    console.error('uploadPicture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkAndReleasePictures(listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      surgeryType: {
        include: { photoRequirements: true },
      },
      pictures: true,
    },
  });

  if (!listing) return;

  const afterRequirements = listing.surgeryType.photoRequirements.filter(r => r.phase === 'AFTER');
  if (afterRequirements.length === 0) {
    // No requirements - release all after photos
    await prisma.picture.updateMany({
      where: { listingId, phase: 'AFTER' },
      data: { isReleased: true },
    });
    notificationService.notifyPhotosReleased(listingId);
    return;
  }

  // Check if all requirements are met
  const afterPictures = listing.pictures.filter(p => p.phase === 'AFTER');
  const totalRequired = afterRequirements.reduce((sum, r) => sum + r.count, 0);

  if (afterPictures.length >= totalRequired) {
    await prisma.picture.updateMany({
      where: { listingId, phase: 'AFTER' },
      data: { isReleased: true },
    });
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'COMPLETED' },
    });
    notificationService.notifyPhotosReleased(listingId);
  }
}

export async function getPicture(req: Request, res: Response): Promise<void> {
  try {
    const { pictureId } = req.params;

    const picture = await prisma.picture.findUnique({
      where: { id: pictureId },
      include: { listing: true },
    });

    if (!picture) {
      res.status(404).json({ error: 'Picture not found' });
      return;
    }

    // Check access
    let hasAccess = false;

    if (req.user) {
      if (req.user.role === 'ADMIN') {
        hasAccess = true;
      } else if (req.user.userId === picture.listing.patientId) {
        hasAccess = true;
      } else if (picture.phase === 'BEFORE' && picture.isReleased) {
        hasAccess = true;
      } else if (picture.phase === 'AFTER' && picture.isReleased) {
        // Check if contributor qualifies
        const contribution = await prisma.contribution.findFirst({
          where: {
            listingId: picture.listingId,
            contributorId: req.user.userId,
            qualifiesForPhotos: true,
            status: 'CONFIRMED',
          },
        });
        hasAccess = !!contribution;
      }
    } else if (picture.phase === 'BEFORE' && picture.isReleased) {
      hasAccess = true;
    }

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const filePath = path.join(env.UPLOADS_DIR, 'pictures', picture.filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Security headers to prevent downloading/screenshots
    res.setHeader('Content-Type', picture.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    res.sendFile(filePath);
  } catch (error) {
    console.error('getPicture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getListingPictures(req: Request, res: Response): Promise<void> {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    let whereClause: any = { listingId };

    if (!req.user) {
      // Public: only released before photos
      whereClause.phase = 'BEFORE';
      whereClause.isReleased = true;
    } else if (req.user.role !== 'ADMIN' && req.user.userId !== listing.patientId) {
      // Check contribution qualification for after photos
      const contribution = await prisma.contribution.findFirst({
        where: {
          listingId,
          contributorId: req.user.userId,
          qualifiesForPhotos: true,
          status: 'CONFIRMED',
        },
      });

      if (!contribution) {
        whereClause.phase = 'BEFORE';
        whereClause.isReleased = true;
      }
    }

    const pictures = await prisma.picture.findMany({
      where: whereClause,
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ pictures });
  } catch (error) {
    console.error('getListingPictures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function releasePictures(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }

    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    await prisma.picture.updateMany({
      where: { listingId, phase: 'AFTER' },
      data: { isReleased: true },
    });

    notificationService.notifyPhotosReleased(listingId);

    res.json({ message: 'After photos released successfully' });
  } catch (error) {
    console.error('releasePictures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
