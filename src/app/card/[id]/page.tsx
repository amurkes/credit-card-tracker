'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, TrendingUp, Calendar, DollarSign, RefreshCw } from 'lucide-react';

// Declare alert for TypeScript
declare const alert: (message: string) => void;

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

interface ApiCard {
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
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'transaction' | 'card' | null, id: string | null }>({ type: null, id: null });
  const [syncing, setSyncing] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    merchantName: '',
    category: 'Shopping',
    transactionDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (params.id) {
      fetchCard();
      fetchTransactions();
    }
  }, [params.id]);

  const fetchCard = async () => {
    const response = await fetch('/api/cards');
    const data = await response.json();
    const cards = data as ApiCard[];
    const currentCard = cards.find((c: ApiCard) => c.id === params.id);
    if (currentCard) {
      setCard(currentCard);
    }
  };

  const fetchTransactions = async () => {
    const response = await fetch(`/api/transactions?cardId=${params.id}`);
    const data = await response.json();
    setTransactions(Array.isArray(data) ? data : []);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...transactionForm,
        cardId: params.id
      })
    });
    
    if (response.ok) {
      setShowAddTransaction(false);
      setTransactionForm({
        amount: '',
        merchantName: '',
        category: 'Shopping',
        transactionDate: new Date().toISOString().split('T')[0],
        description: ''
      });
      fetchCard();
      fetchTransactions();
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const response = await fetch(`/api/transactions?id=${transactionId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      fetchCard();
      fetchTransactions();
    }
    setDeleteConfirmation({ type: null, id: null });
  };

  const handleDeleteCard = async () => {
    const response = await fetch(`/api/cards?id=${params.id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      router.push('/');
    }
    setDeleteConfirmation({ type: null, id: null });
  };

  const showDeleteConfirmation = (type: 'transaction' | 'card', id: string) => {
    setDeleteConfirmation({ type, id });
  };

  if (!card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-400';
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransactionForm({ ...transactionForm, amount: e.target.value });
  };

  const handleMerchantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransactionForm({ ...transactionForm, merchantName: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTransactionForm({ ...transactionForm, category: e.target.value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransactionForm({ ...transactionForm, transactionDate: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransactionForm({ ...transactionForm, description: e.target.value });
  };

  const syncTransactions = async () => {
    if (!card) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/plaid/sync_transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id })
      });

      if (response.ok) {
        const data = await response.json() as { count: number };
        alert(`Synced ${data.count} transactions!`);
        fetchTransactions();
        fetchCard();
      } else {
        throw new Error('Failed to sync');
      }
    } catch (error) {
      console.error('Error syncing transactions:', error);
      alert('Failed to sync transactions. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Delete Confirmation Modal */}
      {deleteConfirmation.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              {deleteConfirmation.type === 'transaction' 
                ? 'Are you sure you want to delete this transaction?'
                : 'Are you sure you want to delete this card and all its transactions?'}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => deleteConfirmation.type === 'card' ? handleDeleteCard() : handleDeleteTransaction(deleteConfirmation.id!)}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmation({ type: null, id: null })}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{card.name}</h1>
              <p className="text-white/80 mt-1">{card.issuer} •••• {card.last4}</p>
            </div>
            <button
              onClick={() => showDeleteConfirmation('card', card.id)}
              className="bg-red-500/20 hover:bg-red-500/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete Card
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-gray-600 text-sm">Sign-up Bonus</p>
              <p className="text-3xl font-bold text-gray-900">
                {card.bonusAmount.toLocaleString()} <span className="text-lg font-normal text-gray-500">{card.bonusType}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 text-sm">Spend Requirement</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(card.spendingRequired)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-gray-900">{Math.round(card.progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${getProgressColor(card.progress)} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(card.progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">{formatCurrency(card.currentSpent)} spent</span>
              <span className="text-gray-600">{formatCurrency(card.spendingRequired - card.currentSpent)} remaining</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3">
              <Calendar className="text-orange-500" size={24} />
              <div>
                <p className="text-sm text-gray-600">Deadline</p>
                <p className="font-semibold text-gray-900">{formatDate(card.deadline)}</p>
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3">
              <TrendingUp className="text-amber-500" size={24} />
              <div>
                <p className="text-sm text-gray-600">Days Remaining</p>
                <p className="font-semibold text-gray-900">{card.daysRemaining} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
            <div className="flex gap-2">
              <button
                onClick={syncTransactions}
                disabled={syncing}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
              <button
                onClick={() => setShowAddTransaction(!showAddTransaction)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                Add Transaction
              </button>
            </div>
          </div>

          {/* Add Transaction Form */}
          {showAddTransaction && (
            <form onSubmit={handleAddTransaction} className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={transactionForm.amount}
                  onChange={handleAmountChange}
                  className="p-3 border-2 border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  required
                />
                <input
                  type="text"
                  placeholder="Merchant Name"
                  value={transactionForm.merchantName}
                  onChange={handleMerchantChange}
                  className="p-3 border-2 border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  required
                />
                <select
                  value={transactionForm.category}
                  onChange={handleCategoryChange}
                  className="p-3 border-2 border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                >
                  <option value="Shopping">Shopping</option>
                  <option value="Dining">Dining</option>
                  <option value="Travel">Travel</option>
                  <option value="Gas">Gas</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="date"
                  value={transactionForm.transactionDate}
                  onChange={handleDateChange}
                  className="p-3 border-2 border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  required
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={transactionForm.description}
                  onChange={handleDescriptionChange}
                  className="p-3 border-2 border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 col-span-2"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all"
                >
                  Add Transaction
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTransaction(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No transactions yet</p>
              <p className="text-sm">Add your first transaction to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center text-white font-bold">
                      {transaction.category.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.merchantName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{transaction.category}</span>
                        <span>•</span>
                        <span>{formatDate(transaction.transactionDate)}</span>
                        {transaction.pending && (
                          <>
                            <span>•</span>
                            <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-xs">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(transaction.amount)}</span>
                    <button
                      onClick={() => showDeleteConfirmation('transaction', transaction.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
