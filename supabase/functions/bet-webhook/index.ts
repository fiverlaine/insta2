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

    console.log(`[Webhook] Event: ${event}`, JSON.stringify(data));

    const utmifyParam = data.utmify_param || data.utmify;
    if (!utmifyParam) {
       return new Response(JSON.stringify({ success: true, message: "Ignored (No UTMify)" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // Get real IP from request headers if not provided by client
    const clientIp = data.ip || data.ip_address 
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("cf-connecting-ip") 
      || "";

    // =====================================================
    // 1. Process Signup
    // =====================================================
    if (event === "signup") {
      const leadPayload: Record<string, any> = {
        email: data.email,
        phone: data.phone,
        name: data.name || "Cliente",
        document: data.cpf || data.document,
        visitor_id: data.visitor_id || data.vid,
        utmify: utmifyParam,
        // UTMs
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        src: data.src,
        sck: data.sck,
        // Data from UTMify pixel
        fbc: data.fbc || null,
        fbp: data.fbp || null,
        ip_address: clientIp,
        user_agent: data.user_agent,
        fingerprint: data.fingerprint,
        // Geolocation from UTMify pixel
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postal_code: data.postal_code || null,
        // Timestamps
        updated_at: new Date().toISOString(),
      };

      // Remove empty string values to avoid overwriting existing data with blanks
      for (const key of Object.keys(leadPayload)) {
        if (leadPayload[key] === '' || leadPayload[key] === undefined) {
          delete leadPayload[key];
        }
      }

      const { error } = await supabaseClient.from("bet_leads").upsert(
        leadPayload, 
        { onConflict: 'email' }
      );

      if (error) {
        console.error("[Webhook] Signup Error:", error);
        throw error;
      }

      console.log("[Webhook] Signup saved successfully for:", data.email);
    } 
    
    // =====================================================
    // 2. Process PIX Generation or Payment
    // =====================================================
    else if (event === "pix_generated" || event === "pix_paid") {
      const isPaid = event === "pix_paid";
      const utmifyStatus = isPaid ? "paid" : "waiting_payment";
      
      // Clean txid
      let rawTxid = (data.txid || `tx_${Date.now()}`).toString();
      let cleanTxid = rawTxid.split(/\s+/)[0].substring(0, 80);

      // Try to find the lead by email
      let lead_id = null;
      let leadData: any = null;
      
      // Restore email from storage if not in current request
      const email = data.email;
      
      if (email) {
        const { data: lead } = await supabaseClient
          .from("bet_leads")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        if (lead) {
          lead_id = lead.id;
          leadData = lead;
        }
      }

      // If no lead found by email, try fingerprint
      if (!lead_id && data.fingerprint) {
        const { data: lead } = await supabaseClient
          .from("bet_leads")
          .select("*")
          .eq("fingerprint", data.fingerprint)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lead) {
          lead_id = lead.id;
          leadData = lead;
        }
      }

      // Determine the createdAt for UTMify
      // For pix_generated: use current time
      // For pix_paid: try to reuse the timestamp from generation (stored in deposit row or sent by client)
      let pixCreatedAt: string;
      
      if (isPaid) {
        // Try to get original createdAt from client or from existing deposit row
        if (data.pix_created_at) {
          pixCreatedAt = data.pix_created_at;
        } else {
          // Try to find existing deposit by txid
          const { data: existingDeposit } = await supabaseClient
            .from("deposits")
            .select("created_at, metadata")
            .eq("txid", cleanTxid)
            .maybeSingle();
          
          if (existingDeposit?.metadata?.utmify_created_at) {
            pixCreatedAt = existingDeposit.metadata.utmify_created_at;
          } else if (existingDeposit?.created_at) {
            pixCreatedAt = formatUtmifyDate(new Date(existingDeposit.created_at));
          } else {
            pixCreatedAt = formatUtmifyDate(new Date());
          }
        }
      } else {
        pixCreatedAt = data.pix_created_at || formatUtmifyDate(new Date());
      }

      // Upsert deposit
      const depositPayload: Record<string, any> = {
        txid: cleanTxid,
        amount: parseFloat(data.amount || "0"),
        status: utmifyStatus,
        lead_id: lead_id,
        utmify: utmifyParam,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        src: data.src,
        sck: data.sck,
        visitor_id: data.visitor_id || data.vid,
        fingerprint: data.fingerprint,
        fbc: data.fbc || (leadData?.fbc) || null,
        fbp: data.fbp || (leadData?.fbp) || null,
        ip_address: clientIp || (leadData?.ip_address) || null,
        metadata: {
          utmify_created_at: pixCreatedAt,
          event: event,
        },
      };

      // Only set created_at on first insert, not on paid update
      if (!isPaid) {
        depositPayload.created_at = new Date().toISOString();
      }

      const { error: depositError } = await supabaseClient.from("deposits").upsert(
        depositPayload, 
        { onConflict: 'txid' }
      );
      
      if (depositError) {
        console.error("[Webhook] Deposit Error:", depositError);
      } else {
        console.log(`[Webhook] Deposit ${utmifyStatus} saved for txid: ${cleanTxid}`);
      }

      // Also update the lead status if paid
      if (isPaid && lead_id) {
        await supabaseClient.from("bet_leads").update({
          status: "deposited",
          deposit_value: parseFloat(data.amount || "0"),
          deposit_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", lead_id);
      }

      // =====================================================
      // 3. Send to UTMify API
      // =====================================================
      try {
        // Build comprehensive customer data, preferring lead data from DB
        const customerName = data.name || (leadData?.name) || "Cliente";
        const customerEmail = data.email || (leadData?.email) || "";
        const customerPhone = data.phone || (leadData?.phone) || "";
        const customerDocument = (data.cpf || data.document || (leadData?.document) || "").replace(/\D/g, '');
        const customerIp = clientIp || (leadData?.ip_address) || "";
        const customerCountry = data.country || (leadData?.country) || "BR";

        await sendToUtmify({
          ...data,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          document: customerDocument,
          ip: customerIp,
          country: customerCountry,
        }, cleanTxid, utmifyStatus, pixCreatedAt);
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

function formatUtmifyDate(date: Date): string {
  // Format: YYYY-MM-DD HH:mm:ss (UTC as required by UTMify docs)
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

async function sendToUtmify(
  data: any, 
  orderId: string, 
  status: string, 
  createdAt: string
) {
  const approvedDate = status === "paid" ? formatUtmifyDate(new Date()) : null;
  const priceInCents = Math.round(parseFloat(data.amount || "0") * 100);

  // Ensure priceInCents is valid (must be > 0 for UTMify)
  if (priceInCents <= 0) {
    console.warn("[Utmify] Skipping: priceInCents is 0 or negative");
    return;
  }

  const payload = {
    orderId: orderId,
    platform: "BetLion",
    paymentMethod: "pix",
    status: status,
    createdAt: createdAt,
    approvedDate: approvedDate,
    refundedAt: null,
    customer: {
      name: data.name || "Cliente",
      email: data.email || "",
      phone: (data.phone || "").replace(/\D/g, ''),
      document: (data.document || "").replace(/\D/g, ''),
      country: data.country || "BR",
      ip: data.ip || "",
    },
    products: [
      {
        id: "bet_deposit",
        name: "Depósito",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: priceInCents,
      },
    ],
    trackingParameters: {
      src: data.src || null,
      sck: data.sck || null,
      utm_source: data.utm_source || null,
      utm_campaign: data.utm_campaign || null,
      utm_medium: data.utm_medium || null,
      utm_content: data.utm_content || null,
      utm_term: data.utm_term || null,
    },
    commission: {
      totalPriceInCents: priceInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: priceInCents,
    },
  };

  console.log(`[Utmify] Sending ${status} order ${orderId}...`);
  console.log(`[Utmify] Payload:`, JSON.stringify(payload));

  const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": UTMIFY_API_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();
  
  if (!response.ok) {
    console.error(`[Utmify] Error ${response.status}:`, responseBody);
  } else {
    console.log(`[Utmify] Success (${response.status}):`, responseBody);
  }
}
