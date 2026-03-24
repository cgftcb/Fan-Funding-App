import { PrismaClient } from '@prisma/client';

type EscrowTransactionType = 'CONTRIBUTION' | 'ADMIN_FEE' | 'SURGEON_PAYMENT' | 'REFUND' | 'INSURANCE_FEE';

const prisma = new PrismaClient();

export async function addFunds(
  listingId: string,
  amount: number,
  type: EscrowTransactionType,
  description?: string
): Promise<void> {
  const escrow = await prisma.escrow.findUnique({ where: { listingId } });

  if (!escrow) {
    // Create escrow if it doesn't exist
    await prisma.escrow.create({
      data: {
        listingId,
        totalAmount: amount,
        transactions: {
          create: {
            amount,
            type,
            description: description || `${type} transaction`,
          },
        },
      },
    });
  } else {
    await prisma.$transaction([
      prisma.escrow.update({
        where: { listingId },
        data: { totalAmount: { increment: amount } },
      }),
      prisma.escrowTransaction.create({
        data: {
          escrowId: escrow.id,
          amount,
          type,
          description: description || `${type} transaction`,
        },
      }),
    ]);
  }
}

export async function getBalance(listingId: string): Promise<number> {
  const escrow = await prisma.escrow.findUnique({ where: { listingId } });
  return escrow?.totalAmount ?? 0;
}

export async function payToSurgeon(listingId: string): Promise<{ success: boolean; amount: number }> {
  const escrow = await prisma.escrow.findUnique({
    where: { listingId },
    include: { transactions: true },
  });

  if (!escrow) {
    return { success: false, amount: 0 };
  }

  if (escrow.status !== 'HOLDING') {
    return { success: false, amount: 0 };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return { success: false, amount: 0 };
  }

  const paymentAmount = listing.goalAmount; // Pay surgeon the base goal (not admin fee)

  await prisma.$transaction([
    prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: 'PAID_TO_SURGEON' },
    }),
    prisma.escrowTransaction.create({
      data: {
        escrowId: escrow.id,
        amount: paymentAmount,
        type: 'SURGEON_PAYMENT',
        description: `Payment to surgeon for listing ${listingId}`,
      },
    }),
    prisma.listing.update({
      where: { id: listingId },
      data: { status: 'FUNDED' },
    }),
  ]);

  return { success: true, amount: paymentAmount };
}

export async function refundAll(listingId: string): Promise<{ success: boolean; refundedCount: number }> {
  const escrow = await prisma.escrow.findUnique({ where: { listingId } });

  if (!escrow || escrow.status !== 'HOLDING') {
    return { success: false, refundedCount: 0 };
  }

  const contributions = await prisma.contribution.findMany({
    where: { listingId, status: 'CONFIRMED' },
  });

  if (contributions.length === 0) {
    await prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: 'REFUNDED' },
    });
    return { success: true, refundedCount: 0 };
  }

  const refundTransactions = contributions.map((c) => ({
    escrowId: escrow.id,
    amount: c.amount,
    type: 'REFUND' as EscrowTransactionType,
    description: `Refund to contributor ${c.contributorId} for expired listing`,
  }));

  await prisma.$transaction([
    prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: 'REFUNDED', totalAmount: 0 },
    }),
    prisma.escrowTransaction.createMany({ data: refundTransactions }),
    prisma.contribution.updateMany({
      where: { listingId, status: 'CONFIRMED' },
      data: { status: 'REFUNDED' },
    }),
    prisma.listing.update({
      where: { id: listingId },
      data: { status: 'EXPIRED' },
    }),
  ]);

  return { success: true, refundedCount: contributions.length };
}

export async function getEscrowDetails(listingId: string) {
  return prisma.escrow.findUnique({
    where: { listingId },
    include: {
      transactions: { orderBy: { createdAt: 'desc' } },
    },
  });
}
