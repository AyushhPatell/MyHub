# EmailJS Dynamic Setup Guide

## Overview

This guide shows how to set up EmailJS so that **each user receives emails at their own email address** automatically - no manual setup required for users!

## Key Changes

1. **Template uses `{{to_email}}`** - Dynamic recipient per user
2. **Code sends user's email** - Automatically from Firestore  
3. **From email is fixed** - All emails come from your EmailJS service email (myhubservices114@gmail.com)
4. **HTML rendering fixed** - Emails display properly formatted, not raw HTML

## Step 1: Update EmailJS Template

### In EmailJS Dashboard → Your Template:

**Right Sidebar Settings:**
- **To Email**: `{{to_email}}` ← **CHANGE THIS!** (was your hardcoded email)
- **From Name**: `DaliHub` (or `MyHub`)
- **From Email**: Keep "Use Default Email Address" checked (this uses your connected email service - myhubservices114@gmail.com)
- **Reply To**: `myhubservices114@gmail.com` (or your service email)
- **Bcc/Cc**: Leave empty

**Content Tab:**
- **Subject**: `{{subject}}`
- **Content**: `{{{message}}}` ← **USE TRIPLE BRACES!** (not `{{message}}`)
- **Why Triple Braces?**: Triple braces `{{{message}}}` tell EmailJS to render HTML, not escape it. Double braces `{{message}}` would escape HTML and show raw code.

**How to Set This Up:**
1. Go to **"Content"** tab
2. Click **"Edit Content"** button (pencil icon)
3. Select **"Code Editor"**
4. **DELETE** everything in the content field
5. **TYPE**: `{{{message}}}`
6. Save the template

**CRITICAL**: Must use `{{{message}}}` (3 braces) not `{{message}}` (2 braces) for HTML to render!

**Important**: 
- The template will now use `{{to_email}}` which we send from the code, so each user gets emails at their own address!
- HTML mode must be enabled or emails will show raw HTML code

## Step 2: Verify Your Email Service

1. Go to EmailJS → **Email Services**
2. Make sure your service is connected to `myhubservices114@gmail.com`
3. Verify the service is active

## Step 3: How It Works

1. User signs up/logs in → Their email is stored in Firestore
2. When sending email → Code gets user's email from Firestore
3. Code sends to EmailJS → Includes `to_email: user.email`
4. EmailJS template → Uses `{{to_email}}` to send to the right person
5. Email delivered → User receives at their own email address

## Step 4: Test

1. Save the template in EmailJS
2. Go to your app → Settings → Email Notifications
3. Click "Send Test Email"
4. Check your inbox (the email you used to sign up)
5. Email should be properly formatted (not raw HTML)

## Troubleshooting

### Email shows raw HTML
- Make sure HTML mode is enabled in template
- Verify Content field has ONLY `{{message}}` (no extra code)

### Email goes to wrong address
- Check browser console for debug logs
- Verify `to_email` is being sent correctly
- Check EmailJS template has `{{to_email}}` in "To Email" field

### "Service ID not found" error
- Restart dev server after changing `.env`
- Verify `.env` file has correct values
- Check EmailJS dashboard for correct Service ID

## Benefits

✅ **Fully Dynamic** - Each user gets emails at their own address
✅ **No User Setup** - Users don't need to configure anything
✅ **Free** - Works with EmailJS free tier (200 emails/month)
✅ **Automatic** - Uses email from user's account automatically

## Email Flow

```
User Account (Firestore)
    ↓
User Email: user@example.com
    ↓
Code sends: { to_email: "user@example.com", subject: "...", message: "..." }
    ↓
EmailJS Template: Uses {{to_email}} → Sends to user@example.com
    ↓
Email delivered to user's inbox!
```

---

**That's it!** Now every user will automatically receive emails at their own email address without any manual setup! 🎉

