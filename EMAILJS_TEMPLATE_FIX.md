# EmailJS Template Fix - Step by Step

## Problem
The error "service ID not found" is happening because:
1. Your template Content still has default code (not just `{{message}}`)
2. Your template has variables we're not sending (`{{name}}`, `{{email}}`)

## Fix Your Template (Screenshot 3)

### Step 1: Fix the Content Field

1. In EmailJS template editor, click **"Edit Content"** button (pencil icon)
2. Select **"Code Editor"**
3. **DELETE ALL** the default code that looks like:
   ```html
   <div style="font-family: system-ui, sans-serif, Arial; font-size: 12px">
     <div>A message by {{name}} has been received...</div>
     ...
   </div>
   ```
4. **REPLACE** with ONLY this:
   ```html
   {{message}}
   ```
5. Click **"Save"** or close the editor

### Step 2: Fix the Right Sidebar Fields

In the right sidebar of your template:

1. **To Email**: ✅ Keep as `aspatel11410@gmail.com` (or your email)
2. **From Name**: ❌ Change from `{{name}}` to just `DaliHub` (or your name)
3. **From Email**: ✅ Keep "Use Default Email Address" checked
4. **Reply To**: ❌ Change from `{{email}}` to your email address (e.g., `aspatel11410@gmail.com`)
5. **Bcc**: Leave empty
6. **Cc**: Leave empty

### Step 3: Verify Subject Field

Make sure **Subject** field has:
```
{{subject}}
```
(No other text, just `{{subject}}`)

### Step 4: Save Template

Click the **"Save"** button at the top right of the EmailJS page.

## Final Template Settings

✅ **Subject**: `{{subject}}`
✅ **Content**: `{{message}}` (ONLY this, nothing else)
✅ **To Email**: Your email address
✅ **From Name**: `DaliHub` (or your name, but NOT `{{name}}`)
✅ **From Email**: Use Default Email Address (checked)
✅ **Reply To**: Your email address (NOT `{{email}}`)
✅ **HTML Mode**: Enabled

## Why This Matters

- We only send `subject` and `message` as template variables
- If your template has `{{name}}` or `{{email}}`, EmailJS will fail because we don't send those
- The Content must be just `{{message}}` because we build the complete HTML email in our code

## After Fixing

1. Save the template in EmailJS
2. Go back to your app
3. Try "Send Test Email" again
4. Check browser console for the debug info showing what's being sent

