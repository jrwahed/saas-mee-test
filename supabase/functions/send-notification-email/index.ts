import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recipientEmail, title, message, type } = await req.json();

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email not configured — set RESEND_API_KEY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeEmoji: Record<string, string> = {
      deal: "\u{1F389}",
      warning: "\u26A0\uFE0F",
      reassignment: "\u{1F504}",
      lead: "\u{1F525}",
    };
    const emoji = typeEmoji[type] || "\u{1F4E9}";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MW Growth Systems <notifications@mwgrowth.com>",
        to: [recipientEmail],
        subject: `${emoji} ${title} — MW Growth Systems`,
        html: `
          <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: #0A0A0A; border-radius: 12px; padding: 24px; color: white;">
              <h2 style="color: #7C3AED; margin: 0 0 8px 0; font-size: 18px;">${title}</h2>
              <p style="color: #E5E7EB; margin: 0 0 16px 0; font-size: 14px;">${message}</p>
              <a href="#" style="display: inline-block; background: #7C3AED; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">افتح MW Growth Systems</a>
            </div>
            <p style="color: #6B7280; font-size: 11px; text-align: center; margin-top: 12px;">MW Growth Systems — Marketing & Sales Intelligence</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
