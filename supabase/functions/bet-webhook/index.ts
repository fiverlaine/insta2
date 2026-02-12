import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UTMIFY_API_TOKEN = Deno.env.get("UTMIFY_API_TOKEN") || "b2QLAVvHl2HSzQk2Gx5DbTJ9cyKR9otd7fH0";

// =====================================================
// Meta Conversions API (CAPI) Configuration
// Set these in Supabase Dashboard > Edge Functions > Secrets
// =====================================================
const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID") || "";
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN") || "";
const META_API_VERSION = "v21.0";
// Optional: set a test event code for debugging in Meta Events Manager
const META_TEST_EVENT_CODE = Deno.env.get("META_TEST_EVENT_CODE") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// Meta CAPI Helper Functions
// =====================================================

/**
 * SHA-256 hash a string (normalized: trimmed + lowercased)
 * Meta requires PII fields to be hashed before sending
 */
async function sha256(value: string): Promise<string> {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  const encoder = new TextEncoder();
  const d = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", d);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normalize country to 2-letter ISO code (lowercase)
 */
function normalizeCountry(country: string): string {
  if (!country) return "";
  const c = country.trim().toLowerCase();
  if (c.length === 2) return c;
  const map: Record<string, string> = {
    brazil: "br", brasil: "br",
    "united states": "us", "estados unidos": "us", usa: "us",
    portugal: "pt", argentina: "ar", colombia: "co",
    mexico: "mx", chile: "cl",
    spain: "es", espanha: "es", germany: "de",
    france: "fr", italy: "it",
    "united kingdom": "gb", uk: "gb",
    canada: "ca", japan: "jp", china: "cn",
    india: "in", australia: "au",
    paraguay: "py", uruguay: "uy",
    peru: "pe", bolivia: "bo", venezuela: "ve",
    ecuador: "ec",
  };
  return map[c] || c.substring(0, 2);
}

/**
 * Normalize phone: digits only, ensure country code (55 for BR)
 */
function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return digits;
}

/**
 * Build a single Meta CAPI event object with properly hashed user_data
 * 
 * Hashed (SHA-256): em, ph, fn, ln, ct, st, zp, country, external_id
 * NOT hashed: fbc, fbp, client_ip_address, client_user_agent
 */
async function buildMetaEvent(
  eventName: string,
  reqData: any,
  leadData: any,
  clientIp: string,
  customData?: Record<string, any>
): Promise<any> {
  const eventTime = Math.floor(Date.now() / 1000);
  const eventId = crypto.randomUUID();

  // Merge data: prefer current request data, fallback to lead from DB
  const email = reqData.email || leadData?.email || "";
  const phone = reqData.phone || leadData?.phone || "";
  const fullName = reqData.name || leadData?.name || "";
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const city = reqData.city || leadData?.city || "";
  const state = reqData.state || leadData?.state || "";
  const country = reqData.country || leadData?.country || "";
  const postalCode = reqData.postal_code || leadData?.postal_code || "";
  const externalId = reqData.external_id || reqData.visitor_id || reqData.vid || leadData?.visitor_id || "";
  const fbc = reqData.fbc || leadData?.fbc || "";
  const fbp = reqData.fbp || leadData?.fbp || "";
  const userAgent = reqData.user_agent || leadData?.user_agent || "";
  const ip = clientIp || leadData?.ip_address || "";

  // Build user_data with hashed PII
  const userData: Record<string, any> = {};

  // === Hashed fields (SHA-256, normalized lowercase) ===
  if (email) userData.em = [await sha256(email)];
  if (phone) userData.ph = [await sha256(normalizePhone(phone))];
  if (firstName) userData.fn = [await sha256(firstName)];
  if (lastName) userData.ln = [await sha256(lastName)];
  if (city) userData.ct = [await sha256(city)];
  if (state) userData.st = [await sha256(state)];
  if (country) userData.country = [await sha256(normalizeCountry(country))];
  if (postalCode) userData.zp = [await sha256(postalCode)];
  if (externalId) userData.external_id = [await sha256(externalId)];

  // === NOT hashed fields (sent as-is per Meta docs) ===
  if (fbc) userData.fbc = fbc;
  if (fbp) userData.fbp = fbp;
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;

  const metaEvent: Record<string, any> = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    user_data: userData,
    action_source: "website",
  };

  // Add custom_data if provided (e.g., value + currency for PIX events)
  if (customData && Object.keys(customData).length > 0) {
    metaEvent.custom_data = customData;
  }

  return metaEvent;
}

/**
 * Send array of events to Meta Conversions API
 * Non-blocking: errors are logged but don't throw
 */
