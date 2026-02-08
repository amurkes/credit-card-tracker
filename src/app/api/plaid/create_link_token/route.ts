import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

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

interface LinkTokenRequest {
  userId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as LinkTokenRequest;
    const { userId } = body;
    
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Credit Card Tracker',
      products: ['transactions'] as unknown as Products[],
      country_codes: ['US'] as CountryCode[],
      language: 'en',
    });
    
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error: unknown) {
    console.error('Error creating link token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create link token';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
