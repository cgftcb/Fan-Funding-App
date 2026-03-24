import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
type ListingStatus = 'DRAFT' | 'ACTIVE' | 'FUNDED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
import { env } from '../config/env';
import * as escrowService from '../services/escrowService';
import * as notificationService from '../services/notificationService';

const prisma = new PrismaClient();

export async function createListing(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'PATIENT') {
      res.status(403).json({ error: 'Only patients can create listings' });
      return;
    }

    const {
      title,
      description,
      surgeryTypeId,
      goalAmount,
      deadline,
      surgeonName,
      surgeonOffice,
      surgeonContact,
      minContributionForPhotos,
      adminFeePercentOverride,
    } = req.body;

    if (!title || !surgeryTypeId || !goalAmount || !deadline) {
      res.status(400).json({ error: 'Title, surgery type, goal amount, and deadline are required' });
      return;
    }

    const parsedGoal = parseFloat(goalAmount);
    if (isNaN(parsedGoal) || parsedGoal <= 0) {
      res.status(400).json({ error: 'Goal amount must be a positive number' });
      return;
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      res.status(400).json({ error: 'Deadline must be in the future' });
      return;
    }

    const surgeryType = await prisma.surgeryType.findUnique({
      where: { id: surgeryTypeId, isActive: true },
    });

    if (!surgeryType) {
      res.status(404).json({ error: 'Surgery type not found or inactive' });
      return;
    }

    // Determine admin fee %
    let adminFeePercent = surgeryType.adminFeePercent || env.ADMIN_FEE_DEFAULT;
    if (adminFeePercentOverride !== undefined && (req.user.role as string) === 'ADMIN') {
      adminFeePercent = parseFloat(adminFeePercentOverride);
    }

    const adminFeeAmount = (parsedGoal * adminFeePercent) / 100;
    const totalGoal = parsedGoal + adminFeeAmount;

    // Insurance fee config
    const insuranceFeeConfig = await prisma.insuranceFeeConfig.findFirst({
      where: { surgeryTypeId, isDefault: false },
    }) || await prisma.insuranceFeeConfig.findFirst({
      where: { isDefault: true },
    });

    let insuranceFeeAmount = 0;
    if (insuranceFeeConfig) {
      if (insuranceFeeConfig.feeAmount) {
        insuranceFeeAmount = insuranceFeeConfig.feeAmount;
      } else if (insuranceFeeConfig.feePercent) {
        insuranceFeeAmount = (parsedGoal * insuranceFeeConfig.feePercent) / 100;
      }
    }

    const listing = await prisma.listing.create({
      data: {
        patientId: req.user.userId,
        surgeryTypeId,
        title,
        description: description || null,
        goalAmount: parsedGoal,
        adminFeePercent,
        adminFeeAmount,
        totalGoal,
        deadline: deadlineDate,
        status: 'DRAFT',
        surgeonName: surgeonName || null,
        surgeonOffice: surgeonOffice || null,
        surgeonContact: surgeonContact || null,
        minContributionForPhotos: parseFloat(minContributionForPhotos) || 0,
        insuranceFeeAmount,
        insuranceFeePaid: false,
      },
      include: {
        surgeryType: true,
        patient: { include: { profile: true } },
      },
    });

    res.status(201).json({ listing });
  } catch (error) {
    console.error('createListing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getListings(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;
    const surgeryTypeId = req.query.surgeryTypeId as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = { status: 'ACTIVE' };

    if (surgeryTypeId) {
      where.surgeryTypeId = surgeryTypeId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [listings, total] = await prisma.$transaction([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          surgeryType: true,
          patient: { include: { profile: true } },
          contributions: { where: { status: 'CONFIRMED' } },
          escrow: true,
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getListings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getListing(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        surgeryType: {
          include: { photoRequirements: true },
        },
        patient: { include: { profile: true } },
        contributions: {
          where: { status: 'CONFIRMED' },
          include: {
            contributor: { include: { profile: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        escrow: { include: { transactions: { orderBy: { createdAt: 'desc' } } } },
        agreement: true,
        pictures: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Filter pictures based on access
    let pictures = listing.pictures;
    if (req.user) {
      if (req.user.role === 'ADMIN' || req.user.userId === listing.patientId) {
        // Full access
      } else {
        // Check contribution qualification
        const contribution = await prisma.contribution.findFirst({
          where: {
            listingId: id,
            contributorId: req.user.userId,
            qualifiesForPhotos: true,
            status: 'CONFIRMED',
          },
        });

        if (!contribution) {
          // Only show before photos that are released
          pictures = pictures.filter(p => p.phase === 'BEFORE' && p.isReleased);
        }
      }
    } else {
      pictures = pictures.filter(p => p.phase === 'BEFORE' && p.isReleased);
    }

    res.json({ ...listing, pictures });
  } catch (error) {
    console.error('getListing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateListing(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Only patient owner or admin can update
    if (listing.patientId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized to update this listing' });
      return;
    }

    // Patients can only update DRAFT listings
    if (req.user.role !== 'ADMIN' && listing.status !== 'DRAFT') {
      res.status(400).json({ error: 'Can only update draft listings' });
      return;
    }

    const {
      title,
      description,
      surgeonName,
      surgeonOffice,
      surgeonContact,
      minContributionForPhotos,
      adminFeePercent,
      status,
    } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (surgeonName !== undefined) updateData.surgeonName = surgeonName;
    if (surgeonOffice !== undefined) updateData.surgeonOffice = surgeonOffice;
    if (surgeonContact !== undefined) updateData.surgeonContact = surgeonContact;
    if (minContributionForPhotos !== undefined) updateData.minContributionForPhotos = parseFloat(minContributionForPhotos);

    // Admin can update fee and status
    if (req.user.role === 'ADMIN') {
      if (adminFeePercent !== undefined) {
        updateData.adminFeePercent = parseFloat(adminFeePercent);
        updateData.adminFeeAmount = (listing.goalAmount * parseFloat(adminFeePercent)) / 100;
        updateData.totalGoal = listing.goalAmount + updateData.adminFeeAmount;
      }
      if (status !== undefined) updateData.status = status;
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: updateData,
      include: { surgeryType: true, patient: { include: { profile: true } } },
    });

    res.json({ listing: updated });
  } catch (error) {
    console.error('updateListing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function payInsuranceFee(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.patientId !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (listing.insuranceFeePaid) {
      res.status(400).json({ error: 'Insurance fee already paid' });
      return;
    }

    // Mark insurance fee paid and activate listing
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        insuranceFeePaid: true,
        status: 'ACTIVE',
      },
    });

    // Record insurance fee in escrow
    if (listing.insuranceFeeAmount > 0) {
      await escrowService.addFunds(id, listing.insuranceFeeAmount, 'INSURANCE_FEE', 'Patient insurance/listing fee');
    }

    res.json({ listing: updated, message: 'Insurance fee paid, listing is now active' });
  } catch (error) {
    console.error('payInsuranceFee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function checkAndExpireListings(): Promise<void> {
  try {
    const now = new Date();
    const expiredListings = await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        deadline: { lt: now },
      },
    });

    for (const listing of expiredListings) {
      const escrow = await prisma.escrow.findUnique({ where: { listingId: listing.id } });
      const totalContributed = escrow?.totalAmount ?? 0;

      if (totalContributed < listing.totalGoal) {
        // Goal not met - refund all
        const result = await escrowService.refundAll(listing.id);
        notificationService.notifyExpired(listing.id, result.refundedCount);
        console.log(`Listing ${listing.id} expired. Refunded ${result.refundedCount} contributions.`);
      }
    }
  } catch (error) {
    console.error('checkAndExpireListings error:', error);
  }
}

export async function fundedCheck(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { escrow: true },
    });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const escrowBalance = listing.escrow?.totalAmount ?? 0;

    if (escrowBalance >= listing.totalGoal && listing.status === 'ACTIVE') {
      const result = await escrowService.payToSurgeon(id);
      if (result.success) {
        notificationService.notifyGoalReached(listing.id, result.amount);
        res.json({ message: 'Goal reached! Funds released to surgeon.', amount: result.amount });
      } else {
        res.status(400).json({ error: 'Could not process payment' });
      }
    } else {
      res.json({
        message: 'Goal not yet reached',
        current: escrowBalance,
        goal: listing.totalGoal,
        remaining: listing.totalGoal - escrowBalance,
      });
    }
  } catch (error) {
    console.error('fundedCheck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function signAgreement(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { agreement: true },
    });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const now = new Date();
    let agreement = listing.agreement;

    if (!agreement) {
      // Create agreement
      agreement = await prisma.agreement.create({
        data: {
          listingId: id,
          terms: req.body.terms || 'Standard fan-funding agreement terms apply.',
          status: 'PENDING',
        },
      });
    }

    if (req.user.userId === listing.patientId) {
      // Patient signing
      const updatedAgreement = await prisma.agreement.update({
        where: { id: agreement.id },
        data: {
          patientSignedAt: now,
          status: agreement.surgeonSignedAt ? 'FULLY_SIGNED' : 'PATIENT_SIGNED',
        },
      });
      res.json({ agreement: updatedAgreement });
    } else {
      res.status(403).json({ error: 'Not authorized to sign this agreement' });
    }
  } catch (error) {
    console.error('signAgreement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMyListings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const listings = await prisma.listing.findMany({
      where: { patientId: req.user.userId },
      include: {
        surgeryType: true,
        contributions: { where: { status: 'CONFIRMED' } },
        escrow: true,
        agreement: true,
        pictures: { orderBy: { uploadedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ listings });
  } catch (error) {
    console.error('getMyListings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
