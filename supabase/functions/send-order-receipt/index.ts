import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReceiptOrder {
  id: string;
  order_id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_type: "pickup" | "delivery";
  pickup_option?: "dine_in" | "takeaway" | null;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: "cod" | "upi" | "card";
  payment_status: string;
  placed_at: string;
}

interface ReceiptItemRow {
  item_name: string;
  quantity: number;
  unit_price: number;
  customizations: unknown;
}

interface ReceiptCustomization {
  group_name: string;
  option_name: string;
  price: number;
}

interface ReceiptEmailCopy {
  subject: string;
  heading: string;
  introLead: string;
  title: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toNumber(value: unknown) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(numberValue) ? numberValue : 0;
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

function titleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isFreeOrder(total: number) {
  return total <= 0;
}

function paymentMethodLabel(
  paymentMethod: ReceiptOrder["payment_method"],
  orderType: ReceiptOrder["order_type"],
  total: number,
) {
  if (total <= 0) {
    return "No Payment Required";
  }

  if (paymentMethod === "cod") {
    return orderType === "pickup" ? "Pay at Counter" : "Cash on Delivery";
  }

  if (paymentMethod === "upi") {
    return orderType === "pickup" ? "UPI at Counter" : "UPI";
  }

  return "Card";
}

function serviceModeLabel(order: Pick<ReceiptOrder, "order_type" | "pickup_option">) {
  if (order.order_type === "delivery") return "Delivery";
  return order.pickup_option === "dine_in" ? "Dine In" : "Takeaway";
}

function receiptEmailCopy(order: ReceiptOrder): ReceiptEmailCopy {
  if (isFreeOrder(toNumber(order.total))) {
    return {
      subject: `Your order confirmation for order ${order.order_id}`,
      heading: "Your order confirmation",
      introLead: "Your order has been placed successfully. Here is your bill for order",
      title: "Order Confirmation",
    };
  }

  return {
    subject: `Your payment receipt for order ${order.order_id}`,
    heading: "Your payment receipt",
    introLead: "Your payment has been received. Here is your bill for order",
    title: "Payment Receipt",
  };
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
        customer_phone,
        customer_email,
        order_type,
        subtotal,
        discount,
        delivery_fee,
        total,
        payment_method,
        payment_status,
        placed_at
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
  order: Pick<ReceiptOrder, "customer_email" | "user_id">,
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

function normalizeCustomizations(value: unknown): ReceiptCustomization[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const row = entry as Record<string, unknown>;

    return [
      {
        group_name:
          typeof row.group_name === "string" ? row.group_name : "Option",
        option_name:
          typeof row.option_name === "string" ? row.option_name : "Selected",
        price: toNumber(row.price),
      },
    ];
  });
}

function buildReceiptRows(items: ReceiptItemRow[]) {
  return items.map((item) => {
    const customizations = normalizeCustomizations(item.customizations);
    const customizationTotal = customizations.reduce(
      (sum, customization) => sum + customization.price,
      0,
    );
    const unitTotal = toNumber(item.unit_price) + customizationTotal;
    const lineTotal = unitTotal * Math.max(item.quantity, 1);

    return {
      ...item,
      customizations,
      unitTotal,
      lineTotal,
    };
  });
}

