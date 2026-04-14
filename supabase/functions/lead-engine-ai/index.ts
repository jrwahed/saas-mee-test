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
      case "analyze_prospect": {
        systemPrompt = `أنت خبير تحليل أعمال وتسويق B2B. مهمتك تحليل شركة مستهدفة وإعطاء insights عملية.
رد بصيغة JSON فقط:
{
  "company_summary": "ملخص 2-3 جمل عن الشركة وطبيعتها",
  "marketing_behavior": "كيف يتسوقوا دلوقتي أو إيه اللي بيعملوه",
  "opportunity_insight": "الفرصة أو نقطة الضعف اللي ممكن نستغلها",
  "suggested_event_idea": "فكرة فعالية أو campaign مقترح ليهم",
  "ai_priority_score": number (0-100),
  "decision_maker_titles": ["مسمى وظيفي 1", "مسمى وظيفي 2"]
}

القواعد:
- الكلام بالعربي المصري المحترف
- الـ priority score يعتمد على: حجم الشركة، القطاع، النشاط التسويقي الحالي
- الـ decision maker titles تكون منطقية للقطاع ده`;

        userPrompt = `حلل الشركة دي:
الاسم: ${data.name}
القطاع: ${data.sector}
الموقع: ${data.website || 'غير متوفر'}
النشاط التسويقي الحالي: ${data.marketing_activity || 'غير معروف'}
الدولة: ${data.country || 'مصر'}`;
        break;
      }

      case "generate_message": {
        systemPrompt = `أنت خبير كتابة رسائل تواصل B2B بالعربي. بتكتب رسالة احترافية شخصية لصاحب قرار.
الرسالة لازم تتبع الهيكل ده:
1. ملاحظة حقيقية عن الشركة (observation)
2. فرصة أو مشكلة لاحظتها (opportunity)
3. فكرة قصيرة قابلة للتنفيذ (idea)
4. دعوة بسيطة لخطوة تالية (call_to_action)

رد بصيغة JSON:
{
  "observation": "الملاحظة الحقيقية",
  "opportunity": "الفرصة أو المشكلة",
  "idea": "الفكرة القصيرة",
  "call_to_action": "الدعوة البسيطة",
  "full_message": "الرسالة الكاملة جاهزة للإرسال"
}

القواعد:
- الرسالة بالعربي المصري المحترف
- خلي الرسالة قصيرة ومباشرة (5-7 سطور كحد أقصى)
- تجنب المصطلحات المعقدة
- ركّز على القيمة اللي هنقدمها مش على إحنا`;

        userPrompt = `اكتب رسالة تواصل للشركة دي:
اسم الشركة: ${data.company_name}
صاحب القرار: ${data.decision_maker_name || 'غير معروف'} (${data.decision_maker_title || 'غير معروف'})
الرؤية التحليلية: ${data.opportunity_insight}
فكرة الفعالية المقترحة: ${data.suggested_event_idea}
اللغة: ${data.language || 'ar'}`;
        break;
      }

      case "score_prospect": {
        systemPrompt = `أنت خبير تقييم Leads B2B. بتدي Score من 0 لـ 100 بناءً على:
- ملاءمة القطاع
- حجم الشركة
- النشاط التسويقي الحالي

رد بصيغة JSON:
{
  "score": number (0-100),
  "reason": "سبب التقييم بجملة واحدة"
}

القواعد:
- FMCG و Telecom و Banking ياخدوا scores أعلى عادةً
- الشركات الكبيرة أفضل من الصغيرة
- لو عندهم نشاط تسويقي فعلي، ده مؤشر إيجابي`;

        userPrompt = `قيّم الـ Prospect ده:
الاسم: ${data.name}
القطاع: ${data.sector}
النشاط التسويقي: ${data.marketing_activity || 'غير معروف'}`;
        break;
      }

      default:
        throw new Error("Invalid analysis type. Supported types: analyze_prospect, generate_message, score_prospect");
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
    let content = result.choices?.[0]?.message?.content || "لا توجد نتائج";

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }

    return new Response(JSON.stringify({ report: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-engine-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
