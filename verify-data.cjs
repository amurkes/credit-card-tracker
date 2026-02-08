const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verify() {
  try {
    const users = await p.user.findMany({ include: { cards: { include: { transactions: true } } } });
    const cards = await p.card.findMany();
    const txs = await p.transaction.findMany();
    
    console.log('✅ Supabase Data Verification:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Cards: ${cards.length}`);
    console.log(`   Transactions: ${txs.length}`);
    console.log('\n📇 Cards:');
    cards.forEach(c => {
      console.log(`   - ${c.name} (${c.issuer}): $${c.currentSpent} / $${c.spendingRequired} required`);
    });
    
    await p.$disconnect();
  } catch (e) {
    console.error('❌ Error:', e.message);
    await p.$disconnect();
    process.exit(1);
  }
}

verify();
