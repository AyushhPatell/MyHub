# EmailJS Troubleshooting Guide

## Common Error: 400 Bad Request

If you get a 400 error, it's usually because:

### 1. Template Variables Don't Match

**Problem**: The template variables in EmailJS don't match what the code is sending.

**Solution**: 
- In your EmailJS template, make sure you only have:
  - `{{subject}}` in the Subject field
  - `{{message}}` in the Content field
- Remove any other variables like `{{to_email}}`, `{{to_name}}`, etc.

### 2. Recipient Email Not Set in Template

**Problem**: EmailJS needs the recipient email configured in the template settings, not as a parameter.

**Solution**:
1. In EmailJS template editor, look at the **right sidebar**
2. Find **"To Email"** field
3. Set it to: `{{to_email}}` OR your actual email address for testing
4. The code will automatically use the user's email from Firestore

**OR** (Better for testing):
- Set "To Email" to your own email address
- This way all test emails go to you

### 3. Template Settings Checklist

Make sure in your EmailJS template:

✅ **Subject**: `{{subject}}`
✅ **Content**: `{{message}}`
✅ **To Email**: Your email address (for testing) or `{{to_email}}`
✅ **From Name**: Your name or "DaliHub"
✅ **From Email**: Your email (the one connected to EmailJS service)
✅ **HTML Mode**: Enabled

### 4. Environment Variables

Double-check your `.env` file:

```env
VITE_EMAILJS_SERVICE_ID=service_xxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxx
```

**Important**: 
- No spaces around the `=` sign
- No quotes around the values
- Restart dev server after changing `.env`

### 5. Check EmailJS Dashboard

1. Go to EmailJS dashboard → **Email History**
2. Check if there are any error messages
3. Look at the error details to see what went wrong

### 6. Test Template Variables

In EmailJS template editor:
- Click **"Test"** button
- Fill in test values:
  - `subject`: "Test Subject"
  - `message`: "<p>Test message</p>"
- Send test email
- If this works, the template is correct

## Still Not Working?

1. **Check browser console** for detailed error messages
2. **Check EmailJS logs** in dashboard → Email History
3. **Verify credentials** are correct in `.env`
4. **Restart dev server** after `.env` changes
5. **Check template** only has `{{subject}}` and `{{message}}`

## Quick Fix Checklist

- [ ] Template Subject = `{{subject}}`
- [ ] Template Content = `{{message}}`
- [ ] To Email is set in template settings
- [ ] HTML mode is enabled
- [ ] `.env` file has correct values
- [ ] Dev server restarted after `.env` changes
- [ ] No extra variables in template

