const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

const ADMIN_EMAILS = [
  'jcruzfff@gmail.com',
  'hello@sendpin.app'
];

async function setAdmins() {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`Found ${usersSnapshot.size} users in the database`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      console.log(`Checking user: ${userData.email}`);
      
      if (ADMIN_EMAILS.includes(userData.email)) {
        console.log(`\nBefore update - Document data for ${userData.email}:`, userData);
        
        console.log(`Setting admin privileges for ${userData.email}`);
        await userDoc.ref.set({
          ...userData,
          isAdmin: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        // Verify the update
        const updatedDoc = await userDoc.ref.get();
        const updatedData = updatedDoc.data();
        console.log(`\nAfter update - Document data for ${userData.email}:`, updatedData);
        
        if (updatedData?.isAdmin === true) {
          console.log(`✅ Successfully made ${userData.email} an admin`);
        } else {
          console.log(`❌ Failed to set admin status for ${userData.email}`);
        }
      }
    }
    
    console.log('\nAdmin setup complete!');
  } catch (error) {
    console.error('Error setting admin users:', error);
  } finally {
    process.exit();
  }
}

setAdmins(); 