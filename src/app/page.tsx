'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, CreditCard, TrendingUp, Calendar, Target, Building2, Check, X, Loader2 } from 'lucide-react';
import PlaidLink from '@/components/PlaidLink';

interface Card {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  bonusAmount: number;
  bonusType: string;
  spendingRequired: number;
  currentSpent: number;
  deadline: string;
  progress: number;
  daysRemaining: number;
  bonusEarned: boolean;
  transactionCount?: number;
  recentTransactions?: Transaction[];
}

interface Transaction {
  id: string;
  amount: number;
  merchantName: string;
  category: string;
  transactionDate: string;
  pending: boolean;
  description: string | null;
}

interface PlaidAccount {
  id: string;
  name: string;
  officialName: string;
  type: string;
  subtype: string;
  mask: string;
  balances: {
    current: number;
    available: number;
    limit: number | null;
    currency: string;
  };
}

interface PlaidLinkData {
  plaidItemId: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidAccount[];
  linkedAccountIds: string[]; // IDs of already-linked accounts
}

interface ExistingLogin {
  id: string;
  institutionName: string;
  createdAt: string;
  linkedAccountIds: string[];
}

export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Plaid linking state
  const [showPlaidLinkModal, setShowPlaidLinkModal] = useState(false);
  const [plaidLinkData, setPlaidLinkData] = useState<PlaidLinkData | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [linkingAccounts, setLinkingAccounts] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [showExistingLogins, setShowExistingLogins] = useState(false);
  const [existingLogins, setExistingLogins] = useState<ExistingLogin[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    last4: '',
    bonusAmount: '',
    bonusType: 'points',
    spendingRequired: '',
    deadline: ''
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const formatNumber = (value: string) => {
    const number = value.replace(/[^0-9]/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseNumber = (value: string) => {
    return value.replace(/,/g, '');
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cards');
      if (!response.ok) {
        throw new Error('Failed to fetch cards');
      }
      const data = await response.json();
      setCards(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      setShowAddForm(false);
      fetchCards();
      setFormData({
        name: '', issuer: '', last4: '', bonusAmount: '',
        bonusType: 'points', spendingRequired: '', deadline: ''
      });
    } else {
      const errorData = await response.json();
      console.error('Error creating card:', errorData);
    }
  };

  // Plaid linking handlers
  const handlePlaidSuccess = async (publicToken: string, _metadata: unknown) => {
    try {
      // Exchange public token for access token and get accounts
      const exchangeResponse = await fetch('/api/plaid/exchange_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken })
      });

      if (!exchangeResponse.ok) {
        throw new Error('Failed to exchange token');
      }

      const data = await exchangeResponse.json() as {
        plaidItemId: string;
        institutionId: string;
        institutionName: string;
        accounts: PlaidAccount[];
        linkedAccountIds: string[];
        hasExistingLogins: boolean;
        existingItemCount: number;
      };

      // Set Plaid data from response
      setPlaidLinkData({
        plaidItemId: data.plaidItemId,
        institutionId: data.institutionId,
        institutionName: data.institutionName,
        accounts: data.accounts,
        linkedAccountIds: data.linkedAccountIds || []
      });

      // Check for existing logins at this institution
      if (data.hasExistingLogins) {
        // Fetch existing login details
        const itemsResponse = await fetch(`/api/plaid/items?institutionId=${data.institutionId}`);
        if (itemsResponse.ok) {
          const items = await itemsResponse.json();
          setExistingLogins(items.map((item: { id: string; institutionName: string; createdAt: string; cards: { plaidAccountId: string | null }[] }) => ({
            id: item.id,
            institutionName: item.institutionName,
            createdAt: item.createdAt,
            linkedAccountIds: item.cards.map((c: { plaidAccountId: string | null }) => c.plaidAccountId).filter(Boolean) as string[]
          })));
          setShowExistingLogins(true);
        }
      }

      // Pre-select accounts that are already linked
      const preselected = new Set<string>();
      data.linkedAccountIds.forEach((id: string) => preselected.add(id));
      setSelectedAccounts(preselected);

      setShowPlaidLinkModal(true);
      setLinkSuccess(true);

    } catch (error) {
      console.error('Error linking bank:', error);
      setError('Failed to link bank account. Please try again.');
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId);
    } else {
      newSelected.add(accountId);
    }
    setSelectedAccounts(newSelected);
  };

  const handleLinkSelectedAccounts = async () => {
    if (!plaidLinkData || selectedAccounts.size === 0) return;

    setLinkingAccounts(true);

    try {
      const accountsToLink = plaidLinkData.accounts
        .filter(acc => selectedAccounts.has(acc.id))
        .map(acc => ({
          plaidAccountId: acc.id,
          name: acc.name,
          issuer: plaidLinkData.institutionName,
          last4: acc.mask
        }));

      const response = await fetch('/api/cards/create_from_plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plaidItemId: plaidLinkData.plaidItemId,
          userId: 'demo-user', // In production, use actual user ID
          accounts: accountsToLink,
          // Only link new accounts that weren't already linked
          newAccountIds: Array.from(selectedAccounts).filter(
            id => !plaidLinkData.linkedAccountIds.includes(id)
          )
        })
      });

      if (response.ok) {
        setShowPlaidLinkModal(false);
        setShowExistingLogins(false);
        setExistingLogins([]);
        setSelectedAccounts(new Set());
        fetchCards();
        window.alert('Cards linked successfully! You can now sync transactions.');
      } else {
        throw new Error('Failed to create cards');
      }
    } catch (error) {
      console.error('Error linking accounts:', error);
      setError('Failed to link accounts. Please try again.');
    } finally {
      setLinkingAccounts(false);
    }
  };

  const handleCardClick = (cardId: string) => {
    router.push(`/card/${cardId}`);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-400';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Calculate stats
  const totalBonusValue = cards.reduce((sum, card) => sum + card.bonusAmount, 0);
  const cardsCompleted = cards.filter(card => card.progress >= 100).length;
  const cardsAtRisk = cards.filter(card => card.daysRemaining < 30 && card.progress < 100).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <CreditCard size={32} />
                Credit Card Bonus Tracker
              </h1>
              <p className="text-white/80 mt-1">Track your spending and maximize sign-up bonuses</p>
            </div>
            <div className="flex gap-3">
              <PlaidLink
                userId="demo-user"
                cardId=""
                onSuccess={handlePlaidSuccess}
              />
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus size={20} />
                Add New Card
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Existing Logins Modal */}
        {showExistingLogins && existingLogins.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Link to Existing Login</h2>
                <p className="text-gray-600 mt-1">
                  You&apos;ve linked to {plaidLinkData?.institutionName} before. Choose an option:
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* Option: Link new login */}
                <div
                  onClick={() => setShowExistingLogins(false)}
                  className="p-4 rounded-xl border-2 border-orange-500 bg-orange-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white">
                      <Plus size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Link New Login</p>
                      <p className="text-sm text-gray-600">Add accounts from a different login</p>
                    </div>
                  </div>
                </div>
                {/* List existing logins */}
                {existingLogins.map((login) => (
                  <div
                    key={login.id}
                    className="p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                          <Check size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{login.institutionName}</p>
                          <p className="text-sm text-gray-600">
                            Linked on {new Date(login.createdAt).toLocaleDateString()} • {login.linkedAccountIds.length} cards
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setShowExistingLogins(false)}
                  className="w-full mt-4 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plaid Link Account Selection Modal */}
        {showPlaidLinkModal && plaidLinkData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center text-white">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Select Credit Cards</h2>
                      <p className="text-gray-600">Choose which cards to track from {plaidLinkData.institutionName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPlaidLinkModal(false);
                      setSelectedAccounts(new Set());
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {plaidLinkData.accounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => toggleAccountSelection(account.id)}
                    className={`p-4 rounded-xl border-2 mb-3 cursor-pointer transition-all ${
                      selectedAccounts.has(account.id)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedAccounts.has(account.id)
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedAccounts.has(account.id) && (
                            <Check size={16} className="text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{account.name}</p>
                          <p className="text-sm text-gray-500">•••• {account.mask}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(account.balances.current || 0)}
                        </p>
                        <p className="text-xs text-gray-500">Current Balance</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleLinkSelectedAccounts}
                    disabled={selectedAccounts.size === 0 || linkingAccounts}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {linkingAccounts ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Linking...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Link {selectedAccounts.size} Selected Card{selectedAccounts.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && cards.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cards...</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            {cards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white">
                    <Target size={28} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Bonus Value</p>
                    <p className="text-2xl font-bold text-gray-900">{totalBonusValue.toLocaleString()} pts</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bonuses Earned</p>
                    <p className="text-2xl font-bold text-gray-900">{cardsCompleted} of {cards.length}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center text-white">
                    <Calendar size={28} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">At Risk</p>
                    <p className="text-2xl font-bold text-gray-900">{cardsAtRisk} cards</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Card Form */}
            {showAddForm && (
              <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-2xl shadow-xl border-2 border-orange-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Card</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Card Name (e.g., Chase Sapphire Preferred)"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="p-3 border-2 border-orange-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-medium"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Issuer (e.g., Chase)"
                    value={formData.issuer}
                    onChange={(e) => setFormData({...formData, issuer: e.target.value})}
                    className="p-3 border-2 border-orange-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last 4 digits"
                    value={formData.last4}
                    onChange={(e) => setFormData({...formData, last4: e.target.value})}
                    className="p-3 border-2 border-orange-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    maxLength={4}
                  />
                  <input
                    type="text"
                    placeholder="Bonus Amount (e.g., 60,000)"
                    value={formatNumber(formData.bonusAmount)}
                    onChange={(e) => {
                      const rawValue = parseNumber(e.target.value);
                      if (/^\d*$/.test(rawValue)) {
                        setFormData({...formData, bonusAmount: rawValue});
                      }
                    }}
                    className="p-3 border-2 border-orange-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    required
                  />
                  <select
                    value={formData.bonusType}
                    onChange={(e) => setFormData({...formData, bonusType: e.target.value})}
                    className="p-3 border-2 border-orange-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  >
                    <option value="points">Points</option>
                    <option value="miles">Miles</option>
                    <option value="cashback">Cash Back</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Spending Required (e.g., 4,000)"
                    value={formatNumber(formData.spendingRequired)}
                    onChange={(e) => {
                      const rawValue = parseNumber(e.target.value);
                      if (/^\d*$/.test(rawValue)) {
                        setFormData({...formData, spendingRequired: rawValue});
                      }
                    }}
                    className="p-3 border-2 border-orange-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    required
                  />
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    className="p-3 border-2 border-orange-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    required
                  />
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
                    >
                      Add Card
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Cards Grid */}
            {cards.length === 0 && !loading && !error ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <CreditCard size={64} className="mx-auto text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Cards Added Yet</h2>
                <p className="text-gray-600 mb-6">Add your first credit card to start tracking your bonus progress</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add Card Manually
                  </button>
                  <PlaidLink
                    userId="demo-user"
                    cardId=""
                    onSuccess={handlePlaidSuccess}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all border-2 border-transparent hover:border-orange-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{card.name}</h2>
                        <p className="text-gray-600">{card.issuer} •••• {card.last4}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{card.bonusAmount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{card.bonusType}</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">{formatCurrency(card.currentSpent)}</span>
                        <span className="font-semibold text-gray-900">{Math.round(card.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(card.progress)} transition-all duration-500 rounded-full`}
                          style={{ width: `${Math.min(card.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>{formatCurrency(card.spendingRequired)} goal</span>
                        <span>{card.daysRemaining} days left</span>
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    {card.recentTransactions && card.recentTransactions.length > 0 && (
                      <div className="mb-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Recent Transactions</span>
                          <span className="text-xs text-gray-400">{card.transactionCount} total</span>
                        </div>
                        <div className="space-y-2">
                          {card.recentTransactions.slice(0, 3).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs font-bold">
                                  {tx.category.charAt(0)}
                                </div>
                                <span className="text-gray-700 truncate max-w-[100px]">{tx.merchantName}</span>
                              </div>
                              <span className="font-medium text-gray-900">{formatCurrency(tx.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deadline */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        Deadline: {new Date(card.deadline).toLocaleDateString()}
                      </span>
                      <span className="text-orange-500 flex items-center gap-1 text-sm font-medium">
                        Manage <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
