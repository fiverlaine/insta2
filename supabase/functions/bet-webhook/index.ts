import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const UTMIFY_API_TOKEN = Deno.env.get("UTMIFY_API_TOKEN") || "b2QLAVvHl2HSzQk2Gx5DbTJ9cyKR9otd7fH0";
const FUNNEL_PARAM = "funnel_id"; // ALTERE AQUI para o parâmetro que você for usar
const FUNNEL_VALUE = "lucasmagnotti"; // Valor esperado para filtrar

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
    const event = body.event; // 'signup', 'pix_generated', 'pix_paid'
    const data = body.data;

    console.log(`[Webhook] Event: ${event}`, data);

    // Validação do funil (filtro)
    // Se o user quiser filtrar e só processar quem tem o parametro utmify
    const utmifyParam = data.utmify_param || data.utmify;
    console.log(`[Webhook] Checking utmify param: ${utmifyParam}`);

    if (!utmifyParam) {
       console.log(`[Webhook] Ignored - Missing 'utmify' param.`);
       return new Response(JSON.stringify({ success: true, message: "Ignored (Filter)" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // Salvar no Supabase
    if (event === "signup") {
      const { error } = await supabaseClient.from("bet_leads").insert({
        email: data.email,
        phone: data.phone,
        name: data.name,
        cpf: data.cpf,
        visitor_id: data.visitor_id,
        fbc: data.fbc,
        fbp: data.fbp,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        fingerprint: data.fingerprint,
        ip_address: data.ip,
        user_agent: data.user_agent,
        // Adicione outros campos conforme necessário e verifique se existem na tabela
      });

      if (error) {
        console.error("[Webhook] Error inserting lead:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    } else if (event === "pix_generated" || event === "pix_paid") {
      const status = event === "pix_generated" ? "waiting_payment" : "paid";
      const approvedDate = event === "pix_paid" ? new Date().toISOString() : null;

      // Upsert deposit (considerando que pix_generated cria e pix_paid atualiza)
      // Precisamos de um ID único para o depósito se possível, ou usar txid
      // O script deve enviar um ID único se tiver, ou geramos um
      // Vamos assumir que 'data.deposit_id' ou 'data.txid' venha do front
      
      const { error: depositError } = await supabaseClient.from("deposits").upsert({
         // Adapte para corresponder às colunas da sua tabela deposits
         amount: data.amount,
         status: status,
         // ... outros campos
         lead_id: data.lead_id, // Se tivermos o ID do lead
         // txid: data.txid
      });
        
      if (depositError) {
          console.error("[Webhook] Error upserting deposit:", depositError);
      }

      // Enviar para Utmify
      await sendToUtmify(data, status, approvedDate);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendToUtmify(data: any, status: string, approvedDate: string | null) {
  const payload = {
    orderId: data.order_id || crypto.randomUUID(), // Use o ID do pedido real se disponível
    platform: "BetLion", // Nome da sua plataforma
    paymentMethod: "pix",
    status: status,
    createdAt: new Date().toISOString(),
    approvedDate: approvedDate,
    refundedAt: null,
    customer: {
      name: data.name || "Cliente",
      email: data.email || "email@email.com",
      phone: data.phone || "",
      document: data.cpf || "",
      country: "BR",
      ip: data.ip || "",
    },
    products: [
      {
        id: "deposit",
        name: "Depósito",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: Math.round(parseFloat(data.amount) * 100),
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
      totalPriceInCents: Math.round(parseFloat(data.amount) * 100),
      gatewayFeeInCents: 0,
      userCommissionInCents: Math.round(parseFloat(data.amount) * 100), // Ajuste conforme necessário
    },
    isTest: false, // Mude para false em produção real se quiser salvar
  };

  console.log(`[Utmify] Sending event ${status}...`, payload);

  const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": UTMIFY_API_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();
  console.log(`[Utmify] Response:`, responseData);
}
