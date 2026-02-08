import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Get existing PlaidItems for an institution
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get('institutionId');
    const userId = searchParams.get('userId');

    if (!institutionId) {
      return NextResponse.json({ error: 'institutionId required' }, { status: 400 });
    }

    const whereClause: any = { institutionId };
    if (userId) {
      whereClause.userId = userId;
    }

    const items = await prisma.plaidItem.findMany({
      where: whereClause,
      include: {
        cards: {
          select: {
            id: true,
            plaidAccountId: true,
            name: true,
            last4: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching Plaid items:', error);
    return NextResponse.json({ error: 'Failed to fetch Plaid items' }, { status: 500 });
  }
}
