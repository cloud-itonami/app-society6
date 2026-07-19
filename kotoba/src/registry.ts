/**
 * society6 kotoba — kotoba-E2E registry.
 *
 * Plaintext path (cofogService): sdk.write / sdk.read — public COFOG taxonomy.
 * E2E path (constituentScore): sdk.encryptedWrite / sdk.encryptedRead — per-
 * person well-becoming score sealed in the kotoba envelope (ADR-2605181100),
 * read-cap = owner DID (+ explicit recipients). The substrate never sees a
 * person's score in plaintext.
 *
 * STAYS etzhayyim (consent-capability): cross-app SQL competence/resilience compute
 * (dojo RW) + WSend promotion notification execution. The resulting record
 * migrates here E2E; only those acts stay etzhayyim.
 */

import type { Etzhayyim } from "@etzhayyim/sdk";
import {
  COFOG_COLLECTION,
  SCORE_INNER_TYPE,
  cofogDidFor,
  cofogRkey,
  scoreRkey,
  isUint,
  rankFor,
  weightedTotal,
  type CofogServiceRecord,
  type CofogServiceView,
  type ConstituentScoreBody,
  type ConstituentScoreView,
  type CoverageInput,
  type CoverageOutput,
  type GetCofogInput,
  type GetCofogOutput,
  type GetScoreInput,
  type GetScoreOutput,
  type ListCofogInput,
  type ListCofogOutput,
  type ListScoresInput,
  type ListScoresOutput,
  type RecordScoreInput,
  type RecordScoreOutput,
  type RegisterCofogInput,
  type RegisterCofogOutput,
} from "./types.js";

const PAGE_LIMIT = 100;
const DEFAULT_MAX_SCAN = 10_000;

// ─── COFOG service (PLAINTEXT) ──────────────────────────────────────

export async function registerCofog(e: Etzhayyim, input: RegisterCofogInput): Promise<RegisterCofogOutput> {
  if (!input.cofogCode || !input.label || !input.division) return { status: "rejected", error: "missingRequiredFields" };
  const rkey = cofogRkey(input.cofogCode);
  const existing = await e.read<CofogServiceRecord>({ collection: COFOG_COLLECTION, rkey }).catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return { status: "alreadyExists", cofogUri: existing.records[0].uri, did: existing.records[0].value.did, cofogCode: input.cofogCode };
  }
  const now = new Date().toISOString();
  const did = cofogDidFor(input.cofogCode);
  const record: CofogServiceRecord = {
    did,
    cofogCode: input.cofogCode,
    label: input.label,
    division: input.division,
    generatedAt: input.generatedAt ?? now,
    createdAt: now,
  };
  const receipt = await e.write({ collection: COFOG_COLLECTION, record: record as unknown as Record<string, unknown>, rkey });
  return { status: "registered", cofogUri: receipt.uri, did, cofogCode: input.cofogCode };
}

export async function getCofog(e: Etzhayyim, input: GetCofogInput): Promise<GetCofogOutput> {
  if (!input.cofogCode) return { error: "invalidCofogCode" };
  const resp = await e.read<CofogServiceRecord>({ collection: COFOG_COLLECTION, rkey: cofogRkey(input.cofogCode) }).catch(() => ({ records: [] }));
  const hit = resp.records[0];
  if (!hit?.value) return { error: "notFound" };
  return { cofog: { ...hit.value, cofogUri: hit.uri } };
}

/** FK existence check (used before recording a score against a COFOG code). */
export async function cofogExists(e: Etzhayyim, cofogCode: string): Promise<boolean> {
  const resp = await e.read<CofogServiceRecord>({ collection: COFOG_COLLECTION, rkey: cofogRkey(cofogCode) }).catch(() => ({ records: [] }));
  return !!resp.records[0]?.value;
}

