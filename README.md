# Credit Card Bonus Tracker

A web application to track credit card spending and monitor progress toward sign-up bonuses.

## Features

### MVP (Current Version)
- **Card Management**: Add, view, and delete credit cards with bonus details
- **Progress Tracking**: Visual progress bars showing spending vs. bonus requirements
- **Transaction Tracking**: Add manual transactions to track spending
- **Deadline Monitoring**: Track days remaining to meet bonus requirements
- **Dashboard**: Overview of all cards and their bonus status

### Future Enhancements
- **Plaid Integration**: Automatically sync transactions from your bank
- **Mobile App**: React Native mobile version
- **Authentication**: User accounts with secure login
- **Notifications**: Alerts for upcoming deadlines
- **Reports**: Detailed spending analytics

## Tech Stack

- **Frontend**: Next.js 15 with React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 6
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or use Supabase)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd credit-card-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL
```

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Run database migrations:
```bash
npx prisma db push
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
credit-card-tracker/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cards/     # Card API endpoints
│   │   │   └── transactions/ # Transaction API endpoints
│   │   ├── card/
│   │   │   └── [id]/      # Card detail page
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Dashboard page
│   │   └── globals.css    # Global styles
│   └── ...
├── .env                    # Environment variables
├── package.json
└── README.md
```

## API Endpoints

### Cards
- `GET /api/cards` - Get all cards with progress
- `POST /api/cards` - Create a new card
- `PUT /api/cards` - Update a card
- `DELETE /api/cards?id={id}` - Delete a card

### Transactions
- `GET /api/transactions?cardId={id}` - Get transactions for a card
- `POST /api/transactions` - Create a new transaction
- `DELETE /api/transactions?id={id}` - Delete a transaction

## Database Configuration

### Switching Between SQLite and Supabase

The app supports both SQLite (local) and Supabase PostgreSQL (cloud). Edit `.env` to switch:

**To use Supabase (Production):**
```bash
# Uncomment:
DATABASE_URL="postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres?schema=public"
# Comment out:
# DATABASE_URL="file:./prisma/dev.db"
```

**To use SQLite (Local Development):**
```bash
# Uncomment:
DATABASE_URL="file:./prisma/dev.db"
# Comment out:
# DATABASE_URL="postgresql://postgres:..."
```

**Windows Quick Switch:**
```bash
switch-db.bat sqlite   # Switch to SQLite
switch-db.bat supabase # Switch to Supabase
```

After switching, run:
```bash
npx prisma db push
npm run dev
```

**Note:** Data does not automatically transfer between databases. Use `migrate-data.cjs` to migrate data from SQLite to Supabase.

## Database Schema

### User
- `id` - Unique identifier
- `email` - User email
- `name` - User name
- `createdAt` - Creation timestamp

### Card
- `id` - Unique identifier
- `userId` - Associated user
- `name` - Card name
- `issuer` - Card issuer (e.g., Chase, Amex)
- `last4` - Last 4 digits
- `bonusAmount` - Bonus value
- `bonusType` - Type of bonus (points, miles, cash back)
- `spendingRequired` - Required spending amount
- `deadline` - Bonus deadline
- `currentSpent` - Current spending amount
- `bonusEarned` - Whether bonus is earned

### Transaction
- `id` - Unique identifier
- `cardId` - Associated card
- `amount` - Transaction amount
- `merchantName` - Merchant name
- `category` - Transaction category
- `transactionDate` - Date of transaction
- `pending` - Whether transaction is pending

## License

MIT
