import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin by role
    const { data: callerRole } = await supabase.rpc("get_user_role", { p_user_id: caller.id });
    if (callerRole !== "super_admin") {
      return new Response(JSON.stringify({ success: false, error: "Not authorized — super_admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companyName, members } = await req.json();

    if (!companyName || !members?.length) {
      return new Response(JSON.stringify({ success: false, error: "Missing companyName or members" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: companyName })
      .select("id")
      .single();

    if (orgError) throw new Error(`Failed to create org: ${orgError.message}`);

    // 2. Create client record
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({ name: companyName, org_id: org.id })
      .select("id")
      .single();

    if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);

    // 3. Create members
    const memberResults = [];
    for (const member of members) {
      try {
        // Try to create auth user
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: member.email,
          password: member.password,
          email_confirm: true,
          user_metadata: { display_name: member.displayName },
        });

        if (createError) {
          // User might already exist — try to find them
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const existing = users?.find((u: any) => u.email === member.email);

          if (existing) {
            // Add existing user to this org
            await supabase.from("user_organizations").insert({
              user_id: existing.id,
              org_id: org.id,
              role: member.role,
            });

            memberResults.push({
              email: member.email,
              role: member.role,
              status: "existing_user_added",
              userId: existing.id,
              password: member.password,
            });
            continue;
          }

          throw createError;
        }

        // Add new user to org
        await supabase.from("user_organizations").insert({
          user_id: authData.user.id,
          org_id: org.id,
          role: member.role,
        });

        memberResults.push({
          email: member.email,
          role: member.role,
          status: "created",
          userId: authData.user.id,
          password: member.password,
        });
      } catch (memberErr: any) {
        memberResults.push({
          email: member.email,
          role: member.role,
          status: "error",
          error: memberErr.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orgId: org.id,
        clientId: client.id,
        companyName,
        members: memberResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
