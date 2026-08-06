/**
 * Automated KYC verification pipeline.
 * Runs structured checks on submitted identity documents and produces
 * a score + decision: APPROVED | REJECTED | REVIEW.
 *
 * External provider hooks (Smile Identity, etc.) can be added when API keys exist.
 */

export type KycAutoInput = {
  accountName: string;
  fullLegalName: string;
  nationalIdNumber: string;
  nationalIdUrl: string;
  selfieWithIdUrl: string;
  videoKycUrl: string;
  videoLanguage?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type KycCheck = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  detail: string;
};

export type KycAutoResult = {
  score: number; // 0–100
  decision: "APPROVED" | "REJECTED" | "REVIEW";
  checks: KycCheck[];
  summary: string;
};

function isHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeImage(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || url.includes("/image/upload");
}

function looksLikeVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("/video/upload");
}

/** Normalize names for fuzzy compare */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token overlap ratio between two names (0–1) */
function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(" ").filter((x) => x.length > 1));
  const tb = new Set(normalizeName(b).split(" ").filter((x) => x.length > 1));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

/** Malawi-oriented ID: letters/digits, reasonable length */
function validateNationalId(id: string): { ok: boolean; detail: string } {
  const cleaned = id.replace(/[\s-]/g, "");
  if (cleaned.length < 5 || cleaned.length > 20) {
    return { ok: false, detail: "ID number length should be between 5 and 20 characters" };
  }
  if (!/^[A-Za-z0-9]+$/.test(cleaned)) {
    return { ok: false, detail: "ID number contains invalid characters" };
  }
  // Reject obviously fake patterns
  if (/^0+$|^1+$|^(12345)/.test(cleaned)) {
    return { ok: false, detail: "ID number looks invalid" };
  }
  return { ok: true, detail: "ID format acceptable" };
}

/**
 * Optional: HEAD/GET check that URL is reachable (best-effort, short timeout).
 */
async function urlReachable(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) return true;
    // Some CDNs block HEAD — try range GET
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 4000);
    const res2 = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: ctrl2.signal,
    });
    clearTimeout(t2);
    return res2.ok || res2.status === 206;
  } catch {
    return false;
  }
}

export async function runAutomatedKyc(
  input: KycAutoInput,
  opts?: { autoApproveMinScore?: number; autoApproveEnabled?: boolean }
): Promise<KycAutoResult> {
  const minScore = opts?.autoApproveMinScore ?? 80;
  const autoApproveEnabled = opts?.autoApproveEnabled ?? true;
  const checks: KycCheck[] = [];

  // 1. Legal name present
  const nameOk = input.fullLegalName.trim().length >= 3;
  checks.push({
    id: "legal_name",
    label: "Legal name provided",
    passed: nameOk,
    weight: 10,
    detail: nameOk ? "Legal name present" : "Legal name missing or too short",
  });

  // 2. Name consistency with account
  const sim = nameSimilarity(input.accountName, input.fullLegalName);
  const nameMatch = sim >= 0.34; // at least one shared token typically
  checks.push({
    id: "name_match",
    label: "Name matches account",
    passed: nameMatch,
    weight: 15,
    detail: nameMatch
      ? `Name similarity ${(sim * 100).toFixed(0)}%`
      : `Low name similarity (${(sim * 100).toFixed(0)}%) — may need human review`,
  });

  // 3. National ID format
  const idCheck = validateNationalId(input.nationalIdNumber);
  checks.push({
    id: "id_format",
    label: "National ID format",
    passed: idCheck.ok,
    weight: 15,
    detail: idCheck.detail,
  });

  // 4–6. Document URLs
  const idUrlOk = isHttpsUrl(input.nationalIdUrl) && looksLikeImage(input.nationalIdUrl);
  checks.push({
    id: "id_document",
    label: "National ID image",
    passed: idUrlOk,
    weight: 15,
    detail: idUrlOk ? "HTTPS image URL OK" : "National ID must be a valid image URL",
  });

  const selfieOk =
    isHttpsUrl(input.selfieWithIdUrl) && looksLikeImage(input.selfieWithIdUrl);
  checks.push({
    id: "selfie",
    label: "Selfie with ID",
    passed: selfieOk,
    weight: 15,
    detail: selfieOk ? "HTTPS image URL OK" : "Selfie must be a valid image URL",
  });

  const videoOk = isHttpsUrl(input.videoKycUrl) && looksLikeVideo(input.videoKycUrl);
  checks.push({
    id: "video",
    label: "Verification video",
    passed: videoOk,
    weight: 15,
    detail: videoOk ? "HTTPS video URL OK" : "Verification video must be a valid video URL",
  });

  // 7. Language
  const lang = (input.videoLanguage || "").toUpperCase();
  const langOk = lang === "EN" || lang === "NY" || lang === "CHICHEWA";
  checks.push({
    id: "language",
    label: "Video language",
    passed: langOk || !input.videoLanguage,
    weight: 5,
    detail: langOk || !input.videoLanguage ? `Language: ${lang || "not set"}` : "Unexpected language code",
  });

  // 8. Contact channels
  const hasContact = !!(input.email || input.phone);
  checks.push({
    id: "contact",
    label: "Contact on file",
    passed: hasContact,
    weight: 5,
    detail: hasContact ? "Email/phone present" : "No contact channel",
  });

  // 9. Reachability (best-effort)
  const [idReach, selfieReach, videoReach] = await Promise.all([
    idUrlOk ? urlReachable(input.nationalIdUrl) : Promise.resolve(false),
    selfieOk ? urlReachable(input.selfieWithIdUrl) : Promise.resolve(false),
    videoOk ? urlReachable(input.videoKycUrl) : Promise.resolve(false),
  ]);
  const reachOk = idReach && selfieReach && videoReach;
  checks.push({
    id: "reachable",
    label: "Documents reachable",
    passed: reachOk,
    weight: 5,
    detail: reachOk
      ? "All media URLs responded"
      : `Reachability: ID=${idReach} selfie=${selfieReach} video=${videoReach}`,
  });

  // Score
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);

  const hardFail = checks.filter(
    (c) =>
      !c.passed &&
      ["legal_name", "id_format", "id_document", "selfie", "video"].includes(c.id)
  );

  let decision: KycAutoResult["decision"];
  if (hardFail.length > 0) {
    decision = "REJECTED";
  } else if (autoApproveEnabled && score >= minScore && nameMatch) {
    decision = "APPROVED";
  } else if (score >= 60) {
    decision = "REVIEW";
  } else {
    decision = "REJECTED";
  }

  // Soft: low name match → force human review even if score high
  if (decision === "APPROVED" && !nameMatch) {
    decision = "REVIEW";
  }

  const summary =
    decision === "APPROVED"
      ? `Automated checks passed (score ${score}). KYC auto-approved.`
      : decision === "REJECTED"
        ? `Automated checks failed (score ${score}). ${hardFail.map((c) => c.label).join(", ") || "Score too low"}.`
        : `Score ${score} — human review required.`;

  return { score, decision, checks, summary };
}
