# EmailJS Template Code

## Simple Template (Recommended)

When editing your EmailJS template in **Code Editor**, replace all the default code with this:

```html
{{{message}}}
```

**IMPORTANT**: Use **TRIPLE braces** `{{{message}}}` not double `{{message}}`!

That's it! Just `{{{message}}}` - nothing else needed.

## Why So Simple?

Our email service (`src/services/email.ts`) already builds the complete HTML email with:
- Beautiful gradient header
- Styled content sections
- Professional formatting
- Mobile-responsive design

So the EmailJS template just needs to output the `{{message}}` variable, which contains the full formatted email.

## Template Settings

**Subject**: `{{subject}}`

**Content**: `{{message}}`

**Enable HTML mode**: ✅ Yes

## What Gets Sent

When an email is sent, EmailJS will replace:
- `{{subject}}` → The email subject (e.g., "📅 Assignment Due Today!")
- `{{{message}}}` → The complete HTML email with all styling (rendered as HTML, not escaped)

**Why Triple Braces?**
- `{{message}}` = Escapes HTML (shows raw code) ❌
- `{{{message}}}` = Renders HTML (shows formatted email) ✅

## If You See Default Template Code

If EmailJS shows default code like:
```html
<div style="font-family: system-ui, sans-serif, Arial; font-size: 12px">
  <div>A message by {{name}} has been received...</div>
  ...
</div>
```

**Delete all of it** and replace with just:
```html
{{{message}}}
```

**Remember**: Use **triple braces** `{{{message}}}` to render HTML properly!

This ensures our beautifully formatted emails display correctly!

