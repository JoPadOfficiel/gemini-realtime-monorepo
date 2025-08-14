const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: new Date(),
        role: 'USER',
      },
    });

    console.log('Test user created:', user);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