async function sendToMetaCAPI(events: any[]): Promise<void> {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    console.log("[Meta CAPI] Skipped: not configured");
    return;
  }
  if (!events || events.length === 0) return;

  const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;
  const payload: Record<string, any> = { data: events };
  if (META_TEST_EVENT_CODE) payload.test_event_code = META_TEST_EVENT_CODE;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.events_received) {
      const names = events.map((e: any) => e.event_name).join(", ");
      console.log(`[Meta CAPI] OK: ${result.events_received} event(s): ${names}`);
    } else {
      console.error("[Meta CAPI] Error:", JSON.stringify(result));
    }
  } catch (err) {
    console.error("[Meta CAPI] Failed:", err);
  }
}

// =====================================================
// Main Webhook Handler
// =====================================================

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
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        src: data.src,
        sck: data.sck,
        fbc: data.fbc || null,
        fbp: data.fbp || null,
        ip_address: clientIp,
        user_agent: data.user_agent,
        fingerprint: data.fingerprint,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postal_code: data.postal_code || null,
        updated_at: new Date().toISOString(),
      };

      for (const key of Object.keys(leadPayload)) {
        if (leadPayload[key] === '' || leadPayload[key] === undefined) {
          delete leadPayload[key];
        }
      }

      const { error } = await supabaseClient.from("bet_leads").upsert(
        leadPayload,
        { onConflict: "email" }
      );

      if (error) {
        console.error("[Webhook] Signup Error:", error);
        throw error;
      }

      console.log("[Webhook] Signup saved for:", data.email);

      // =============================================================
      // META CAPI: Send "Lead" + "Cadastrou_bet" on signup
      // =============================================================
      try {
        const [leadEvt, cadastrouEvt] = await Promise.all([
          buildMetaEvent("Lead", data, null, clientIp),
          buildMetaEvent("Cadastrou_bet", data, null, clientIp),
        ]);
        sendToMetaCAPI([leadEvt, cadastrouEvt]).catch((e) =>
          console.error("[Meta CAPI] bg error:", e)
        );
      } catch (metaErr) {
        console.error("[Meta CAPI] signup error:", metaErr);
      }
    }
    
    // =====================================================
    // 2. Process PIX Generation or Payment
    // =====================================================
    else if (event === "pix_generated" || event === "pix_paid") {
      const isPaid = event === "pix_paid";
      const utmifyStatus = isPaid ? "paid" : "waiting_payment";

      const rawTxid = (data.txid || `tx_${Date.now()}`).toString();
      const cleanTxid = rawTxid.split(/\s+/)[0].substring(0, 80);

      let lead_id = null;
      let leadData: any = null;
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

      let pixCreatedAt: string;

      if (isPaid) {
        if (data.pix_created_at) {
          pixCreatedAt = data.pix_created_at;
        } else {
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

      if (!isPaid) {
        depositPayload.created_at = new Date().toISOString();
      }

      const { error: depositError } = await supabaseClient.from("deposits").upsert(
        depositPayload,
        { onConflict: "txid" }
      );

      if (depositError) {
        console.error("[Webhook] Deposit Error:", depositError);
      } else {
        console.log(`[Webhook] Deposit ${utmifyStatus} txid: ${cleanTxid}`);
      }

      if (isPaid && lead_id) {
        await supabaseClient.from("bet_leads").update({
          status: "deposited",
          deposit_value: parseFloat(data.amount || "0"),
          deposit_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", lead_id);
      }

      // =====================================================
      // 3. Send to UTMify API (UNCHANGED - DO NOT MODIFY)
      // =====================================================
      try {
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

      // =============================================================
      // META CAPI: Send events for PIX generation/payment
      // =============================================================
      try {
        const amount = parseFloat(data.amount || "0");
        const pixCustomData = amount > 0 ? { currency: "BRL", value: amount } : undefined;

        if (!isPaid) {
          // PIX Generated -> "InitiateCheckout" + "Gerou_pix_bet"
          const [checkoutEvt, gerouEvt] = await Promise.all([
            buildMetaEvent("InitiateCheckout", data, leadData, clientIp, pixCustomData),
            buildMetaEvent("Gerou_pix_bet", data, leadData, clientIp, pixCustomData),
          ]);
          sendToMetaCAPI([checkoutEvt, gerouEvt]).catch((e) =>
            console.error("[Meta CAPI] bg error:", e)
          );
        } else {
          // PIX Paid -> "Pagou_pix_bet" (NOT Purchase - UTMify handles that)
          const pagouEvt = await buildMetaEvent(
            "Pagou_pix_bet", data, leadData, clientIp, pixCustomData
          );
          sendToMetaCAPI([pagouEvt]).catch((e) =>
            console.error("[Meta CAPI] bg error:", e)
          );
        }
      } catch (metaErr) {
        console.error("[Meta CAPI] pix error:", metaErr);
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

// =====================================================
// UTMify Helper Functions (UNCHANGED - DO NOT MODIFY)
// =====================================================

function formatUtmifyDate(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

async function sendToUtmify(
  data: any,
  orderId: string,
  status: string,
  createdAt: string
) {
  const approvedDate = status === "paid" ? formatUtmifyDate(new Date()) : null;
  const priceInCents = Math.round(parseFloat(data.amount || "0") * 100);

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
        name: "Deposito",
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
