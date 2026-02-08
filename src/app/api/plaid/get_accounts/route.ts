import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

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

interface GetAccountsRequest {
  access_token: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as GetAccountsRequest;
    const { access_token } = body;

    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token,
    });

    // Get item info (to know which bank)
    const itemResponse = await plaidClient.itemGet({
      access_token,
    });

    // Filter and format accounts
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

    const bankName = itemResponse.data.item.institution_id 
      ? 'Connected Bank' 
      : 'Unknown Bank';

    return NextResponse.json({
      success: true,
      bankName,
      accounts,
    });
  } catch (error: unknown) {
    console.error('Error fetching accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch accounts';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
