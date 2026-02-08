const { PrismaClient } = require('@prisma/client');

// Connect to SQLite (using the original database)
const sqlitePrisma = new PrismaClient({
  datasourceUrl: "file:./prisma/dev.db"
});

async function checkSQLiteData() {
  console.log('📦 Checking SQLite data...\n');

  try {
    const users = await sqlitePrisma.user.findMany({
      include: { cards: { include: { transactions: true } } }
    });

    console.log(`👥 Users: ${users.length}`);
    
    if (users.length > 0) {
      users.forEach((user, i) => {
        console.log(`\nUser ${i + 1}: ${user.email}`);
        console.log(`  📇 Cards: ${user.cards.length}`);
        user.cards.forEach((card, j) => {
          console.log(`    Card ${j + 1}: ${card.name}`);
          console.log(`      💰 Spent: $${card.currentSpent} / $${card.spendingRequired}`);
          console.log(`      📝 Transactions: ${card.transactions.length}`);
        });
      });
    }

    await sqlitePrisma.$disconnect();
  } catch (error) {
    console.log('❌ Error reading SQLite:', error.message);
    await sqlitePrisma.$disconnect();
  }
}

checkSQLiteData();
