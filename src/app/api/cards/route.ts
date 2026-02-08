import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface CardData {
  id?: string;
  name: string;
  issuer: string;
  last4?: string;
  bonusAmount: string;
  bonusType: string;
  spendingRequired: string;
  deadline: string;
  bonusEarned?: boolean;
}

export async function GET() {
  try {
    const cards = await prisma.card.findMany({
      orderBy: { deadline: 'asc' },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 5 // Include last 5 transactions
        }
      }
    });
    
    // Calculate progress for each card
    const cardsWithProgress = cards.map((card) => ({
      ...card,
      progress: (card.currentSpent / card.spendingRequired) * 100,
      daysRemaining: Math.ceil((new Date(card.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      transactionCount: card.transactions.length,
      recentTransactions: card.transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        merchantName: t.merchantName,
        category: t.category,
        transactionDate: t.transactionDate.toISOString(),
        pending: t.pending,
        description: t.description
      }))
    }));
    
    return NextResponse.json(cardsWithProgress);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const jsonData = await request.json();
    const data = jsonData as CardData;
    
    // Create a temporary user for now (we'll add auth later)
    const user = await prisma.user.upsert({
      where: { email: 'temp@example.com' },
      update: {},
      create: {
        email: 'temp@example.com',
        name: 'Temp User'
      }
    });
    
    const card = await prisma.card.create({
      data: {
        userId: user.id,
        name: data.name,
        issuer: data.issuer,
        last4: data.last4 || '',
        bonusAmount: parseInt(data.bonusAmount),
        bonusType: data.bonusType,
        spendingRequired: parseFloat(data.spendingRequired),
        deadline: new Date(data.deadline),
      }
    });
    
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json({ error: 'Failed to create card', details: String(error) }, { status: 500 });
  }
}

// DELETE a card
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('id');
    
    if (!cardId) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }
    
    await prisma.card.delete({
      where: { id: cardId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json({ error: 'Failed to delete card', details: String(error) }, { status: 500 });
  }
}

// PUT (update) a card
export async function PUT(request: NextRequest) {
  try {
    const jsonData = await request.json();
    const data = jsonData as CardData;
    
    if (!data.id) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }
    
    const card = await prisma.card.update({
      where: { id: data.id },
      data: {
        name: data.name,
        issuer: data.issuer,
        last4: data.last4 || '',
        bonusAmount: parseInt(data.bonusAmount),
        bonusType: data.bonusType,
        spendingRequired: parseFloat(data.spendingRequired),
        deadline: new Date(data.deadline),
        bonusEarned: data.bonusEarned || false,
      }
    });
    
    return NextResponse.json(card);
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json({ error: 'Failed to update card', details: String(error) }, { status: 500 });
  }
}
