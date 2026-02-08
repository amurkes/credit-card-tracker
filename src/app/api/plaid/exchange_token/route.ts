import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from 'plaid';
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

interface ExchangeTokenRequest {
  public_token: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ExchangeTokenRequest;
    const { public_token } = body;
    
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });
    
    const { access_token, item_id } = exchangeResponse.data;
    
    // Get accounts using the access token (server-side)
    const accountsResponse = await plaidClient.accountsGet({
      access_token,
    });

    // Get item info to get institution ID
    const itemResponse = await plaidClient.itemGet({
      access_token,
    });

    // Get institution info
    const institutionId = itemResponse.data.item.institution_id || 'unknown';
    let institutionName = 'Connected Bank';
    
    if (institutionId !== 'unknown') {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US'] as CountryCode[],
        });
        institutionName = instResponse.data.institution.name;
      } catch (instError) {
        console.error('Error fetching institution:', instError);
      }
    }

    // Format accounts
    const accounts = accountsResponse.data.accounts.map((account) => ({
      id: account.account_id,
      name: account.name,
      officialName: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balances: {
        current: account.balances.current,
        available: account.balances.available,
        limit: account.balances.limit,
        currency: account.balances.iso_currency_code,
      },
    }));
    
    // Get or create default user for now
    let defaultUser = await prisma.user.findFirst({
      where: { email: 'demo@creditcardtracker.com' }
    });
    
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'demo@creditcardtracker.com',
          name: 'Demo User',
        }
      });
    }

    // Check if we already have items for this institution for this user
    const existingItems = await prisma.plaidItem.findMany({
      where: {
        userId: defaultUser.id,
        institutionId: institutionId,
      },
      include: {
        cards: {
          select: { plaidAccountId: true }
        }
      }
    });

    // Store access token in PlaidItem (NOTE: encrypt in production!)
    // For now, we'll store it temporarily and link cards to this item
    const plaidItem = await prisma.plaidItem.create({
      data: {
        userId: defaultUser.id,
        institutionId: institutionId,
        institutionName: institutionName,
        accessToken: access_token,
        itemId: item_id,
      }
    });
    
    return NextResponse.json({
      success: true,
      itemId: item_id,
      plaidItemId: plaidItem.id,
      institutionId: institutionId,
      institutionName: institutionName,
      accounts,
      hasExistingLogins: existingItems.length > 0,
      existingItemCount: existingItems.length,
      // Return IDs of already-linked accounts so UI can pre-check them
      linkedAccountIds: existingItems.flatMap(item => 
        item.cards.map(card => card.plaidAccountId)
      ).filter(Boolean),
    });
  } catch (error: unknown) {
    console.error('Error exchanging token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to exchange token';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
