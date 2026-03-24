import { PrismaClient } from '@prisma/client';
import app from './app';
import { env } from './config/env';
import { checkAndExpireListings } from './controllers/listingController';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Database connected successfully');

    // Seed default admin if not exists
    await seedAdmin();

    // Start server
    const server = app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    });

    // Periodic check for expired listings (every hour)
    const expiryInterval = setInterval(async () => {
      console.log('[CRON] Checking for expired listings...');
      await checkAndExpireListings();
    }, 60 * 60 * 1000);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      clearInterval(expiryInterval);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      clearInterval(expiryInterval);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Process terminated');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function seedAdmin(): Promise<void> {
  try {
    const bcrypt = await import('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fanfunding.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!';

    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          profile: {
            create: {
              fullName: 'System Admin',
              bio: 'Platform administrator',
            },
          },
        },
      });
      console.log(`Admin account created: ${adminEmail}`);
    }

    // Seed default subscription tiers if none exist
    const tierCount = await prisma.subscriptionTier.count();
    if (tierCount === 0) {
      await prisma.subscriptionTier.createMany({
        data: [
          {
            name: 'Basic',
            price: 49.99,
            durationDays: 30,
            features: JSON.stringify(['Profile listing', 'Patient discovery', 'Basic analytics']),
            isActive: true,
          },
          {
            name: 'Professional',
            price: 99.99,
            durationDays: 30,
            features: JSON.stringify([
              'Profile listing',
              'Patient discovery',
              'Advanced analytics',
              'Priority placement',
              'Consultation booking',
            ]),
            isActive: true,
          },
          {
            name: 'Premium',
            price: 199.99,
            durationDays: 30,
            features: JSON.stringify([
              'Profile listing',
              'Patient discovery',
              'Advanced analytics',
              'Top placement',
              'Consultation booking',
              'Featured badge',
              'Dedicated support',
            ]),
            isActive: true,
          },
        ],
      });
      console.log('Default subscription tiers created');
    }

    // Seed default surgery types if none exist
    const surgeryTypeCount = await prisma.surgeryType.count();
    if (surgeryTypeCount === 0) {
      const types = [
        { name: 'Rhinoplasty', description: 'Nose reshaping surgery', adminFeePercent: 10 },
        { name: 'Breast Augmentation', description: 'Breast implant surgery', adminFeePercent: 10 },
        { name: 'Liposuction', description: 'Fat removal procedure', adminFeePercent: 10 },
        { name: 'Facelift', description: 'Facial rejuvenation surgery', adminFeePercent: 12 },
        { name: 'Tummy Tuck', description: 'Abdominoplasty procedure', adminFeePercent: 10 },
        { name: 'Blepharoplasty', description: 'Eyelid surgery', adminFeePercent: 10 },
        { name: 'Brow Lift', description: 'Forehead lift surgery', adminFeePercent: 10 },
        { name: 'Breast Reduction', description: 'Breast reduction surgery', adminFeePercent: 10 },
        { name: 'Brazilian Butt Lift', description: 'BBL procedure', adminFeePercent: 12 },
        { name: 'Otoplasty', description: 'Ear surgery', adminFeePercent: 10 },
      ];

      for (const type of types) {
        await prisma.surgeryType.create({
          data: {
            ...type,
            isActive: true,
            photoRequirements: {
              create: [
                { phase: 'BEFORE', count: 3, description: 'Front, side, and three-quarter view before photos' },
                {
                  phase: 'AFTER',
                  count: 3,
                  description: 'Front, side, and three-quarter view after photos',
                  daysAfterSurgery: 90,
                },
              ],
            },
          },
        });
      }
      console.log('Default surgery types created');
    }

    // Seed default insurance fee config
    const insuranceCount = await prisma.insuranceFeeConfig.count();
    if (insuranceCount === 0) {
      await prisma.insuranceFeeConfig.create({
        data: {
          feePercent: 5,
          description: 'Default insurance/listing fee (5% of goal amount)',
          isDefault: true,
        },
      });
      console.log('Default insurance fee config created');
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
}

main();
