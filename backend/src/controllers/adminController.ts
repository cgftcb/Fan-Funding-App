import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getSurgeryTypes(req: Request, res: Response): Promise<void> {
  try {
    const surgeryTypes = await prisma.surgeryType.findMany({
      include: {
        photoRequirements: true,
        insuranceFeeConfigs: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ surgeryTypes });
  } catch (error) {
    console.error('getSurgeryTypes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSurgeryType(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, adminFeePercent, photoRequirements, isActive } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Surgery type name is required' });
      return;
    }

    const surgeryType = await prisma.surgeryType.create({
      data: {
        name,
        description: description || null,
        adminFeePercent: parseFloat(adminFeePercent) || 10,
        isActive: isActive !== undefined ? isActive : true,
        photoRequirements: photoRequirements
          ? {
              create: photoRequirements.map((req: any) => ({
                phase: req.phase,
                count: parseInt(req.count) || 1,
                description: req.description || null,
                daysAfterSurgery: req.daysAfterSurgery ? parseInt(req.daysAfterSurgery) : null,
              })),
            }
          : undefined,
      },
      include: { photoRequirements: true },
    });

    res.status(201).json({ surgeryType });
  } catch (error: any) {
    console.error('createSurgeryType error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Surgery type name already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSurgeryType(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, adminFeePercent, isActive, photoRequirements } = req.body;

    const exists = await prisma.surgeryType.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: 'Surgery type not found' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (adminFeePercent !== undefined) updateData.adminFeePercent = parseFloat(adminFeePercent);
    if (isActive !== undefined) updateData.isActive = isActive;

    // If photo requirements provided, replace them
    if (photoRequirements) {
      await prisma.photoRequirement.deleteMany({ where: { surgeryTypeId: id } });
      updateData.photoRequirements = {
        create: photoRequirements.map((req: any) => ({
          phase: req.phase,
          count: parseInt(req.count) || 1,
          description: req.description || null,
          daysAfterSurgery: req.daysAfterSurgery ? parseInt(req.daysAfterSurgery) : null,
        })),
      };
    }

    const surgeryType = await prisma.surgeryType.update({
      where: { id },
      data: updateData,
      include: { photoRequirements: true },
    });

    res.json({ surgeryType });
  } catch (error) {
    console.error('updateSurgeryType error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function setListingAdminFee(req: Request, res: Response): Promise<void> {
  try {
    const { listingId } = req.params;
    const { adminFeePercent } = req.body;

    if (adminFeePercent === undefined || isNaN(parseFloat(adminFeePercent))) {
      res.status(400).json({ error: 'Valid admin fee percent required' });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const newFeePercent = parseFloat(adminFeePercent);
    const newAdminFeeAmount = (listing.goalAmount * newFeePercent) / 100;
    const newTotalGoal = listing.goalAmount + newAdminFeeAmount;

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        adminFeePercent: newFeePercent,
        adminFeeAmount: newAdminFeeAmount,
        totalGoal: newTotalGoal,
      },
    });

    res.json({ listing: updated });
  } catch (error) {
    console.error('setListingAdminFee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSubscriptionTiers(req: Request, res: Response): Promise<void> {
  try {
    const tiers = await prisma.subscriptionTier.findMany({
      orderBy: { price: 'asc' },
    });
    res.json({ tiers });
  } catch (error) {
    console.error('getSubscriptionTiers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSubscriptionTier(req: Request, res: Response): Promise<void> {
  try {
    const { name, price, durationDays, features, isActive } = req.body;

    if (!name || price === undefined || !durationDays) {
      res.status(400).json({ error: 'Name, price, and duration are required' });
      return;
    }

    const tier = await prisma.subscriptionTier.create({
      data: {
        name,
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
        features: JSON.stringify(features || []),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({ tier });
  } catch (error: any) {
    console.error('createSubscriptionTier error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Tier name already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSubscriptionTier(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, price, durationDays, features, isActive } = req.body;

    const exists = await prisma.subscriptionTier.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: 'Subscription tier not found' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (durationDays !== undefined) updateData.durationDays = parseInt(durationDays);
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (isActive !== undefined) updateData.isActive = isActive;

    const tier = await prisma.subscriptionTier.update({
      where: { id },
      data: updateData,
    });

    res.json({ tier });
  } catch (error) {
    console.error('updateSubscriptionTier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [
      totalUsers,
      totalListings,
      activeListings,
      totalContributions,
      totalEscrow,
      pendingAgreements,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.contribution.aggregate({
        _sum: { amount: true },
        where: { status: 'CONFIRMED' },
      }),
      prisma.escrow.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'HOLDING' },
      }),
      prisma.agreement.count({ where: { status: { not: 'FULLY_SIGNED' } } }),
    ]);

    const byRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const byListingStatus = await prisma.listing.groupBy({
      by: ['status'],
      _count: true,
    });

    const recentListings = await prisma.listing.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { include: { profile: true } },
        surgeryType: true,
      },
    });

    res.json({
      stats: {
        totalUsers,
        totalListings,
        activeListings,
        totalContributed: totalContributions._sum.amount || 0,
        totalEscrowHolding: totalEscrow._sum.totalAmount || 0,
        pendingAgreements,
      },
      byRole,
      byListingStatus,
      recentListings,
    });
  } catch (error) {
    console.error('getDashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllListings(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) where.status = status;

    const [listings, total] = await prisma.$transaction([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { include: { profile: true } },
          surgeryType: true,
          contributions: { where: { status: 'CONFIRMED' } },
          escrow: true,
          agreement: true,
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      listings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('getAllListings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const role = req.query.role as string | undefined;

    const where: any = {};
    if (role) where.role = role;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          surgeonProfile: true,
          _count: {
            select: {
              listings: true,
              contributions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Remove password hashes from response
    const safeUsers = users.map(({ passwordHash, ...user }) => user);

    res.json({
      users: safeUsers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleInsuranceClaim(req: Request, res: Response): Promise<void> {
  try {
    const { listingId } = req.params;
    const { reason } = req.body;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { escrow: true },
    });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (!listing.insuranceFeePaid || listing.insuranceFeeAmount <= 0) {
      res.status(400).json({ error: 'No insurance fee on this listing' });
      return;
    }

    // Mark listing as cancelled due to non-compliance
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'CANCELLED' },
    });

    console.log(`Insurance claim processed for listing ${listingId}. Reason: ${reason || 'Patient non-compliance'}`);

    res.json({
      message: 'Insurance claim processed. Listing cancelled due to non-compliance.',
      listingId,
      insuranceFeeAmount: listing.insuranceFeeAmount,
    });
  } catch (error) {
    console.error('handleInsuranceClaim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getInsuranceFeeConfigs(req: Request, res: Response): Promise<void> {
  try {
    const configs = await prisma.insuranceFeeConfig.findMany({
      include: { surgeryType: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ configs });
  } catch (error) {
    console.error('getInsuranceFeeConfigs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createInsuranceFeeConfig(req: Request, res: Response): Promise<void> {
  try {
    const { surgeryTypeId, feeAmount, feePercent, description, isDefault } = req.body;

    const config = await prisma.insuranceFeeConfig.create({
      data: {
        surgeryTypeId: surgeryTypeId || null,
        feeAmount: feeAmount ? parseFloat(feeAmount) : null,
        feePercent: feePercent ? parseFloat(feePercent) : 5,
        description: description || null,
        isDefault: isDefault || false,
      },
      include: { surgeryType: true },
    });

    res.status(201).json({ config });
  } catch (error) {
    console.error('createInsuranceFeeConfig error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
