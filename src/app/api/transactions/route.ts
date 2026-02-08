import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface TransactionData {
  cardId: string;
  amount: string;
  merchantName: string;
  category?: string;
  transactionDate: string;
  pending?: boolean;
  description?: string;
}

// GET transactions for a specific card
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    
    if (!cardId) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }
    
    const transactions = await prisma.transaction.findMany({
      where: { cardId },
      orderBy: { transactionDate: 'desc' }
    });
    
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions', details: String(error) }, { status: 500 });
  }
}

// POST a new transaction
export async function POST(request: NextRequest) {
  try {
    const jsonData = await request.json();
    const data = jsonData as TransactionData;
    
    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        cardId: data.cardId,
        amount: parseFloat(data.amount),
        merchantName: data.merchantName,
        category: data.category || 'Other',
        transactionDate: new Date(data.transactionDate),
        pending: data.pending || false,
        description: data.description || null,
      }
    });
    
    // Update the card's currentSpent
    await prisma.card.update({
      where: { id: data.cardId },
      data: {
        currentSpent: {
          increment: parseFloat(data.amount)
        }
      }
    });
    
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction', details: String(error) }, { status: 500 });
  }
}

// DELETE a transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }
    
    // Get the transaction to know the amount and cardId
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Delete the transaction and update card's currentSpent
    await prisma.$transaction([
      prisma.transaction.delete({
        where: { id: transactionId }
      }),
      prisma.card.update({
        where: { id: transaction.cardId },
        data: {
          currentSpent: {
            decrement: transaction.amount
          }
        }
      })
    ]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction', details: String(error) }, { status: 500 });
  }
}
