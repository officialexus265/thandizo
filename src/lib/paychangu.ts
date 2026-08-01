const PAYCHANGU_API = "https://api.paychangu.com";

export interface InitiatePaymentParams {
  amount: number;
  currency: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  txRef: string;
  callbackUrl: string;
  returnUrl: string;
  title: string;
  description: string;
  meta?: Record<string, any>;
}

export async function initiatePayChanguPayment(params: InitiatePaymentParams) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error("PAYCHANGU_SECRET_KEY is not set");

  const body = {
    amount: String(params.amount),
    currency: params.currency,
    email: params.email || undefined,
    first_name: params.firstName || undefined,
    last_name: params.lastName || undefined,
    tx_ref: params.txRef,
    callback_url: params.callbackUrl,
    return_url: params.returnUrl,
    customization: {
      title: params.title,
      description: params.description,
    },
    meta: params.meta || {},
  };

  const res = await fetch(`${PAYCHANGU_API}/payment`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to initiate PayChangu payment");
  }

  return {
    checkoutUrl: data.data.checkout_url as string,
    txRef: data.data.data.tx_ref as string,
  };
}

export async function verifyPayChanguTransaction(txRef: string) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error("PAYCHANGU_SECRET_KEY is not set");

  const res = await fetch(`${PAYCHANGU_API}/verify-payment/${txRef}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const data = await res.json();
  console.error("PayChangu verify raw response:", JSON.stringify(data));
  return data;
}