/**
 * Smile ID Document Verification (job_type 6)
 * Sandbox: https://testapi.smileidentity.com
 * Production: https://api.smileidentity.com
 *
 * Env:
 *   SMILE_PARTNER_ID
 *   SMILE_API_KEY
 *   SMILE_ENV=sandbox|production
 *   SMILE_CALLBACK_URL (optional — defaults to NEXTAUTH_URL/api/kyc/smile/callback)
 *   SMILE_COUNTRY=MW
 *   SMILE_ID_TYPE=NATIONAL_ID
 */
import crypto from "crypto";
import JSZip from "jszip";

export function isSmileConfigured(): boolean {
  return Boolean(process.env.SMILE_PARTNER_ID && process.env.SMILE_API_KEY);
}

function baseUrl() {
  return process.env.SMILE_ENV === "production"
    ? "https://api.smileidentity.com"
    : "https://testapi.smileidentity.com";
}

export function generateSmileSignature(timestamp: string): string {
  const partnerId = process.env.SMILE_PARTNER_ID || "";
  const apiKey = process.env.SMILE_API_KEY || "";
  const hmac = crypto.createHmac("sha256", apiKey);
  hmac.update(timestamp);
  hmac.update(partnerId);
  hmac.update("sid_request");
  return hmac.digest("base64");
}

export function verifySmileSignature(signature: string, timestamp: string): boolean {
  try {
    const expected = generateSmileSignature(timestamp);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

export type SmileDocJobInput = {
  developerId: string;
  nationalIdNumber: string;
  nationalIdUrl: string;
  selfieUrl: string;
  fullLegalName?: string;
  callbackUrl?: string;
};

export type SmileDocJobResult = {
  jobId: string;
  userId: string;
  smileJobId?: string;
  uploadSuccess: boolean;
  message: string;
};

/**
 * Submit Document Verification job (job_type 6):
 * 1) Request upload URL
 * 2) ZIP info.json + selfie + ID images
 * 3) PUT zip to S3 URL
 * Result arrives on callback_url asynchronously.
 */
export async function submitDocumentVerificationJob(
  input: SmileDocJobInput
): Promise<SmileDocJobResult> {
  if (!isSmileConfigured()) {
    throw new Error("Smile ID is not configured (SMILE_PARTNER_ID / SMILE_API_KEY)");
  }

  const partnerId = process.env.SMILE_PARTNER_ID!;
  const country = process.env.SMILE_COUNTRY || "MW";
  const idType = process.env.SMILE_ID_TYPE || "NATIONAL_ID";
  const timestamp = new Date().toISOString();
  const signature = generateSmileSignature(timestamp);
  const jobId = `job_${input.developerId}_${Date.now()}`;
  const userId = `user_${input.developerId}`;
  const fileName = "attachments.zip";

  const callbackUrl =
    input.callbackUrl ||
    process.env.SMILE_CALLBACK_URL ||
    `${(process.env.NEXTAUTH_URL || "").replace(/\/$/, "")}/api/kyc/smile/callback`;

  // 1. Prep upload
  const prepBody = {
    file_name: fileName,
    smile_client_id: partnerId,
    partner_params: {
      job_id: jobId,
      user_id: userId,
      job_type: 6,
      developer_id: input.developerId,
    },
    model_parameters: {},
    callback_url: callbackUrl,
    source_sdk: "rest_api",
    source_sdk_version: "1.0.0",
    timestamp,
    signature,
  };

  const prepRes = await fetch(`${baseUrl()}/v1/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prepBody),
  });
  const prepJson = (await prepRes.json()) as any;
  if (!prepRes.ok) {
    throw new Error(
      prepJson?.error || prepJson?.message || `Smile upload prep failed (${prepRes.status})`
    );
  }

  const uploadUrl = prepJson.upload_url || prepJson.UploadUrl || prepJson.uploadUrl;
  const smileJobId = String(prepJson.smile_job_id || prepJson.SmileJobID || jobId);
  if (!uploadUrl) {
    throw new Error("Smile ID did not return an upload_url");
  }

  // 2. Build info.json + images
  const [selfieB64, idB64] = await Promise.all([
    fetchImageAsBase64(input.selfieUrl),
    fetchImageAsBase64(input.nationalIdUrl),
  ]);

  const info = {
    package_information: {
      apiVersion: { buildNumber: 0, majorVersion: 2, minorVersion: 0 },
    },
    id_info: {
      country,
      id_type: idType,
      id_number: input.nationalIdNumber || "",
      entered: true,
    },
    images: [
      // 2 = selfie base64, 3 = ID card base64 (Smile conventions)
      { image_type_id: 2, file_name: "", image: selfieB64 },
      { image_type_id: 3, file_name: "", image: idB64 },
    ],
  };

  const zip = new JSZip();
  zip.file("info.json", JSON.stringify(info));
  const zipBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  // 3. PUT zip to S3
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/zip",
    },
    body: new Uint8Array(zipBuf),
  });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Error(`Smile zip upload failed (${putRes.status}): ${text.slice(0, 200)}`);
  }

  return {
    jobId,
    userId,
    smileJobId,
    uploadSuccess: true,
    message: "Document verification job submitted to Smile ID",
  };
}

/** Map Smile callback Actions / ResultCode to our KYC decision */
export function interpretSmileResult(body: any): {
  decision: "APPROVED" | "REJECTED" | "REVIEW";
  code: string;
  text: string;
} {
  const result = body?.result || body?.Result || body;
  const code = String(
    result?.ResultCode || result?.result_code || body?.ResultCode || ""
  );
  const text = String(
    result?.ResultText || result?.result_text || body?.ResultText || "Smile ID result"
  );
  const jobSuccess =
    body?.job_success === true ||
    body?.JobSuccess === true ||
    result?.job_success === true;

  // Common Smile success codes around 0810 / 1012 style — also trust job_success
  const successCodes = ["0810", "1012", "0820", "1020", "0001"];
  if (jobSuccess || successCodes.includes(code)) {
    return { decision: "APPROVED", code, text };
  }
  // Explicit fail codes often 08xx / 09xx
  if (code.startsWith("08") && code !== "0810" && code !== "0820") {
    return { decision: "REJECTED", code, text };
  }
  if (!jobSuccess && code) {
    return { decision: "REJECTED", code, text };
  }
  return { decision: "REVIEW", code, text };
}
