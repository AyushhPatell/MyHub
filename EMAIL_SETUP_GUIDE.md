# Email Setup Guide - Simple & Free

## Option 1: Gmail (Recommended - Simplest & Free)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" → "2-Step Verification"
3. Enable it (if not already enabled)

### Step 2: Create App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it "MyHub" and click "Generate"
4. Copy the 16-character password (you'll use this below)

### Step 3: Set Firebase Secrets
Run these commands in your terminal (replace with your values):

```bash
# Gmail SMTP Settings
firebase functions:secrets:set SMTP_HOST
# When prompted, enter: smtp.gmail.com

firebase functions:secrets:set SMTP_PORT
# When prompted, enter: 587

firebase functions:secrets:set SMTP_USER
# When prompted, enter: your-email@gmail.com

firebase functions:secrets:set SMTP_PASSWORD
# When prompted, enter: your-16-character-app-password (from Step 2)

firebase functions:secrets:set SMTP_FROM_EMAIL
# When prompted, enter: your-email@gmail.com

firebase functions:secrets:set SMTP_FROM_NAME
# When prompted, enter: MyHub
```

### Step 4: Install Dependencies & Deploy
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

**That's it!** Your emails will now work automatically.

---

## Option 2: SendGrid (Free Tier: 100 emails/day)

### Step 1: Create SendGrid Account
1. Go to: https://signup.sendgrid.com/
2. Sign up for free account (100 emails/day free)

### Step 2: Create API Key
1. Go to SendGrid Dashboard → Settings → API Keys
2. Click "Create API Key"
3. Name it "MyHub" and give "Full Access"
4. Copy the API key (you'll use this below)

### Step 3: Set Firebase Secrets
```bash
# SendGrid SMTP Settings
firebase functions:secrets:set SMTP_HOST
# When prompted, enter: smtp.sendgrid.net

firebase functions:secrets:set SMTP_PORT
# When prompted, enter: 587

firebase functions:secrets:set SMTP_USER
# When prompted, enter: apikey

firebase functions:secrets:set SMTP_PASSWORD
# When prompted, enter: your-sendgrid-api-key (from Step 2)

firebase functions:secrets:set SMTP_FROM_EMAIL
# When prompted, enter: your-verified-email@example.com
# (You need to verify your sender email in SendGrid first)

firebase functions:secrets:set SMTP_FROM_NAME
# When prompted, enter: MyHub
```

### Step 4: Verify Sender Email in SendGrid
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify your email address
3. Use that verified email in `SMTP_FROM_EMAIL`

### Step 5: Install Dependencies & Deploy
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## When to Run These Commands?

**Run them NOW** - before deploying your functions. The secrets need to be set before deployment so the functions can use them.

**Order of operations:**
1. ✅ Choose email service (Gmail or SendGrid)
2. ✅ Set up the service (App Password or API Key)
3. ✅ Set Firebase secrets (the commands above)
4. ✅ Install dependencies (`cd functions && npm install`)
5. ✅ Deploy functions (`firebase deploy --only functions`)

---

## Testing

After deployment, go to Settings page in your app and click "Send Test Email" to verify everything works!

---

## Recommendation

**Use Gmail** - It's the simplest:
- ✅ Free
- ✅ No signup needed (if you have Gmail)
- ✅ Works immediately
- ✅ 500 emails/day limit (plenty for your use case)

SendGrid is good if you need more emails or want a dedicated service, but Gmail is perfect for getting started quickly.

