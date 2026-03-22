import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_email: string;
  smtp_from_name: string;
}

interface ReadyOrder {
  id: string;
  order_id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  order_type: "pickup" | "delivery";
  pickup_option?: "dine_in" | "takeaway" | null;
  total: number;
  payment_status: string;
  placed_at: string;
  status: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatPlacedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function serviceModeLabel(order: Pick<ReadyOrder, "order_type" | "pickup_option">) {
  if (order.order_type === "delivery") return "Delivery";
  return order.pickup_option === "dine_in" ? "Dine In" : "Takeaway";
}

function readyHeadline(order: Pick<ReadyOrder, "order_type" | "pickup_option">) {
  if (order.order_type === "delivery") return "Your order is packed";
  return order.pickup_option === "dine_in"
    ? "Your order is ready to serve"
    : "Your order is ready for pickup";
}

function readyMessage(order: Pick<ReadyOrder, "order_type" | "pickup_option">) {
  if (order.order_type === "delivery") {
    return "Your waffles are packed and will move to the next delivery step shortly.";
  }

  return order.pickup_option === "dine_in"
    ? "Your order is ready at the table service counter."
    : "Your order is ready at the counter. Please show your order ID while collecting it.";
}

function isMissingPickupOptionColumn(error: { code?: string; message?: string } | null) {
  return !!error?.message?.includes("pickup_option") &&
    (error.code === "42703" || error.code === "PGRST204");
}

async function fetchOrderWithPickupFallback(
  adminClient: ReturnType<typeof createClient>,
  orderId: string,
) {
  const baseSelect = `
        id,
        order_id,
        user_id,
        customer_name,
        customer_email,
        order_type,
        total,
        payment_status,
        placed_at,
        status
      `;

  let { data, error } = await adminClient
    .from("orders")
    .select(`${baseSelect}, pickup_option`)
    .eq("order_id", orderId)
    .maybeSingle();

  if (isMissingPickupOptionColumn(error)) {
    ({ data, error } = await adminClient
      .from("orders")
      .select(baseSelect)
      .eq("order_id", orderId)
      .maybeSingle());
  }

  return { data, error };
}

async function resolveRecipientEmail(
  adminClient: ReturnType<typeof createClient>,
  requester: { id: string; email?: string | null } | null,
  order: Pick<ReadyOrder, "customer_email" | "user_id">,
) {
  const customerEmail = order.customer_email.trim();
  if (customerEmail) return customerEmail;

  if (order.user_id) {
    const { data, error } = await adminClient.auth.admin.getUserById(order.user_id);
    const ownerEmail = data.user?.email?.trim() || "";
    if (!error && ownerEmail) return ownerEmail;
  }

  if (requester && order.user_id === requester.id) {
    return requester.email?.trim() || "";
  }

  return "";
}

function buildEmailHtml(order: ReadyOrder) {
  const headline = readyHeadline(order);
  const message = readyMessage(order);
  const serviceMode = serviceModeLabel(order);

  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0; background:#f5f5f4; font-family:Arial, Helvetica, sans-serif; color:#111827;">
        <div style="max-width:680px; margin:0 auto; padding:32px 16px;">
          <div style="background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 40px rgba(17,24,39,0.08);">
            <div style="background:linear-gradient(135deg, #166534, #34d399); padding:28px 32px; color:#ffffff;">
              <div style="font-size:13px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.9;">
                The Supreme Waffle
              </div>
              <h1 style="margin:10px 0 0; font-size:28px; line-height:1.2;">
                ${escapeHtml(headline)}
              </h1>
              <p style="margin:10px 0 0; font-size:15px; opacity:0.95;">
                ${escapeHtml(message)}
              </p>
            </div>

            <div style="padding:28px 32px;">
              <table style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="padding:0 0 10px; color:#6b7280; font-size:13px;">Order ID</td>
                  <td style="padding:0 0 10px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(order.order_id)}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px; color:#6b7280; font-size:13px;">Customer</td>
                  <td style="padding:0 0 10px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(order.customer_name)}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px; color:#6b7280; font-size:13px;">Placed</td>
                  <td style="padding:0 0 10px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(formatPlacedAt(order.placed_at))}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px; color:#6b7280; font-size:13px;">Service</td>
                  <td style="padding:0 0 10px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(serviceMode)}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px; color:#6b7280; font-size:13px;">Payment</td>
                  <td style="padding:0 0 10px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(order.payment_status === "paid" ? "Paid" : "Pending")}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0; border-top:1px solid #e5e7eb; font-size:16px; font-weight:800; color:#111827;">Total</td>
                  <td style="padding:14px 0 0; border-top:1px solid #e5e7eb; text-align:right; font-size:18px; font-weight:800; color:#065f46;">${formatCurrency(order.total)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildEmailText(order: ReadyOrder) {
  const headline = readyHeadline(order);
  const message = readyMessage(order);

  return [
    "The Supreme Waffle",
    headline,
    "",
    message,
    "",
    `Order ID: ${order.order_id}`,
    `Customer: ${order.customer_name}`,
    `Placed: ${formatPlacedAt(order.placed_at)}`,
    `Service: ${serviceModeLabel(order)}`,
    `Payment: ${order.payment_status === "paid" ? "Paid" : "Pending"}`,
    `Total: ${formatCurrency(order.total)}`,
  ].join("\n");
}

async function loadSmtpConfig(
  adminClient: ReturnType<typeof createClient>,
): Promise<SmtpConfig | null> {
  const { data, error } = await adminClient
    .from("site_settings")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_email, smtp_from_name")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to load SMTP config from site_settings:", error);
    return null;
  }

  const config = data as SmtpConfig;
  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
    return null;
  }

  return config;
}

function createSmtpTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port || 587,
    secure: config.smtp_port === 465,
    auth: { user: config.smtp_user, pass: config.smtp_pass },
    tls: { rejectUnauthorized: false },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { orderId } = await req.json() as { orderId?: string };
    if (!orderId?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "orderId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const smtpConfig = await loadSmtpConfig(adminClient);

    if (!smtpConfig) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "SMTP is not configured. Set SMTP settings in the admin panel under Website settings.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : authHeader.trim();
    const isInternalServiceCall = authToken === serviceKey;

    let requester: { id: string; email?: string | null } | null = null;
    let requesterIsStaff = false;

    if (!isInternalServiceCall) {
      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await userClient.auth.getUser();

      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized request" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      requester = user;

      const { data: requesterProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      requesterIsStaff = requesterProfile?.role === "admin" ||
        requesterProfile?.role === "chef";
    }

    const { data: orderData, error: orderError } = await fetchOrderWithPickupFallback(
      adminClient,
      orderId.trim(),
    );
    const order = orderData as ReadyOrder | null;

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!isInternalServiceCall && requester && order.user_id !== requester.id && !requesterIsStaff) {
      return new Response(
        JSON.stringify({ success: false, error: "Order access denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (order.status !== "packed") {
      return new Response(
        JSON.stringify({ success: false, error: "Order is not ready yet" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const recipient = await resolveRecipientEmail(adminClient, requester, order);
    if (!recipient) {
      return new Response(
        JSON.stringify({ success: false, error: "No recipient email found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const transport = createSmtpTransport(smtpConfig);
    const fromEmail = smtpConfig.smtp_from_email || smtpConfig.smtp_user;
    const fromName = smtpConfig.smtp_from_name || "The Supreme Waffle";

    const info = await transport.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: recipient,
      subject: `${readyHeadline(order)} - ${order.order_id}`,
      html: buildEmailHtml(order),
      text: buildEmailText(order),
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipient,
        messageId: info?.messageId ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("send-order-ready-email error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
