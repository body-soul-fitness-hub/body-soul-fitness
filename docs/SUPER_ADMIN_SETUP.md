# Super-admin setup

The dashboard has one owner account. Members continue using the separate Member Portal activation and login flow.

## Before the first setup

Apply `supabase/migrations/0008_reports_and_admin_settings.sql` to the relevant Supabase project first. It creates the `staff_users` table that identifies the super-admin account.

Add a long random value for `SUPER_ADMIN_SETUP_KEY` to the server environment:

- Local development: `.env.local`
- Production: Vercel → Project → Settings → Environment Variables (Production)

This is a one-time private key for creating the first owner account. Do not put it in `NEXT_PUBLIC_*`, source code, WhatsApp, or email.

In Supabase Dashboard → Authentication → URL Configuration, add this redirect URL:

`https://YOUR-DOMAIN/auth/confirm?next=/admin/reset-password`

Also add the equivalent localhost URL for local testing, for example:

`http://localhost:3000/auth/confirm?next=/admin/reset-password`

## First sign-in

1. Visit `/admin/setup`.
2. Enter your name, your private owner email, a password of at least 12 characters, and the setup key.
3. After the account is created, sign in at `/admin/login`.

Only the first successful setup can create the super-admin record. The password is held securely by Supabase Auth, never in the application database or code.

## If the owner forgets the password

1. Open `/admin/login` and select **Forgot password?**
2. Enter the owner email address.
3. Open the reset email and select a new password.

The reset link is time-limited and only works for the active super-admin account.
