import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");

    const { type, data } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "threat_assessment":
        systemPrompt = `أنت محلل استراتيجي وخبير استخبارات تنافسية. بتحلل المنافسين وبتحدد مستوى التهديد.
رد بصيغة JSON:
{ "threat_level": "critical|high|medium|low", "analysis": "تحليل مفصل", "strategy": "اقتراح استراتيجية المواجهة" }
أسلوبك بالعامية المصرية المحترمة — زي مستشار استراتيجي بيتكلم مع CEO.`;
        userPrompt = `بيانات المنافس: ${JSON.stringify(data)}`;
        break;

      case "battle_plan":
        systemPrompt = `أنت محلل استراتيجي خبير. عندك بيانات كل المنافسين + أداءنا.
اعمل خطة معركة استراتيجية تتضمن:
1. التهديدات الرئيسية
2. الفرص المتاحة
3. خطة العمل (3-5 خطوات عملية)
رد بالماركداون. أسلوبك بالعامية المصرية المحترمة.`;
        userPrompt = `البيانات: ${JSON.stringify(data)}`;
        break;

      case "opportunity_scan":
        systemPrompt = `أنت خبير استخبارات تنافسية. حدد الفجوات في عروض المنافسين اللي ممكن نستغلها.
رد بصيغة JSON array:
[{ "opportunity": "وصف الفرصة", "priority": "high|medium|low", "action": "الخطوة المطلوبة" }]`;
        userPrompt = `بيانات المنافسين: ${JSON.stringify(data)}`;
        break;

      case "weekly_brief":
        systemPrompt = `أنت محلل استخبارات تنافسية بتعمل تقرير أسبوعي.
لخّص أهم التطورات عند المنافسين الأسبوع ده.
8 سطور بالظبط — كل سطر فيه معلومة مهمة.
أسلوبك بالعامية المصرية المحترمة.`;
        userPrompt = `بيانات الأسبوع: ${JSON.stringify(data)}`;
        break;

      default:
        throw new Error("Invalid analysis type");
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول تاني" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "لا توجد نتائج";

    return new Response(JSON.stringify({ report: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("competitor-ai-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
