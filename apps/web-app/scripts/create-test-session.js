const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createTestSession() {
  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (!user) {
      console.error('Test user not found');
      return;
    }

    // Create a session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Create session that expires in 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    console.log('Test session created:', session);
    console.log('Session token:', sessionToken);
  } catch (error) {
    console.error('Error creating test session:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSession();
