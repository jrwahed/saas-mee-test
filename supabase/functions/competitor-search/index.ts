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

    const { query, country } = await req.json();

    const systemPrompt = `أنت محلل استخبارات تنافسية. لما حد يسألك عن شركة، ابحث عنها وادّيني معلومات بالتفصيل. لو الشركة مش موجودة أو مش معروفة، قول "لم يتم العثور على الشركة".

رد دايماً بـ JSON بالشكل ده وبس — بدون أي كلام تاني:
{
  "found": true/false,
  "name": "الاسم الرسمي للشركة",
  "website": "https://...",
  "industry": "المجال",
  "description": "وصف مختصر بالعربي — 2-3 جمل",
  "social_links": {
    "facebook": "URL or null",
    "instagram": "URL or null",
    "linkedin": "URL or null",
    "twitter": "URL or null"
  },
  "estimated_size": "صغيرة/متوسطة/كبيرة",
  "key_services": ["خدمة 1", "خدمة 2"],
  "initial_assessment": "تقييم أولي كمنافس — 2-3 جمل",
  "threat_level": "low/medium/high",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"]
}`;

    const userPrompt = `ابحث عن الشركة دي وادّيني كل المعلومات المتاحة:
الاسم: ${query}
البلد: ${country || "مصر"}

ابحث عن:
1. الموقع الإلكتروني
2. حسابات السوشيال ميديا
3. المجال والخدمات
4. حجم الشركة التقريبي
5. نقط القوة والضعف الظاهرة
6. تقييم أولي كمنافس`;

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
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const result = await response.json();
    let content = result.choices?.[0]?.message?.content || "";

    try {
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ result: { found: false, raw: content } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("competitor-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
