'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

interface PlaidLinkProps {
  userId: string;
  cardId: string;
  onSuccess: (publicToken: string, metadata: unknown) => void;
  onExit?: () => void;
}

export default function PlaidLink({ userId, cardId, onSuccess, onExit }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
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
        
        const data = await response.json() as { link_token: string };
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

  const handleSuccess = useCallback(
    (publicToken: string, metadata: unknown) => {
      onSuccess(publicToken, metadata);
      setConnecting(false);
    },
    [onSuccess]
  );

  const handleExit = useCallback(() => {
    setConnecting(false);
    if (onExit) {
      onExit();
    }
  }, [onExit]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  });

  const handleClick = () => {
    setConnecting(true);
    open();
  };

  if (loading) {
    return (
      <button
        disabled
        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2"
      >
        <LoadingSpinner size={16} />
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
      onClick={handleClick}
      disabled={!ready || connecting}
      className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {connecting ? (
        <>
          <LoadingSpinner size={16} />
          Connecting...
        </>
      ) : (
        'Link Bank Account'
      )}
    </button>
  );
}

function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
