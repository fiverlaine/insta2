import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UTMIFY_API_TOKEN = Deno.env.get("UTMIFY_API_TOKEN") || "b2QLAVvHl2HSzQk2Gx5DbTJ9cyKR9otd7fH0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const event = body.event;
    const data = body.data;

    console.log(`[Webhook] Event: ${event}`, data);

    // Filter: Only process if utmify param is present
    const utmifyParam = data.utmify_param || data.utmify;
    if (!utmifyParam) {
       console.log(`[Webhook] Ignored - Missing 'utmify' param.`);
       return new Response(JSON.stringify({ success: true, message: "Ignored (No UTMify)" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // 1. Process Signup
    if (event === "signup") {
      const { error } = await supabaseClient.from("bet_leads").upsert({
        email: data.email,
        phone: data.phone,
        name: data.name || "Cliente",
        document: data.cpf || data.document,
        visitor_id: data.visitor_id,
        utmify: utmifyParam,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        src: data.src,
        sck: data.sck,
        fingerprint: data.fingerprint,
        ip_address: data.ip || data.ip_address,
        user_agent: data.user_agent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      if (error) throw error;
    } 
    
    // 2. Process PIX Generation or Payment
    else if (event === "pix_generated" || event === "pix_paid") {
      const isPaid = event === "pix_paid";
      const status = isPaid ? "paid" : "waiting_payment";
      const approvedDate = isPaid ? new Date().toISOString() : null;

      // Update deposits table if we have a transaction ID
      if (data.txid) {
          const { error: depositError } = await supabaseClient.from("deposits").upsert({
            txid: data.txid,
            amount: parseFloat(data.amount || "0"),
            status: status,
            utmify: utmifyParam,
            utm_source: data.utm_source,
            utm_medium: data.utm_medium,
            utm_campaign: data.utm_campaign,
            utm_content: data.utm_content,
            utm_term: data.utm_term,
            src: data.src,
            sck: data.sck,
            visitor_id: data.visitor_id,
            fingerprint: data.fingerprint,
            ip_address: data.ip || data.ip_address,
            created_at: new Date().toISOString(),
          }, { onConflict: 'txid' });
          
          if (depositError) console.error("[Webhook] Deposit Error:", depositError);
      }

      // 3. Send to Utmify
      try {
        await sendToUtmify(data, status, approvedDate);
      } catch (utmifyErr) {
        console.error("[Webhook] Utmify Error:", utmifyErr);
        // Don't fail the whole request if Utmify is down
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Webhook] Main Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendToUtmify(data: any, status: string, approvedDate: string | null) {
  const payload = {
    orderId: data.txid || data.order_id || crypto.randomUUID(),
    platform: "BetLion",
    paymentMethod: "pix",
    status: status,
    createdAt: new Date().toISOString(),
    approvedDate: approvedDate,
    customer: {
      name: data.name || "Cliente",
      email: data.email || "email@email.com",
      phone: data.phone || "",
      document: data.cpf || data.document || "",
      ip: data.ip || "",
    },
    products: [
      {
        id: "deposit",
        name: "Depósito",
        priceInCents: Math.round(parseFloat(data.amount || "0") * 100),
        quantity: 1
      },
    ],
    trackingParameters: {
      src: data.src,
      sck: data.sck,
      utm_source: data.utm_source,
      utm_campaign: data.utm_campaign,
      utm_medium: data.utm_medium,
      utm_content: data.utm_content,
      utm_term: data.utm_term,
    }
  };

  const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": UTMIFY_API_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Utmify] API Error (${response.status}):`, errorText);
  } else {
    console.log(`[Utmify] Success for ${status}`);
  }
}
