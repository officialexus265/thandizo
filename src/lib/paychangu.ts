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

/** Malawi mobile operator detection from phone number */
export function detectMalawiOperator(phone: string): { operator: "airtel" | "tnm" | null; refId: string | null; normalized: string } {
  const digits = phone.replace(/\D/g, "");
  // Normalize to local 0XXXXXXXXX or keep international
  let local = digits;
  if (local.startsWith("265")) local = "0" + local.slice(3);
  if (!local.startsWith("0") && local.length === 9) local = "0" + local;

  // Airtel Malawi: 099, 098, 097 (common)
  // TNM: 088, 089, 086
  const prefix3 = local.slice(0, 3);
  if (["099", "098", "097"].includes(prefix3)) {
    return { operator: "airtel", refId: process.env.PAYCHANGU_AIRTEL_REF || "airtel", normalized: local };
  }
  if (["088", "089", "086"].includes(prefix3)) {
    return { operator: "tnm", refId: process.env.PAYCHANGU_TNM_REF || "tnm", normalized: local };
  }
  // Fallback: try with +265 format for API
  const intl = local.startsWith("0") ? "265" + local.slice(1) : digits;
  return { operator: null, refId: null, normalized: intl };
}

export interface MobileMoneyPayoutParams {
  phone: string;
  amount: number;
  chargeId: string; // unique ref
  mobileMoneyOperatorRefId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * PayChangu Mobile Money Payout
 * POST https://api.paychangu.com/mobile-money/payouts/initialize
 */
export async function initiateMobileMoneyPayout(params: MobileMoneyPayoutParams) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error("PAYCHANGU_SECRET_KEY is not set");

  const body = {
    mobile_money_operator_ref_id: params.mobileMoneyOperatorRefId,
    mobile: params.phone,
    amount: String(params.amount),
    charge_id: params.chargeId,
    email: params.email || undefined,
    first_name: params.firstName || undefined,
    last_name: params.lastName || undefined,
  };

  const res = await fetch(`${PAYCHANGU_API}/mobile-money/payouts/initialize`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || "PayChangu payout failed");
  }

  return data;
}
