/**
 * Script to set admin status for a user
 * 
 * This script uses Firebase Admin SDK to securely set admin status.
 * 
 * Usage:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Get your Firebase service account key from Firebase Console
 * 3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 4. Run: node scripts/setAdmin.js <user-email>
 * 
 * OR use the manual method in ADMIN_SETUP.md
 */

// Uncomment and configure if using this script:
/*
const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
// You need to download your service account key from:
// Firebase Console > Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('../path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setAdmin(email) {
  try {
    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      console.error(`❌ User with email ${email} not found.`);
      return;
    }
    
    // Update admin status
    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({ isAdmin: true });
    
    console.log(`✅ Successfully set admin status for ${email}`);
    console.log(`   User ID: ${userDoc.id}`);
  } catch (error) {
    console.error('❌ Error setting admin status:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address: node scripts/setAdmin.js <email>');
  process.exit(1);
}

setAdmin(email).then(() => process.exit(0));
*/

console.log(`
⚠️  This script requires Firebase Admin SDK setup.
For now, use the manual method described in ADMIN_SETUP.md
`);

