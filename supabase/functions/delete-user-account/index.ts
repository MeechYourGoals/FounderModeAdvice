import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT from the request headers
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, authHeader);

    // Get the user from the JWT to ensure they are deleting their own account
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting account deletion for user: ${userId}`);

    // Delete user data from various tables
    // Note: Some tables might have foreign key constraints, so order matters or we depend on CASCADE

    const tablesToDeleteFrom = [
      'user_subscriptions',
      'user_startup_profiles',
      'user_monthly_usage',
      'user_roles',
      'video_chat_messages',
      'video_chat_sessions',
      'bookmarked_lessons',
      'bookmarked_episodes',
      'episode_folder_assignments',
      'bookmark_folders',
      'episode_folders',
      'personalized_insights'
    ];

    for (const table of tablesToDeleteFrom) {
      console.log(`Deleting from ${table}...`);
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.warn(`Error deleting from ${table}:`, error.message);
        // We continue anyway as some tables might be empty or not exist
      }
    }

    // Finally, delete the user from Supabase Auth
    console.log('Deleting user from auth.users...');
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      throw deleteUserError;
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(JSON.stringify({ success: true, message: 'Account deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
