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

    const utmifyParam = data.utmify_param || data.utmify;
    if (!utmifyParam) {
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

      if (error) {
        console.error("[Webhook] Signup Error:", error);
        throw error;
      }
    } 
    
    // 2. Process PIX Generation or Payment
    else if (event === "pix_generated" || event === "pix_paid") {
      const isPaid = event === "pix_paid";
      const status = isPaid ? "paid" : "waiting_payment";
      
      // Tentar encontrar o lead_id pelo email
      let lead_id = null;
      if (data.email) {
        const { data: lead } = await supabaseClient
          .from("bet_leads")
          .select("id")
          .eq("email", data.email)
          .maybeSingle();
        if (lead) lead_id = lead.id;
      }

      // Limpar txid (remover espaços e pegar apenas a parte relevante)
      // O txid original pode vir com texto extra como no print: "8aafd... PIX"
      let rawTxid = (data.txid || `tx_${Date.now()}`).toString();
      let cleanTxid = rawTxid.split(/\s+/)[0].substring(0, 80);

      // Update deposits table
      const { error: depositError } = await supabaseClient.from("deposits").upsert({
        txid: cleanTxid,
        amount: parseFloat(data.amount || "0"),
        status: status,
        lead_id: lead_id,
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
      
      if (depositError) {
        console.error("[Webhook] Deposit Error:", depositError);
      }

      // 3. Send to Utmify
      try {
        await sendToUtmify(data, cleanTxid, status);
      } catch (utmifyErr) {
        console.error("[Webhook] Utmify Error:", utmifyErr);
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

function formatUtmifyDate(date: Date) {
  // Format: YYYY-MM-DD HH:mm:ss
  const iso = date.toISOString();
  return iso.replace('T', ' ').split('.')[0];
}

async function sendToUtmify(data: any, orderId: string, status: string) {
  const now = new Date();
  const approvedDate = status === "paid" ? formatUtmifyDate(now) : null;
  const createdAt = formatUtmifyDate(now);
  const priceInCents = Math.round(parseFloat(data.amount || "0") * 100);

  const payload = {
    orderId: orderId,
    platform: "BetLion",
    paymentMethod: "pix",
    status: status,
    createdAt: createdAt,
    approvedDate: approvedDate,
    customer: {
      name: data.name || "Cliente",
      email: data.email || "email@email.com",
      phone: data.phone || "",
      document: (data.cpf || data.document || "").replace(/\D/g, ''),
      ip: data.ip || "",
    },
    products: [
      {
        id: "deposit",
        name: "Depósito",
        priceInCents: priceInCents,
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
    },
    commission: {
      totalPriceInCents: priceInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: priceInCents
    }
  };

  console.log(`[Utmify] Sending ${status} order ${orderId} to UTMify...`);

  const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": UTMIFY_API_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[Utmify] Error ${response.status}:`, errBody);
  } else {
    console.log(`[Utmify] Success sending to UTMify`);
  }
}