function buildEmailHtml(order: ReceiptOrder, items: ReceiptItemRow[]) {
  const rows = buildReceiptRows(items);
  const placedAt = formatPlacedAt(order.placed_at);
  const paymentLabel = paymentMethodLabel(order.payment_method, order.order_type, toNumber(order.total));
  const serviceMode = serviceModeLabel(order);
  const copy = receiptEmailCopy(order);

  const itemRowsHtml = rows
    .map((item) => {
      const customizationHtml = item.customizations.length
        ? `
          <div style="margin-top:8px; font-size:13px; color:#6b7280;">
            ${item.customizations
              .map((customization) =>
                `${escapeHtml(customization.group_name)}: ${escapeHtml(customization.option_name)}${customization.price > 0 ? ` (+${formatCurrency(customization.price)})` : ""}`,
              )
              .join("<br />")}
          </div>
        `
        : "";

      return `
        <tr>
          <td style="padding:16px 0; border-bottom:1px solid #e5e7eb; vertical-align:top;">
            <div style="font-size:15px; font-weight:700; color:#111827;">
              ${escapeHtml(item.item_name)}
            </div>
            <div style="margin-top:4px; font-size:13px; color:#6b7280;">
              ${item.quantity} x ${formatCurrency(item.unitTotal)}
            </div>
            ${customizationHtml}
          </td>
          <td style="padding:16px 0; border-bottom:1px solid #e5e7eb; text-align:right; vertical-align:top; font-size:15px; font-weight:700; color:#111827;">
            ${formatCurrency(item.lineTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  const discountHtml = order.discount > 0
    ? `
      <tr>
        <td style="padding:6px 0; color:#6b7280;">Discount</td>
        <td style="padding:6px 0; text-align:right; color:#047857; font-weight:700;">
          -${formatCurrency(toNumber(order.discount))}
        </td>
      </tr>
    `
    : "";

  const deliveryFeeHtml = order.delivery_fee > 0
    ? `
      <tr>
        <td style="padding:6px 0; color:#6b7280;">Delivery Fee</td>
        <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">
          ${formatCurrency(toNumber(order.delivery_fee))}
        </td>
      </tr>
    `
    : "";

  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0; background:#f5f5f4; font-family:Arial, Helvetica, sans-serif; color:#111827;">
        <div style="max-width:680px; margin:0 auto; padding:32px 16px;">
          <div style="background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 40px rgba(17,24,39,0.08);">
            <div style="background:linear-gradient(135deg, #7c2d12, #f59e0b); padding:28px 32px; color:#ffffff;">
              <div style="font-size:13px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.9;">
                The Supreme Waffle
              </div>
              <h1 style="margin:10px 0 0; font-size:28px; line-height:1.2;">
                ${escapeHtml(copy.heading)}
              </h1>
              <p style="margin:10px 0 0; font-size:15px; opacity:0.95;">
                ${escapeHtml(copy.introLead)} <strong>${escapeHtml(order.order_id)}</strong>.
              </p>
            </div>

            <div style="padding:28px 32px;">
              <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
                <tr>
                  <td style="padding:0 0 8px; color:#6b7280; font-size:13px;">Customer</td>
                  <td style="padding:0 0 8px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(order.customer_name)}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px; color:#6b7280; font-size:13px;">Phone</td>
                  <td style="padding:0 0 8px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(order.customer_phone)}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px; color:#6b7280; font-size:13px;">Order ID</td>
                  <td style="padding:0 0 8px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(order.order_id)}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px; color:#6b7280; font-size:13px;">Placed</td>
                  <td style="padding:0 0 8px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(placedAt)}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px; color:#6b7280; font-size:13px;">Order Type</td>
                  <td style="padding:0 0 8px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(titleCase(order.order_type))}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px; color:#6b7280; font-size:13px;">Service Mode</td>
                  <td style="padding:0 0 8px; text-align:right; font-size:14px; font-weight:700;">${escapeHtml(serviceMode)}</td>
                </tr>
                <tr>
                  <td style="padding:0; color:#6b7280; font-size:13px;">Payment</td>
                  <td style="padding:0; text-align:right; font-size:14px; font-weight:700;">
                    ${escapeHtml(paymentLabel)} (${escapeHtml(titleCase(order.payment_status))})
                  </td>
                </tr>
              </table>

              <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; margin-bottom:12px;">
                Items
              </div>
              <table style="width:100%; border-collapse:collapse;">
                ${itemRowsHtml}
              </table>

              <table style="width:100%; border-collapse:collapse; margin-top:24px;">
                <tr>
                  <td style="padding:6px 0; color:#6b7280;">Subtotal</td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">
                    ${formatCurrency(toNumber(order.subtotal))}
                  </td>
                </tr>
                ${discountHtml}
                ${deliveryFeeHtml}
                <tr>
                  <td style="padding:14px 0 0; border-top:1px solid #e5e7eb; font-size:16px; font-weight:800; color:#111827;">
                    Total
                  </td>
                  <td style="padding:14px 0 0; border-top:1px solid #e5e7eb; text-align:right; font-size:18px; font-weight:800; color:#92400e;">
                    ${formatCurrency(toNumber(order.total))}
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildEmailText(order: ReceiptOrder, items: ReceiptItemRow[]) {
  const rows = buildReceiptRows(items);
  const paymentLabel = paymentMethodLabel(order.payment_method, order.order_type, toNumber(order.total));
  const serviceMode = serviceModeLabel(order);
  const copy = receiptEmailCopy(order);
  const itemLines = rows
    .map((item) => {
      const customizationLines = item.customizations
        .map((customization) =>
          `  - ${customization.group_name}: ${customization.option_name}${customization.price > 0 ? ` (+${formatCurrency(customization.price)})` : ""}`,
        )
        .join("\n");

      return [
        `${item.item_name} x ${item.quantity} - ${formatCurrency(item.lineTotal)}`,
        customizationLines,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const totals = [
    `Subtotal: ${formatCurrency(toNumber(order.subtotal))}`,
    order.discount > 0
      ? `Discount: -${formatCurrency(toNumber(order.discount))}`
      : "",
    order.delivery_fee > 0
      ? `Delivery Fee: ${formatCurrency(toNumber(order.delivery_fee))}`
      : "",
    `Total: ${formatCurrency(toNumber(order.total))}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "The Supreme Waffle",
    copy.title,
    "",
    `${copy.introLead} ${order.order_id}.`,
    "",
    `Order ID: ${order.order_id}`,
    `Customer: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
    `Placed: ${formatPlacedAt(order.placed_at)}`,
    `Order Type: ${titleCase(order.order_type)}`,
    `Service Mode: ${serviceMode}`,
    `Payment: ${paymentLabel} (${titleCase(order.payment_status)})`,
    "",
    "Items:",
    itemLines,
    "",
    totals,
  ].join("\n");
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    const fromEmail = Deno.env.get("ORDER_RECEIPT_FROM_EMAIL")?.trim();
    const fromName = Deno.env.get("ORDER_RECEIPT_FROM_NAME")?.trim() ||
      "The Supreme Waffle";
    const replyTo = Deno.env.get("ORDER_RECEIPT_REPLY_TO_EMAIL")?.trim();

    if (!resendApiKey || !fromEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Receipt email is not configured. Set RESEND_API_KEY and ORDER_RECEIPT_FROM_EMAIL.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
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

    const order = orderData as ReceiptOrder | null;

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (order.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment is not marked as paid yet" }),
        {
          status: 400,
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

    const { data: itemsData, error: itemsError } = await adminClient
      .from("order_items")
      .select("item_name, quantity, unit_price, customizations")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    const items = (itemsData ?? []) as ReceiptItemRow[];

    const copy = receiptEmailCopy(order);
    const from = fromEmail.includes("<")
      ? fromEmail
      : `${fromName} <${fromEmail}>`;

    const emailPayload: Record<string, unknown> = {
      from,
      to: [recipient],
      subject: copy.subject,
      html: buildEmailHtml(order, items),
      text: buildEmailText(order, items),
    };

    if (replyTo) {
      emailPayload.reply_to = replyTo;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `order-receipt-${order.order_id}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(
        typeof resendData?.message === "string"
          ? resendData.message
          : typeof resendData?.error?.message === "string"
            ? resendData.error.message
          : "Failed to send receipt email",
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipient,
        emailId: resendData?.id ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
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
