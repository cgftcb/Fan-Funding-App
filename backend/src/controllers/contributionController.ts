import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as escrowService from '../services/escrowService';
import * as notificationService from '../services/notificationService';

const prisma = new PrismaClient();

export async function contribute(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== 'CONTRIBUTOR' && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only contributors can make contributions' });
      return;
    }

    const { listingId } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      res.status(400).json({ error: 'Valid contribution amount is required' });
      return;
    }

    const parsedAmount = parseFloat(amount);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { escrow: true },
    });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Listing is not accepting contributions' });
      return;
    }

    if (new Date(listing.deadline) < new Date()) {
      res.status(400).json({ error: 'Listing deadline has passed' });
      return;
    }

    // Check if contributor already contributed
    const existingContribution = await prisma.contribution.findFirst({
      where: {
        listingId,
        contributorId: req.user.userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    const totalContributionAmount = existingContribution
      ? existingContribution.amount + parsedAmount
      : parsedAmount;

    const qualifiesForPhotos = listing.minContributionForPhotos > 0
      ? totalContributionAmount >= listing.minContributionForPhotos
      : true;

    let contribution;
    if (existingContribution) {
      // Update existing contribution
      contribution = await prisma.contribution.update({
        where: { id: existingContribution.id },
        data: {
          amount: totalContributionAmount,
          qualifiesForPhotos,
          status: 'CONFIRMED',
        },
        include: { contributor: { include: { profile: true } } },
      });
    } else {
      contribution = await prisma.contribution.create({
        data: {
          listingId,
          contributorId: req.user.userId,
          amount: parsedAmount,
          status: 'CONFIRMED',
          qualifiesForPhotos,
        },
        include: { contributor: { include: { profile: true } } },
      });
    }

    // Add funds to escrow
    await escrowService.addFunds(listingId, parsedAmount, 'CONTRIBUTION', `Contribution from ${req.user.email}`);

    // Check if goal is reached
    const newBalance = await escrowService.getBalance(listingId);
    if (newBalance >= listing.totalGoal) {
      const result = await escrowService.payToSurgeon(listingId);
      if (result.success) {
        notificationService.notifyGoalReached(listingId, result.amount);
      }
    }

    res.status(201).json({
      contribution,
      qualifiesForPhotos,
      message: qualifiesForPhotos
        ? 'Contribution successful! You qualify for photo access.'
        : `Contribution successful! Contribute ${listing.minContributionForPhotos - totalContributionAmount} more to qualify for photos.`,
    });
  } catch (error) {
    console.error('contribute error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMyContributions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const contributions = await prisma.contribution.findMany({
      where: { contributorId: req.user.userId },
      include: {
        listing: {
          include: {
            surgeryType: true,
            patient: { include: { profile: true } },
            escrow: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ contributions });
  } catch (error) {
    console.error('getMyContributions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getListingContributions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Only patient owner or admin can see all contributions
    if (req.user.userId !== listing.patientId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const contributions = await prisma.contribution.findMany({
      where: { listingId },
      include: {
        contributor: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: contributions.reduce((sum, c) => sum + c.amount, 0),
      count: contributions.length,
      qualifying: contributions.filter(c => c.qualifiesForPhotos).length,
    };

    res.json({ contributions, stats });
  } catch (error) {
    console.error('getListingContributions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
