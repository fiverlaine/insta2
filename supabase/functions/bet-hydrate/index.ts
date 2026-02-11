import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { identifier } = await req.json();

    if (!identifier) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Hydrate] Lookup:", identifier);

    const selectFields =
      "email, phone, name, document, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck, utmify, visitor_id, fingerprint, ip_address, city, state, country, postal_code";

    let lead = null;
    const isEmail = identifier.includes("@");

    // 1. Try exact email match
    if (isEmail) {
      const { data } = await supabaseClient
        .from("bet_leads")
        .select(selectFields)
        .eq("email", identifier)
        .maybeSingle();
      lead = data;
    }

    // 2. Try exact phone match
    if (!lead) {
      const { data } = await supabaseClient
        .from("bet_leads")
        .select(selectFields)
        .eq("phone", identifier)
        .maybeSingle();
      lead = data;
    }

    // 3. Try cleaned phone digits (partial match on last 8 digits)
    if (!lead) {
      const cleanDigits = identifier.replace(/\D/g, "");
      if (cleanDigits.length >= 8) {
        const { data } = await supabaseClient
          .from("bet_leads")
          .select(selectFields)
          .ilike("phone", `%${cleanDigits.slice(-8)}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        lead = data;
      }
    }

    if (!lead || !lead.utmify) {
      console.log("[Hydrate] Not found or no utmify param");
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Hydrate] Found:", lead.email, "utmify:", lead.utmify);

    // Return tracking data (include document/cpf as it's needed for PIX)
    return new Response(
      JSON.stringify({
        found: true,
        lead: {
          email: lead.email,
          phone: lead.phone,
          name: lead.name,
          cpf: lead.document,
          fbc: lead.fbc,
          fbp: lead.fbp,
          utm_source: lead.utm_source,
          utm_medium: lead.utm_medium,
          utm_campaign: lead.utm_campaign,
          utm_content: lead.utm_content,
          utm_term: lead.utm_term,
          src: lead.src,
          sck: lead.sck,
          utmify: lead.utmify,
          visitor_id: lead.visitor_id,
          fingerprint: lead.fingerprint,
          ip_address: lead.ip_address,
          city: lead.city,
          state: lead.state,
          country: lead.country,
          postal_code: lead.postal_code,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Hydrate] Error:", error);
    return new Response(
      JSON.stringify({ found: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
