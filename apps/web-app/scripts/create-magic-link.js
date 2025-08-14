const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createMagicLink() {
  try {
    // Generate a verification token
    const token = crypto.randomBytes(32).toString('hex');
    const identifier = 'test@example.com';
    
    // Create token that expires in 24 hours
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    const verificationToken = await prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    });

    console.log('Magic link token created:', verificationToken);
    console.log('Magic link URL:', `http://localhost:3000/api/auth/callback/email?token=${token}&email=${encodeURIComponent(identifier)}`);
  } catch (error) {
    console.error('Error creating magic link:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMagicLink();
