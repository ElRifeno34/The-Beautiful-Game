# The Beautiful Game

An independent football journal: plain HTML pages styled by `site.css`.

## Running it locally

```bash
python -m http.server 8765
```

Then open http://localhost:8765.

## Writing stories from the website

New stories are written at `write.html` (it isn't linked in the menu, so bookmark it).
You sign in with your email and password, write, and hit **Publish**. The story shows up
right away on the home page, on its section page and at `story.html?s=<story-name>`.
From the same page you can hide, show or delete stories you've published.

Stories and their photos are stored in [Supabase](https://supabase.com). Only accounts
you add to the `authors` table can publish; everyone else can only read.

### One-time setup

1. **Create a project.** Sign up at supabase.com and create a new project (the free plan is enough).
2. **Create the database.** Open **SQL Editor → New query**, paste everything from
   [`supabase/setup.sql`](supabase/setup.sql) and click **Run**.
3. **Create your login.** Go to **Authentication → Users → Add user → Create new user**,
   enter your email and a password, and tick **Auto Confirm User**.
4. **Turn off sign-ups**, so nobody else can create an account: in
   **Authentication → Sign In / Providers**, switch off **Allow new users to sign up**.
5. **Make yourself the author.** Back in the SQL Editor, run this with your login email:
   ```sql
   insert into public.authors (user_id) select id from auth.users where email = 'you@example.com';
   ```
6. **Connect the site.** In **Project Settings → API**, copy the **Project URL** and the
   **anon / publishable** key into [`supabase-config.js`](supabase-config.js).
   That key is meant to be public. Never paste the **service_role / secret** key.
7. **Add your site's address.** In **Authentication → URL Configuration**, set the
   **Site URL** to your live address (for GitHub Pages:
   `https://elrifeno34.github.io/The-Beautiful-Game/`).
8. Commit and push. Then open `write.html` and sign in.

To let someone else write later, create a user for them (step 3) and run step 5 with their email.
