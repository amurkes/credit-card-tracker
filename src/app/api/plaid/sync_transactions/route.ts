import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import prisma from '@/lib/prisma';

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox as string,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID ?? '',
      'PLAID-SECRET': process.env.PLAID_SECRET ?? '',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

interface SyncTransactionsRequest {
  cardId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SyncTransactionsRequest;
    const { cardId } = body;
    
    // Get the card with its PlaidItem
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { plaidItem: true }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (!card.plaidItem) {
      return NextResponse.json({ error: 'Card not linked to Plaid' }, { status: 400 });
    }

    const accessToken = card.plaidItem.accessToken;
    const plaidAccountId = card.plaidAccountId;

    if (!plaidAccountId) {
      return NextResponse.json({ error: 'Card not linked to a Plaid account' }, { status: 400 });
    }

    // Calculate date range (last 90 days)
    const endDate = new Date().toISOString().split('T')[0] as string;
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string;
    
    // Fetch transactions from Plaid
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 500,
        offset: 0,
      },
    });
    
    // Filter transactions for this account
    const accountTransactions = response.data.transactions.filter(
      tx => tx.account_id === plaidAccountId
    );

    // Get existing transactions to avoid duplicates
    const existingTransactions = await prisma.transaction.findMany({
      where: { cardId: cardId }
    });

    const existingExternalIds = new Set(
      existingTransactions.map(t => t.description || '').filter(Boolean)
    );

    // Create new transactions
    let newCount = 0;
    for (const tx of accountTransactions) {
      const externalId = tx.transaction_id || tx.name;
      if (!existingExternalIds.has(externalId)) {
        await prisma.transaction.create({
          data: {
            cardId: cardId,
            amount: Math.abs(tx.amount),
            merchantName: tx.merchant_name || tx.name,
            category: tx.category?.[0] || 'Other',
            transactionDate: new Date(tx.date),
            pending: tx.pending,
            description: externalId,
          },
        });
        newCount++;
      }
    }

    // Update current spent
    const allTransactions = await prisma.transaction.findMany({
      where: { cardId: cardId }
    });
    const totalSpent = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    await prisma.card.update({
      where: { id: cardId },
      data: { currentSpent: totalSpent }
    });
    
    return NextResponse.json({
      success: true,
      count: newCount,
      totalSpent: totalSpent,
    });
  } catch (error: unknown) {
    console.error('Error syncing transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync transactions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
