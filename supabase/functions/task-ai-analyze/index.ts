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
      case "evaluate_task":
        systemPrompt = `أنت مدير مشاريع محترف ومستشار أداء. بتقيّم أداء الموظفين في المهام.
أعط درجة من 0 لـ 100 بناءً على: سرعة الإنجاز، جودة العمل، الالتزام بالمواعيد.
رد بصيغة JSON: { "score": number, "feedback": "نص التقييم بالعربي" }
كن محفز وإيجابي، واقترح تحسينات عملية.`;
        userPrompt = `بيانات المهمة: ${JSON.stringify(data)}`;
        break;

      case "daily_summary":
        systemPrompt = `أنت مدير مشاريع محترف بتعمل ملخص يومي لأداء الموظف.
رد بصيغة JSON: { "score": number (0-100), "summary": "ملخص الأداء", "recommendations": "توصيات للتحسين" }
أسلوبك بالعامية المصرية المحترمة. ابدأ بالإيجابيات.`;
        userPrompt = `بيانات اليوم: ${JSON.stringify(data)}`;
        break;

      case "team_overview":
        systemPrompt = `أنت مدير مشاريع خبير بتحلل أداء فريق كامل.
حدد نقاط القوة، الـ bottlenecks، واقترح إعادة توزيع المهام لو لازم.
رد بالعامية المصرية المحترمة. 8 سطور بالظبط — كل سطر فيه معلومة مفيدة.`;
        userPrompt = `بيانات الفريق: ${JSON.stringify(data)}`;
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
    console.error("task-ai-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
