/**
 * society6 kotoba — kotoba-E2E split (COFOG well-becoming Kyu/Dan portal).
 *
 * Per ADR-2606011400 (Consensys product-front / infra-back) + ADR-2605172400
 * (3-axis) + ADR-2605181100 (kotoba E2E encrypted-record envelope). Founder
 * directive 2026-06-03: PII / per-person-scores migrate to etzhayyim when made
 * safe via kotoba E2E.
 *
 * SPLIT:
 *   PUBLIC (plaintext AT records) — COFOG service catalog: the Classification
 *   of Functions of Government reference data (division/group/class codes +
 *   labels). Open government taxonomy, no subject PII. Frontable open metadata.
 *   Also the rank-ladder reference (kyu/dan thresholds + colors) is public
 *   constants derived in the registry, not a write target.
 *
 *   SENSITIVE / PII (kotoba E2E, com.etzhayyim.encrypted.record) — per-person
 *   well-becoming scores: a constituent's 5-axis assessment + total score +
 *   kyu/dan rank. Per-person growth scores are confidential, so each is sealed
 *   via sdk.encryptedWrite (read-cap = owner DID + explicit recipients e.g. the
 *   constituent themselves / a mentor). The substrate never sees a person's
 *   score in plaintext. The public COFOG catalog stays plaintext.
 *
 *   STAYS etzhayyim (consumed via consent-capability, NOT a collection) — the
 *   cross-app SQL competence/resilience computation (dojo drill avg_score +
 *   AAR ratio via RisingWave) and the WSend rank-promotion notification
 *   EXECUTION. These are the regulated *acts* / infra inference; the resulting
 *   score record migrates here E2E, only the computation/dispatch stays etzhayyim.
 *
 * AT-Lexicon: no float. 5-axis scores + total are integers; rank kyu/dan as
 * signed integer (kyu = negative-to-1, dan = positive). axis weights are not
 * stored (constants). Colors are hex strings.
 */

// Plaintext public collection.
export const COFOG_COLLECTION = "com.etzhayyim.apps.society6.cofogService";
// E2E inner-type NSID (body shape inside the encrypted envelope).
export const SCORE_INNER_TYPE = "com.etzhayyim.apps.society6.constituentScore";

export const SOCIETY6_DID_PREFIX = "did:web:society6.etzhayyim.com:" as const;

// ─── COFOG service (PLAINTEXT, public taxonomy) ─────────────────────

export interface CofogServiceRecord {
  did: string;
  cofogCode: string;
  label: string;
  division: string;
  generatedAt: string;
  createdAt: string;
}
export interface CofogServiceView extends CofogServiceRecord {
  cofogUri: string;
}
export interface RegisterCofogInput {
  cofogCode: string;
  label: string;
  division: string;
  generatedAt?: string;
}
export interface RegisterCofogOutput {
  status: "registered" | "alreadyExists" | "rejected";
  cofogUri?: string;
  did?: string;
  cofogCode?: string;
  error?: string;
}
export interface GetCofogInput {
  cofogCode: string;
}
export interface GetCofogOutput {
  cofog?: CofogServiceView;
  error?: string;
}
export interface ListCofogInput {
  division?: string;
  limit?: number;
  cursor?: string;
}
export interface ListCofogOutput {
  items: CofogServiceView[];
  cursor?: string;
  total: number;
}

// ─── Constituent well-becoming score (E2E-ENCRYPTED, PII) ───────────

export interface ConstituentScoreBody {
  constituentDid: string;
  cofogCode: string;
  /** 5 axes, each integer >= 0. */
  engagement: number;
  competence: number;
  contribution: number;
  growth: number;
  resilience: number;
  /** weighted integer total. */
  totalScore: number;
  /** signed: kyu 6..1 = -6..-1, dan 1..10 = 1..10. */
  rank: number;
  rankDisplay: string;
  rankColor: string;
  assessedAt: string;
}
export interface ConstituentScoreView extends ConstituentScoreBody {
  uri: string;
  sender: string;
  createdAt: string;
}
export interface RecordScoreInput {
  constituentDid: string;
  cofogCode: string;
  engagement: number;
  competence: number;
  contribution: number;
  growth: number;
  resilience: number;
  assessedAt?: string;
  /** Extra DIDs to grant read-cap (owner always included). */
  recipients?: string[];
}
export interface RecordScoreOutput {
  status: "recorded" | "rejected";
  uri?: string;
  keyId?: string;
  constituentDid?: string;
  totalScore?: number;
  rank?: number;
  rankDisplay?: string;
  error?: string;
}
export interface ListScoresInput {
  cofogCode?: string;
  limit?: number;
  cursor?: string;
}
export interface ListScoresOutput {
  items: ConstituentScoreView[];
  cursor?: string;
  total: number;
}
export interface GetScoreInput {
  constituentDid: string;
}
export interface GetScoreOutput {
  score?: ConstituentScoreView;
  error?: string;
}

