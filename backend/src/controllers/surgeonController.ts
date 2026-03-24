import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getSurgeonProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const profile = await prisma.surgeonProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: { include: { profile: true } },
        subscriptions: {
          include: { tier: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!profile) {
      res.status(404).json({ error: 'Surgeon profile not found' });
      return;
    }

    res.json({ profile });
  } catch (error) {
    console.error('getSurgeonProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSurgeonProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'SURGEON') {
      res.status(403).json({ error: 'Surgeon access required' });
      return;
    }

    const { licenseNumber, specialty, officeName, officeAddress, phone, website, bio } = req.body;

    const profile = await prisma.surgeonProfile.upsert({
      where: { userId: req.user.userId },
      update: {
        licenseNumber: licenseNumber !== undefined ? licenseNumber : undefined,
        specialty: specialty !== undefined ? specialty : undefined,
        officeName: officeName !== undefined ? officeName : undefined,
        officeAddress: officeAddress !== undefined ? officeAddress : undefined,
        phone: phone !== undefined ? phone : undefined,
        website: website !== undefined ? website : undefined,
        bio: bio !== undefined ? bio : undefined,
      },
      create: {
        userId: req.user.userId,
        licenseNumber: licenseNumber || null,
        specialty: specialty || null,
        officeName: officeName || null,
        officeAddress: officeAddress || null,
        phone: phone || null,
        website: website || null,
        bio: bio || null,
      },
      include: {
        user: { include: { profile: true } },
        subscriptions: {
          include: { tier: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('updateSurgeonProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function subscribe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'SURGEON') {
      res.status(403).json({ error: 'Surgeon access required' });
      return;
    }

    const { tierId } = req.body;

    if (!tierId) {
      res.status(400).json({ error: 'Subscription tier ID required' });
      return;
    }

    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId, isActive: true },
    });

    if (!tier) {
      res.status(404).json({ error: 'Subscription tier not found or inactive' });
      return;
    }

    const surgeonProfile = await prisma.surgeonProfile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!surgeonProfile) {
      res.status(404).json({ error: 'Surgeon profile not found' });
      return;
    }

    // Cancel any existing active subscriptions
    await prisma.surgeonSubscription.updateMany({
      where: {
        surgeonId: surgeonProfile.id,
        status: 'ACTIVE',
      },
      data: { status: 'CANCELLED' },
    });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + tier.durationDays);

    const subscription = await prisma.surgeonSubscription.create({
      data: {
        surgeonId: surgeonProfile.id,
        tierId,
        startDate,
        endDate,
        status: 'ACTIVE',
        amount: tier.price,
      },
      include: { tier: true },
    });

    // Mark surgeon as subscribed
    await prisma.surgeonProfile.update({
      where: { id: surgeonProfile.id },
      data: { isSubscribed: true },
    });

    res.status(201).json({
      subscription,
      message: `Successfully subscribed to ${tier.name} plan until ${endDate.toLocaleDateString()}`,
    });
  } catch (error) {
    console.error('subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSuggestedSurgeons(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();

    const surgeons = await prisma.surgeonProfile.findMany({
      where: {
        isSubscribed: true,
        subscriptions: {
          some: {
            status: 'ACTIVE',
            endDate: { gte: now },
          },
        },
      },
      include: {
        user: { include: { profile: true } },
        subscriptions: {
          where: {
            status: 'ACTIVE',
            endDate: { gte: now },
          },
          include: { tier: true },
          take: 1,
        },
      },
      take: 10,
    });

    res.json({ surgeons });
  } catch (error) {
    console.error('getSuggestedSurgeons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function signAgreement(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'SURGEON') {
      res.status(403).json({ error: 'Surgeon access required' });
      return;
    }

    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { agreement: true },
    });

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Verify this surgeon is associated with the listing
    const surgeonProfile = await prisma.surgeonProfile.findUnique({
      where: { userId: req.user.userId },
      include: { user: { include: { profile: true } } },
    });

    if (!surgeonProfile) {
      res.status(404).json({ error: 'Surgeon profile not found' });
      return;
    }

    const surgeonName = surgeonProfile.user.profile?.fullName || '';
    const isAssociated =
      listing.surgeonName?.toLowerCase().includes(surgeonName.toLowerCase()) ||
      listing.surgeonOffice?.toLowerCase().includes(surgeonProfile.officeName?.toLowerCase() || '');

    if (!isAssociated && (req.user.role as string) !== 'ADMIN') {
      res.status(403).json({ error: 'You are not the designated surgeon for this listing' });
      return;
    }

    const now = new Date();
    let agreement = listing.agreement;

    if (!agreement) {
      agreement = await prisma.agreement.create({
        data: {
          listingId,
          terms: req.body.terms || 'Standard fan-funding surgical agreement terms apply.',
          status: 'PENDING',
        },
      });
    }

    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        surgeonSignedAt: now,
        consultationDocUrl: req.body.consultationDocUrl || agreement.consultationDocUrl,
        status: agreement.patientSignedAt ? 'FULLY_SIGNED' : 'SURGEON_SIGNED',
      },
    });

    res.json({ agreement: updatedAgreement });
  } catch (error) {
    console.error('surgeon signAgreement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSurgeonListings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'SURGEON') {
      res.status(403).json({ error: 'Surgeon access required' });
      return;
    }

    const surgeonProfile = await prisma.surgeonProfile.findUnique({
      where: { userId: req.user.userId },
      include: { user: { include: { profile: true } } },
    });

    if (!surgeonProfile) {
      res.status(404).json({ error: 'Surgeon profile not found' });
      return;
    }

    const surgeonName = surgeonProfile.user.profile?.fullName || '';
    const officeName = surgeonProfile.officeName || '';

    const listings = await prisma.listing.findMany({
      where: {
        OR: [
          { surgeonName: { contains: surgeonName } },
          { surgeonOffice: { contains: officeName } },
        ],
      },
      include: {
        patient: { include: { profile: true } },
        surgeryType: true,
        agreement: true,
        escrow: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ listings });
  } catch (error) {
    console.error('getSurgeonListings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
