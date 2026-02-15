# GigsManager Email Setup Guide

## Overview
GigsManager now uses **Resend** for professional branded emails instead of Supabase's default email templates. This provides a better user experience with custom HTML, proper branding (teal/gold), and reliable delivery.

## Prerequisites
- Resend account (free tier: 100 emails/day)
- Supabase project with auth configured

## Setup Steps

### 1. Create Resend Account
1. Go to [Resend.com](https://resend.com)
2. Sign up with your email
3. Add your domain (or use `gigsmanager.netlify.app` for testing)
4. Get your **API Key** from the dashboard

### 2. Configure Environment Variables
Add these to your `.env`:

```bash
# Resend Email Service
RESEND_API_KEY=re_YOUR_RESEND_API_KEY_HERE  # Get from resend.com/api-keys

# Supabase Webhook Secret
SUPABASE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # Get from Supabase webhooks

# App URL for email links
NEXT_PUBLIC_APP_URL=https://gigsmanager.netlify.app
```

### 3. Get Supabase Webhook Secret
1. Go to **Supabase Dashboard → Project Settings → Webhooks**
2. Click **Create a new hook**
3. Fill in:
   - **Name:** `auth.user_created`
   - **Table:** `auth.users`
   - **Events:** Check `Insert`
   - **Type:** HTTP Request
   - **Method:** POST
   - **URL:** `https://gigsmanager.netlify.app/api/auth-webhook`
4. Click **Create hook** - you'll see the **Webhook Secret**
5. Copy this secret to `.env` as `SUPABASE_WEBHOOK_SECRET`

**Create a second webhook** for welcome emails:
1. Create another hook
   - **Name:** `auth.user_confirmed`
   - **Table:** `auth.users`
   - **Events:** Check `Update`
   - **URL:** `https://gigsmanager.netlify.app/api/auth-webhook`

### 4. Deploy to Netlify

1. Push code to GitHub
2. Connect repo to Netlify
3. Set environment variables in **Netlify Dashboard → Settings → Build & Deploy → Environment**
4. Add both secrets there (same as `.env`)
5. Deploy!

### 5. Test the Setup

**After deployment:**
- Go to Supabase → Webhooks
- Try signing up on your app
- Check Supabase webhook logs (green checkmark = success)
- Check Resend dashboard for sent emails

## Email Templates

### Included Templates
1. **Verification Email** - Sent on signup, prompts email confirmation
2. **Password Reset** - Sent when user requests password reset
3. **Welcome Email** - Sent after email is verified

### Customization
Edit `/src/lib/email-templates.tsx` to:
- Change colors (Teal #007280, Gold #F8B600, Orange #FAA32C)
- Update copy/branding
- Add/remove sections
- Adjust styling

**Color Variables:**
```css
Brand (Teal): #007280
Gold: #F8B600
Orange: #FAA32C
Light Background: #f8fafc
Text Dark: #1e293b
Text Muted: #64748b
```

## Email Flow

```
User Signs Up
    ↓
Supabase auth.user_created webhook triggers
    ↓
/api/auth-webhook receives event
    ↓
Resend sends branded verification email
    ↓
User clicks verification link
    ↓
Email confirmed → Welcome email sent
```

## Troubleshooting

### Webhook Configuration in Supabase (Step-by-Step)

**Creating Webhook Hook 1 - Verification Email:**
```
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/webhooks
2. Click "Create a hook"
3. Fill in:
   Name: auth.user_created
   Table: auth.users
   Events: ✓ Insert
   Type: HTTP Request
   Method: POST
   URL: https://gigsmanager.netlify.app/api/auth-webhook
4. Click "Create"
5. A webhook secret will appear - COPY IT
6. Paste into .env: SUPABASE_WEBHOOK_SECRET=whsec_...
```

**Creating Webhook Hook 2 - Welcome Email (optional):**
```
Same as above but:
   Name: auth.user_confirmed
   Events: ✓ Update (NOT Insert)
   URL: https://gigsmanager.netlify.app/api/auth-webhook
```

### Netlify Deployment Checklist
- [ ] Code pushed to GitHub
- [ ] Netlify connected to repo
- [ ] Environment variables set in Netlify (Settings → Build & Deploy → Environment):
  - [ ] `RESEND_API_KEY`
  - [ ] `SUPABASE_WEBHOOK_SECRET`
  - [ ] `NEXT_PUBLIC_APP_URL=https://gigsmanager.netlify.app`
- [ ] Build and deploy successful
- [ ] Webhook URL in Supabase is `https://gigsmanager.netlify.app/api/auth-webhook`

### Emails not sending?
1. **Check Resend API key** - is it valid in `.env`?
2. **Check webhook secret** - does it match exactly in Supabase?
3. **Check webhook logs**:
   - Go to Supabase Webhooks dashboard
   - Click your hook
   - See request/response logs (green = success, red = error)
4. **Check Netlify logs**:
   - Netlify Dashboard → Deploys → select deploy → Functions
   - Look for errors in `/api/auth-webhook`
5. **Check Resend dashboard** - are emails showing as delivered/failed?

### Webhook signature verification failing?
- Copy webhook secret from Supabase **exactly** (no extra spaces)
- Paste into `.env` file
- Redeploy to Netlify after adding secret
- Wait ~30 seconds for Netlify functions to restart

### Email styling looks off?
- Test emails in Resend dashboard: https://resend.com/emails
- Edit templates in `/src/lib/email-templates.tsx`
- Redeploy to see changes

## Free Tier Limits
- **Resend:** 100 emails/day (plenty for a growing app)
- **Supabase:** Unlimited webhooks
- **Sendgrid (alternative):** 100 emails/day free tier

## Next Steps

### Immediate Setup (Required for Emails to Work)
- [ ] Get Resend API key from resend.com
- [ ] Configure `.env` with `RESEND_API_KEY`
- [ ] Create Supabase webhooks (follow step-by-step above)
- [ ] Add `SUPABASE_WEBHOOK_SECRET` to `.env`
- [ ] Push code to GitHub
- [ ] Set environment variables in Netlify dashboard
- [ ] Deploy to Netlify
- [ ] Test by signing up on gigsmanager.netlify.app

### Optional Enhancements
- [ ] Add custom domain to Resend (send from @yourdomain)
- [ ] Monitor email delivery in Resend dashboard
- [ ] Set up email bounces/complaints handling
- [ ] Customize email templates with your branding

### Production Readiness
- [ ] Change `NEXT_PUBLIC_APP_URL` to final domain when ready
- [ ] Update Supabase webhook URLs if domain changes
- [ ] Monitor Netlify function logs for errors
- [ ] Set up alerts for webhook failures

## Support
- Resend Docs: https://resend.com/docs
- Supabase Webhooks: https://supabase.com/docs/guides/webhooks
