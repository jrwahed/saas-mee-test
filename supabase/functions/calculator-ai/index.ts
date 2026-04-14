import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { budget, cpl, propertyType, area, areaCplRange, areaConvRate, platform } =
      await req.json();

    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");

    const prompt = `أنت خبير تسويق عقاري في السوق المصري. البيانات من Meta Ads فقط. بناءً على البيانات التالية قدم تحليلاً استراتيجياً احترافياً:

- الميزانية: ${budget} جنيه
- تكلفة الليد الحالية: ${cpl} جنيه
- المنصة: ${platform || "Meta Ads"}
- نوع العقار: ${propertyType}
- المنطقة المختارة: ${area} — متوسط CPL في السوق: ${areaCplRange} جنيه — معدل التحويل: ${areaConvRate}

قدم:
1. تقييم أداء الحملة الحالية مقارنة بمعايير المنطقة المختارة
2. مقارنة CPL الحالي بمتوسط السوق في ${area}
3. 3 توصيات استراتيجية محددة وقابلة للتنفيذ خاصة بـ Meta Ads
4. توقع النمو خلال 3 أشهر لو طُبقت التوصيات
5. تحذيرات أو مخاطر يجب الانتباه إليها

الرد يكون احترافي ومباشر بدون مقدمات.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "أنت محلل تسويق عقاري محترف متخصص في Meta Ads. البيانات من Meta Ads فقط. تقدم تحليلات دقيقة ومباشرة باللغة العربية. لا تستخدم إيموجي. استخدم تنسيق واضح مع عناوين مرقمة.",
            },
            { role: "user", content: prompt },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام التحليل الذكي" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "خطأ في خدمة التحليل الذكي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("calculator-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
