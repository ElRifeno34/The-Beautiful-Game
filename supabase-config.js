/* Connection details for the Supabase project that stores new stories.
   Find both in Supabase: Project Settings → API. The key is the public
   "anon" / "publishable" key — it is safe to publish, because the database
   rules in supabase/setup.sql decide who can write. Never put the
   "service_role" / secret key here. */
window.TBG_CONFIG = {
	supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
	supabaseKey: 'YOUR-ANON-OR-PUBLISHABLE-KEY'
};
