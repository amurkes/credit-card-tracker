const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Connect to SQLite
const db = new sqlite3.Database('./prisma/dev.db');

function parseDate(value) {
  if (!value) return new Date();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

async function exportAndMigrate() {
  console.log('📦 Step 1: Exporting data from SQLite...\n');
  
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM User', [], (err, users) => {
      if (err) return reject(err);
      
      console.log(`👥 Found ${users.length} users in SQLite`);
      
      db.all('SELECT * FROM Card', [], (err, cards) => {
        if (err) return reject(err);
        
        console.log(`📇 Found ${cards.length} cards in SQLite`);
        
        db.all('SELECT * FROM `Transaction`', [], (err, transactions) => {
          if (err) return reject(err);
          
          console.log(`💰 Found ${transactions.length} transactions in SQLite\n`);
          
          // Save to JSON file for reference
          const data = { users, cards, transactions };
          fs.writeFileSync('./migration-data.json', JSON.stringify(data, null, 2));
          console.log('💾 Data saved to migration-data.json\n');
          
          resolve(data);
        });
      });
    });
  });
}

async function importToSupabase(data) {
  console.log('📤 Step 2: Importing data to Supabase...\n');
  
  const { PrismaClient } = require('@prisma/client');
  const supabase = new PrismaClient();
  
  try {
    // Import users
    console.log('👥 Importing users...');
    for (const user of data.users) {
      await supabase.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: parseDate(user.createdAt),
          updatedAt: parseDate(user.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.users.length} users`);
    
    // Import cards
    console.log('📇 Importing cards...');
    for (const card of data.cards) {
      await supabase.card.upsert({
        where: { id: card.id },
        update: {},
        create: {
          id: card.id,
          userId: card.userId,
          name: card.name,
          issuer: card.issuer,
          last4: card.last4,
          bonusAmount: card.bonusAmount,
          bonusType: card.bonusType,
          spendingRequired: card.spendingRequired,
          currentSpent: card.currentSpent,
          bonusEarned: Boolean(card.bonusEarned),
          deadline: parseDate(card.deadline),
          openedDate: parseDate(card.openedDate),
          createdAt: parseDate(card.createdAt),
          updatedAt: parseDate(card.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.cards.length} cards`);
    
    // Import transactions
    console.log('💰 Importing transactions...');
    for (const tx of data.transactions) {
      await supabase.transaction.upsert({
        where: { id: tx.id },
        update: {},
        create: {
          id: tx.id,
          cardId: tx.cardId,
          amount: tx.amount,
          merchantName: tx.merchantName,
          category: tx.category,
          transactionDate: parseDate(tx.transactionDate),
          pending: Boolean(tx.pending),
          description: tx.description,
          createdAt: parseDate(tx.createdAt),
          updatedAt: parseDate(tx.updatedAt)
        }
      });
    }
    console.log(`✅ Imported ${data.transactions.length} transactions`);
    
    await supabase.$disconnect();
    console.log('\n🎉 Migration complete!');
    
  } catch (error) {
    console.log('❌ Migration error:', error.message);
    await supabase.$disconnect();
    throw error;
  }
}

// Run migration
exportAndMigrate()
  .then(importToSupabase)
  .catch(err => {
    console.log('\n❌ Migration failed:', err.message);
    process.exit(1);
  });
