import * as firebaseAdmin from 'firebase-admin';
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
const app = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY
  })
});

const db = firebaseAdmin.firestore();

async function makeAdmin(userId: string) {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      isAdmin: true,
      updatedAt: new Date().toISOString(),
    });
    console.log(`Successfully made user ${userId} an admin`);
  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    process.exit();
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as an argument');
  process.exit(1);
}

makeAdmin(userId); 