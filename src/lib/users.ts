import prisma from './prisma';

/**
 * Get or create the default demo user for the application.
 * This is a temporary solution until proper authentication is implemented.
 */
export async function getDefaultUser() {
  return await prisma.user.upsert({
    where: { email: 'demo@creditcardtracker.com' },
    update: {},
    create: {
      email: 'demo@creditcardtracker.com',
      name: 'Demo User',
    },
  });
}
