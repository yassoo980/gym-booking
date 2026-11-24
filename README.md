# Studio app (gym + classes)

1. Supabase: create project, run `supabase/schema.sql` in the SQL Editor.
2. Supabase > Authentication: create your admin user (Add user > Create new user), then turn OFF "Allow new users to sign up".
3. Copy `.env.example` to `.env.local` and fill in your Supabase URL + anon key (Project Settings > API).
4. `npm install` then `npm run dev` -> http://localhost:3000 (admin at /admin).
5. Edit your business name in `lib/config.js`.
6. Push to GitHub, import in Vercel, add the same two env vars, Deploy.
