'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';

interface PlaidLinkProps {
  userId: string;
  cardId: string;
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit?: () => void;
}

export default function PlaidLink({ userId, cardId, onSuccess, onExit }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch link token from our backend
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/plaid/create_link_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create link token');
        }
        
        const data = await response.json();
        setLinkToken(data.link_token);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error fetching link token:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkToken();
  }, [userId]);

  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    (publicToken, metadata) => {
      onSuccess(publicToken, metadata);
    },
    [onSuccess]
  );

  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
    }
  }, [onExit]);

  const config: PlaidLinkOptions = {
    token: linkToken ?? undefined,
    onSuccess: handleSuccess,
    onExit: handleExit,
  };

  const { open, ready } = usePlaidLink(config);

  if (loading) {
    return (
      <button
        disabled
        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        Error: {error}
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Link Bank Account
    </button>
  );
}