// ─── Coverage rollup ────────────────────────────────────────────────

export interface CoverageInput {
  maxScan?: number;
}
export interface CoverageOutput {
  cofogServiceCount?: number;
  constituentScoreCount?: number;
  cofogByDivision?: Record<string, number>;
  truncated?: boolean;
  error?: string;
}

// ─── Rank ladder (public reference constants) ───────────────────────

export interface RankTier {
  rank: number;
  display: string;
  color: string;
  minScore: number;
}

// Kyu 6 (白) → Kyu 1 (茶) → Dan 1..10 (黒). Min scores from CLAUDE.md ladder.
export const RANK_LADDER: RankTier[] = [
  { rank: -6, display: "Kyu 6", color: "#FFFFFF", minScore: 0 },
  { rank: -5, display: "Kyu 5", color: "#FFD700", minScore: 100 },
  { rank: -4, display: "Kyu 4", color: "#FF8C00", minScore: 300 },
  { rank: -3, display: "Kyu 3", color: "#22C55E", minScore: 600 },
  { rank: -2, display: "Kyu 2", color: "#3B82F6", minScore: 1000 },
  { rank: -1, display: "Kyu 1", color: "#8B4513", minScore: 1500 },
  { rank: 1, display: "Dan 1", color: "#000000", minScore: 2000 },
  { rank: 2, display: "Dan 2", color: "#000000", minScore: 3000 },
  { rank: 3, display: "Dan 3", color: "#000000", minScore: 4000 },
  { rank: 4, display: "Dan 4", color: "#000000", minScore: 5000 },
  { rank: 5, display: "Dan 5", color: "#000000", minScore: 6000 },
  { rank: 6, display: "Dan 6", color: "#000000", minScore: 7000 },
  { rank: 7, display: "Dan 7", color: "#000000", minScore: 8000 },
  { rank: 8, display: "Dan 8", color: "#000000", minScore: 9000 },
  { rank: 9, display: "Dan 9", color: "#000000", minScore: 10000 },
  { rank: 10, display: "Dan 10", color: "#000000", minScore: 11000 },
];

// 5-axis weights (×100 to keep integer arithmetic): eng 25, comp 25, contrib 20,
// growth 20, resil 10. weighted total = sum(axis * weight) / 100.
export const AXIS_WEIGHTS = {
  engagement: 25,
  competence: 25,
  contribution: 20,
  growth: 20,
  resilience: 10,
} as const;

// ─── Validation + helpers ───────────────────────────────────────────

export function isUint(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}
export function weightedTotal(axes: {
  engagement: number;
  competence: number;
  contribution: number;
  growth: number;
  resilience: number;
}): number {
  const raw =
    axes.engagement * AXIS_WEIGHTS.engagement +
    axes.competence * AXIS_WEIGHTS.competence +
    axes.contribution * AXIS_WEIGHTS.contribution +
    axes.growth * AXIS_WEIGHTS.growth +
    axes.resilience * AXIS_WEIGHTS.resilience;
  return Math.floor(raw / 100);
}
export function rankFor(totalScore: number): RankTier {
  let tier = RANK_LADDER[0];
  for (const t of RANK_LADDER) {
    if (totalScore >= t.minScore) tier = t;
  }
  return tier;
}
export function cofogDidFor(code: string): string {
  return `${SOCIETY6_DID_PREFIX}cofog:${code.toLowerCase()}`;
}
export function cofogRkey(code: string): string {
  return `cofog-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
export function scoreRkey(constituentDid: string): string {
  return `score-${constituentDid.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