export async function listCofog(e: Etzhayyim, input: ListCofogInput = {}): Promise<ListCofogOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<CofogServiceRecord>({ collection: COFOG_COLLECTION, cursor: input.cursor, limit });
  const items: CofogServiceView[] = resp.records
    .filter((r) => !input.division || r.value.division === input.division)
    .map((r) => ({ ...r.value, cofogUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

// ─── Constituent well-becoming score (E2E-ENCRYPTED, PII) ───────────

export async function recordScore(e: Etzhayyim, input: RecordScoreInput): Promise<RecordScoreOutput> {
  if (!input.constituentDid || !input.cofogCode) return { status: "rejected", error: "missingRequiredFields" };
  const axes = {
    engagement: input.engagement,
    competence: input.competence,
    contribution: input.contribution,
    growth: input.growth,
    resilience: input.resilience,
  };
  for (const v of Object.values(axes)) {
    if (!isUint(v)) return { status: "rejected", error: "invalidAxisScore" };
  }
  // FK: the referenced COFOG service must exist (plaintext catalog).
  if (!(await cofogExists(e, input.cofogCode))) return { status: "rejected", error: "unknownCofogCode" };

  const totalScore = weightedTotal(axes);
  const tier = rankFor(totalScore);
  const body: ConstituentScoreBody = {
    constituentDid: input.constituentDid,
    cofogCode: input.cofogCode,
    ...axes,
    totalScore,
    rank: tier.rank,
    rankDisplay: tier.display,
    rankColor: tier.color,
    assessedAt: input.assessedAt ?? new Date().toISOString(),
  };
  // Read-cap = owner DID (sender, auto-wrapped) + any explicit recipients.
  const receipt = await e.encryptedWrite<Record<string, unknown>>({
    innerType: SCORE_INNER_TYPE,
    record: body as unknown as Record<string, unknown>,
    recipients: input.recipients ?? [],
    rkey: scoreRkey(input.constituentDid),
  });
  return {
    status: "recorded",
    uri: receipt.uri,
    keyId: receipt.keyId,
    constituentDid: input.constituentDid,
    totalScore,
    rank: tier.rank,
    rankDisplay: tier.display,
  };
}

async function scanScores(e: Etzhayyim, maxScan: number): Promise<ConstituentScoreView[]> {
  const out: ConstituentScoreView[] = [];
  let cursor: string | undefined;
  while (out.length < maxScan) {
    const page = await e.encryptedRead<ConstituentScoreBody>({ innerType: SCORE_INNER_TYPE, cursor, limit: PAGE_LIMIT });
    for (const r of page.records) {
      out.push({ ...r.value, uri: r.uri, sender: r.sender, createdAt: r.createdAt });
    }
    if (!page.cursor || page.records.length === 0) break;
    cursor = page.cursor;
  }
  return out;
}

export async function listScores(e: Etzhayyim, input: ListScoresInput = {}): Promise<ListScoresOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const all = await scanScores(e, DEFAULT_MAX_SCAN);
  const filtered = all.filter((s) => !input.cofogCode || s.cofogCode === input.cofogCode);
  return { items: filtered.slice(0, limit), total: filtered.length };
}

export async function getScore(e: Etzhayyim, input: GetScoreInput): Promise<GetScoreOutput> {
  if (!input.constituentDid) return { error: "invalidConstituentDid" };
  const all = await scanScores(e, DEFAULT_MAX_SCAN);
  const found = all.find((s) => s.constituentDid === input.constituentDid);
  if (!found) return { error: "notFound" };
  return { score: found };
}

// ─── Coverage rollup ────────────────────────────────────────────────

export async function coverage(e: Etzhayyim, input: CoverageInput = {}): Promise<CoverageOutput> {
  const maxScan = Math.min(input.maxScan ?? DEFAULT_MAX_SCAN, DEFAULT_MAX_SCAN);
  const cofogByDivision: Record<string, number> = {};
  let cofogServiceCount = 0;
  let cursor: string | undefined;
  while (cofogServiceCount < maxScan) {
    const page = await e.read<CofogServiceRecord>({ collection: COFOG_COLLECTION, cursor, limit: PAGE_LIMIT });
    for (const r of page.records) {
      cofogByDivision[r.value.division] = (cofogByDivision[r.value.division] ?? 0) + 1;
      cofogServiceCount += 1;
    }
    if (!page.cursor || page.records.length < PAGE_LIMIT) break;
    cursor = page.cursor;
  }
  const constituentScoreCount = (await scanScores(e, maxScan)).length;
  return {
    cofogServiceCount,
    constituentScoreCount,
    cofogByDivision,
    truncated: cofogServiceCount >= maxScan || constituentScoreCount >= maxScan,
  };
}
