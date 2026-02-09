import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import prisma from '@/lib/prisma';
import { getDefaultUser } from '@/lib/users';

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

interface AccountSelection {
  plaidAccountId: string;
  name: string;
  issuer: string;
  last4: string;
}

interface CreateCardsRequest {
  plaidItemId: string;
  userId: string;
  accounts: AccountSelection[];
  deadline?: string;
  newAccountIds: string[]; // Only create cards for these accounts
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateCardsRequest;
    const { plaidItemId, accounts, deadline, newAccountIds } = body;

    // Get the PlaidItem to get the access token
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId }
    });

    if (!plaidItem) {
      return NextResponse.json({ error: 'PlaidItem not found' }, { status: 404 });
    }

    // Get or create a default user
    const defaultUser = await getDefaultUser();

    const createdCards = [];
    const linkedCards = [];

    // First, link any existing cards that weren't already linked to this PlaidItem
    const existingCardsToLink = accounts.filter(
      acc => !newAccountIds.includes(acc.plaidAccountId)
    );

    for (const account of existingCardsToLink) {
      // Find card by plaidAccountId
      const existingCard = await prisma.card.findFirst({
        where: {
          plaidAccountId: account.plaidAccountId,
          userId: defaultUser.id
        }
      });

      if (existingCard) {
        // Update card to link to this PlaidItem
        await prisma.card.update({
          where: { id: existingCard.id },
          data: { plaidItemId: plaidItemId }
        });
        linkedCards.push(existingCard);
      }
    }

    // Then, create new cards for new accounts
    const newAccounts = accounts.filter(
      acc => newAccountIds.includes(acc.plaidAccountId)
    );

    for (const account of newAccounts) {
      // Calculate deadline (3 months from now if not provided)
      const cardDeadline = deadline 
        ? new Date(deadline)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const card = await prisma.card.create({
        data: {
          userId: defaultUser.id,
          plaidItemId: plaidItemId,
          name: account.name,
          issuer: account.issuer,
          last4: account.last4,
          plaidAccountId: account.plaidAccountId,
          bonusAmount: 0,
          bonusType: 'points',
          spendingRequired: 0,
          deadline: cardDeadline,
          currentSpent: 0,
          bonusEarned: false,
        },
      });

      // Sync transactions from Plaid for new cards
      try {
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string;
        const endDate = new Date().toISOString().split('T')[0] as string;

        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: plaidItem.accessToken,
          start_date: startDate,
          end_date: endDate,
          options: {
            count: 500,
            offset: 0,
          },
        });

        // Filter transactions for this account
        const accountTransactions = transactionsResponse.data.transactions.filter(
          tx => tx.account_id === account.plaidAccountId
        );

        // Create transactions in database
        for (const tx of accountTransactions) {
          await prisma.transaction.create({
            data: {
              cardId: card.id,
              amount: Math.abs(tx.amount), // Plaid uses negative for expenses
              merchantName: tx.merchant_name || tx.name,
              category: tx.category?.[0] || 'Other',
              transactionDate: new Date(tx.date),
              pending: tx.pending,
              description: tx.name,
            },
          });
        }

        // Update current spent
        const totalSpent = accountTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        await prisma.card.update({
          where: { id: card.id },
          data: { currentSpent: totalSpent },
        });

      } catch (syncError) {
        console.error('Error syncing transactions:', syncError);
        // Continue even if sync fails
      }

      createdCards.push(card);
    }

    return NextResponse.json({
      success: true,
      cards: createdCards,
      linked: linkedCards,
      count: createdCards.length + linkedCards.length,
    });
  } catch (error: unknown) {
    console.error('Error creating cards from Plaid:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create cards';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
