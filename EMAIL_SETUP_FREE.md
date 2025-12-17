# Email Integration Setup Guide (FREE - No Backend Required!)

This guide will help you set up **FREE** email notifications using **EmailJS** - no Firebase Functions, no domain verification, no backend needed!

## ✅ Why EmailJS?

- ✅ **100% FREE** - 200 emails/month (perfect for personal projects)
- ✅ **No Backend Required** - Works entirely from frontend
- ✅ **No Domain Needed** - Use their default sending domain
- ✅ **No Firebase Functions** - No need to upgrade Firebase plan
- ✅ **Easy Setup** - 5 minutes to get started
- ✅ **No Credit Card Required**

## Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up"** (top right)
3. Sign up with your email or Google account
4. Verify your email address

## Step 2: Add Email Service

1. In EmailJS dashboard, go to **"Email Services"**
2. Click **"Add New Service"**
3. Choose **"Gmail"** (recommended for free tier) or any other service
4. Follow the instructions to connect your email account
   - For Gmail: You'll need to generate an "App Password"
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Generate a password and use it in EmailJS

**Alternative**: You can also use:
- **Outlook/Hotmail**
- **Yahoo**
- **Custom SMTP** (if you have one)

## Step 3: Create Email Template

**Important**: Don't use the pre-built templates (they may be paid). Create your own custom template - it's completely free!

1. Go to **"Email Templates"** in EmailJS dashboard
2. Click **"Create New Template"** button (top right)
3. Fill in the template details:

**Template Name**: `DaliHub Notifications`

**Subject**: `{{subject}}`

**Content** (HTML) - **Replace the default code with this simple version**:
```html
{{{message}}}
```

**CRITICAL**: Use **TRIPLE braces** `{{{message}}}` not `{{message}}`! This tells EmailJS to render HTML instead of showing raw code.

**Right Sidebar Settings** (IMPORTANT!):
- **To Email**: Enter your email address (e.g., `your-email@gmail.com`) - **DO NOT use `{{to_email}}`**
- **From Name**: Enter `DaliHub` or your name - **DO NOT use `{{name}}` or any variables**
- **From Email**: Check "Use Default Email Address" (this uses your connected email service)
- **Reply To**: Enter your email address - **DO NOT use `{{email}}` or any variables**
- **Bcc/Cc**: Leave empty

**Template Settings**:
- Enable **"HTML"** mode (toggle switch)

4. Click **"Save"** button at the top right

**⚠️ CRITICAL CHECKLIST**:
- [ ] Content field has ONLY `{{message}}` (delete all default code!)
- [ ] Subject field has ONLY `{{subject}}`
- [ ] To Email is your actual email (not a variable)
- [ ] From Name is text like "DaliHub" (not `{{name}}`)
- [ ] Reply To is your actual email (not `{{email}}`)
- [ ] HTML mode is enabled
- [ ] Template is saved

**Common Mistakes**:
- ❌ Leaving default template code in Content field
- ❌ Using `{{name}}` or `{{email}}` in sidebar fields
- ❌ Forgetting to save the template

**Important Notes**:
- The `{{subject}}` and `{{{message}}}` are template variables
- `{{{message}}}` contains the **complete HTML email** (already formatted with styling)
- **Use TRIPLE braces** `{{{message}}}` to render HTML properly (double braces `{{message}}` would show raw code)
- **Remove any default template code** and just use `{{{message}}}` - that's it!
- The email service builds the full HTML email, so the template just needs to output it

## Step 4: Get Your Credentials

After creating the template, you'll see:

1. **Service ID** - Copy this (e.g., `service_xxxxx`)
2. **Template ID** - Copy this (e.g., `template_xxxxx`)
3. **Public Key** - Go to **"Account"** → **"General"** → Copy **"Public Key"**

## Step 5: Add to Your Project

1. Create or edit `.env` file in your project root:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

2. Replace the values with your actual credentials from Step 4

**Example**:
```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=abcdefghijklmnop
```

## Step 6: Restart Development Server

```bash
# Stop your current dev server (Ctrl+C)
npm run dev
```

The environment variables will be loaded automatically.

## Step 7: Test Email Functionality

1. Open your app
2. Go to **Settings** → **Email Notifications**
3. Enable **"Enable Email Notifications"**
4. Click **"Send Test Email"**
5. Check your inbox!

## 🎉 That's It!

Your email integration is now set up and working - **completely free**!

## EmailJS Free Tier Limits

- **200 emails/month** - Perfect for personal projects
- **2 email services** - You can add multiple email accounts
- **2 email templates** - Enough for all notification types
- **No expiration** - Free forever (with limits)

## Troubleshooting

### "Email service not configured" error
- Make sure your `.env` file has all three variables
- Restart your dev server after adding `.env` variables
- Check that variable names start with `VITE_`

### Emails not sending
- Check EmailJS dashboard → **"Logs"** to see errors
- Verify your email service is connected properly
- Make sure you haven't exceeded 200 emails/month limit

### "Service ID not found"
- Double-check your Service ID in EmailJS dashboard
- Make sure you copied the full ID (starts with `service_`)

### "Template ID not found"
- Double-check your Template ID in EmailJS dashboard
- Make sure you copied the full ID (starts with `template_`)

### Gmail App Password Issues
- Make sure 2-Step Verification is enabled on your Google account
- Generate a new App Password if the old one doesn't work
- Use the App Password (not your regular Gmail password) in EmailJS

## Upgrading (Optional)

If you need more than 200 emails/month:
- **EmailJS Paid Plans**: Start at $15/month for 1,000 emails
- Still much cheaper than Firebase Functions + email service!

## Security Notes

- ✅ Your email credentials are stored securely in EmailJS
- ✅ Public Key is safe to expose in frontend (it's designed for that)
- ✅ Service ID and Template ID are also safe (they're public)
- ⚠️ Never commit your `.env` file to Git (it's already in `.gitignore`)

## Next Steps

1. ✅ Test email functionality
2. ✅ Enable email notifications in Settings
3. ✅ Configure digest preferences (daily/weekly)
4. ✅ Enjoy free email notifications!

---

**That's it!** No Firebase Functions, no domain verification, no backend - just pure, simple, free email notifications! 🎉

