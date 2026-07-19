import {
  asAgentTool,
  createKyselyDb,
  createWorkerExport,
  withCapabilityTags,
  withOCELEvent,
  type ComAtprotoSyncSubscribeReposCommit,
  type HostSDK,
  str,
  decodeJson,
  createCadenceState,
  createInboxBuffer,
  nowISO,
  genID,
  num,
  nsid,
  parseLexiconInput,
} from "@etzhayyim/kotodama-host-sdk";

// ── Constants ──────────────────────────────────────────────────────────

let appId = ""
let actorDID = ""

const enc = new TextEncoder();
// ── Well-Becoming 5-Axis Weights ───────────────────────────────────────

interface AxisWeight {
  name: string;
  weight: number;
}

const AXES: AxisWeight[] = [
  { name: "engagement", weight: 0.25 },
  { name: "competence", weight: 0.25 },
  { name: "contribution", weight: 0.20 },
  { name: "growth", weight: 0.20 },
  { name: "resilience", weight: 0.10 },
];

// ── Rank Ladder ────────────────────────────────────────────────────────

interface RankDef {
  rank: string;
  color: string;
  minScore: number;
}

const RANK_LADDER: RankDef[] = [
  { rank: "kyu6", color: "#FFFFFF", minScore: 0 },
  { rank: "kyu5", color: "#FFD700", minScore: 100 },
  { rank: "kyu4", color: "#FF8C00", minScore: 300 },
  { rank: "kyu3", color: "#22C55E", minScore: 600 },
  { rank: "kyu2", color: "#3B82F6", minScore: 1000 },
  { rank: "kyu1", color: "#8B4513", minScore: 1500 },
  { rank: "dan1", color: "#000000", minScore: 2000 },
  { rank: "dan2", color: "#000000", minScore: 3000 },
  { rank: "dan3", color: "#000000", minScore: 4000 },
  { rank: "dan4", color: "#000000", minScore: 5000 },
  { rank: "dan5", color: "#000000", minScore: 6000 },
  { rank: "dan6", color: "#000000", minScore: 7000 },
  { rank: "dan7", color: "#000000", minScore: 8000 },
  { rank: "dan8", color: "#000000", minScore: 9000 },
  { rank: "dan9", color: "#000000", minScore: 10000 },
  { rank: "dan10", color: "#000000", minScore: 11000 },
];

// ── COFOG Classification (Level 1) ────────────────────────────────────

interface CofogDivision {
  code: string;
  'nameEn': string;
  'nameJa': string;
}

const COFOG_DIVISIONS: CofogDivision[] = [
  { code: "01", 'nameEn': "General public services", 'nameJa': "一般公共サービス" },
  { code: "02", 'nameEn': "Defence", 'nameJa': "防衛" },
  { code: "03", 'nameEn': "Public order and safety", 'nameJa': "公共の秩序・安全" },
  { code: "04", 'nameEn': "Economic affairs", 'nameJa': "経済問題" },
  { code: "05", 'nameEn': "Environmental protection", 'nameJa': "環境保護" },
  { code: "06", 'nameEn': "Housing and community amenities", 'nameJa': "住宅・地域開発" },
  { code: "07", 'nameEn': "Health", 'nameJa': "保健" },
  { code: "08", 'nameEn': "Recreation, culture and religion", 'nameJa': "娯楽・文化・宗教" },
  { code: "09", 'nameEn': "Education", 'nameJa': "教育" },
  { code: "10", 'nameEn': "Social protection", 'nameJa': "社会的保護" },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

// Graph reads/writes (Kysely + Hyperdrive, ADR-0036).
// TODO(society6): vertex_society6_* tables not yet in @etzhayyim/graph-schema — score axes /
// rank queries return neutral defaults until schema lands. Writes use Hyperdrive direct (ADR-0036).

const ACTOR_NANOID = "s6c9m2q1";
const ACTOR_HOST = `did:web:society6.etzhayyim.com`;

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

async function write(_sdk: HostSDK, collection: string, rec: Record<string, unknown>): Promise<void> {
  const kind = camelToSnake(collection);
  const tableName = `vertex_society6_${kind}`;
  const rkey = String(rec.id ?? genID("r"));
  const did = actorDID || ACTOR_HOST;
  const vertexId = `at://${did}/com.etzhayyim.apps.society6.${collection}/${rkey}`;
  await createKyselyDb().insertInto(tableName as any).values({
    vertex_id: vertexId,
    sensitivity_ord: 2,
    owner_did: did,
    actor_id: ACTOR_NANOID,
    ...Object.fromEntries(
      Object.entries(rec).map(([k, v]) => [camelToSnake(k), v]),
    ),
  } as any).execute();
}

// ── Rank Determination ─────────────────────────────────────────────────

function scoreToRank(totalScore: number): RankDef {
  let result = RANK_LADDER[0];
  for (const rank of RANK_LADDER) {
    if (totalScore >= rank.minScore) result = rank;
    else break;
  }
  return result;
}

function rankDisplayName(rank: string): string {
  if (rank.startsWith("kyu_")) return `Kyu ${rank.replace("kyu_", "")}`;
  if (rank.startsWith("dan_")) return `Dan ${rank.replace("dan_", "")}`;
  return rank;
}

// ── Score Calculation ──────────────────────────────────────────────────

// TODO(society6): vertex_s6_event / vertex_dojo_drill / vertex_s6_agent / vertex_s6_service /
// vertex_s6_score_history / vertex_dojo_aar not in @etzhayyim/graph-schema — all axes return 0
async function calculateEngagement(sdk: HostSDK, constituentDid: string): Promise<number> {
  void sdk; void constituentDid;
  return 0;
}

async function calculateCompetence(sdk: HostSDK, constituentDid: string): Promise<number> {
  void sdk; void constituentDid;
  return 0;
}

async function calculateContribution(sdk: HostSDK, constituentDid: string): Promise<number> {
  void sdk; void constituentDid;
  return 0;
}

async function calculateGrowth(sdk: HostSDK, constituentDid: string, currentTotal: number): Promise<number> {
  void sdk; void constituentDid; void currentTotal;
  return 50;
}

async function calculateResilience(sdk: HostSDK, constituentDid: string): Promise<number> {
  void sdk; void constituentDid;
  return 0;
}

interface ScoreBreakdown {
  engagement: number;
  competence: number;
  contribution: number;
  growth: number;
  resilience: number;
  total: number;
}

async function computeFullScore(sdk: HostSDK, constituentDid: string): Promise<ScoreBreakdown> {
  const engagement = await calculateEngagement(sdk, constituentDid);
  const competence = await calculateCompetence(sdk, constituentDid);
  const contribution = await calculateContribution(sdk, constituentDid);
  // For growth, compute a preliminary total without growth axis
  const preliminaryTotal = Math.round(
    engagement * AXES[0].weight +
    competence * AXES[1].weight +
    contribution * AXES[2].weight +
    50 * AXES[3].weight + // placeholder
    0 * AXES[4].weight,
  ) * 20; // scale to rank system range
  const growth = await calculateGrowth(sdk, constituentDid, preliminaryTotal);
  const resilience = await calculateResilience(sdk, constituentDid);

  // Total: weighted sum scaled to rank system (each axis 0-100, weighted, then scaled)
  const weightedSum =
    engagement * AXES[0].weight +
    competence * AXES[1].weight +
    contribution * AXES[2].weight +
    growth * AXES[3].weight +
    resilience * AXES[4].weight;
  // weightedSum is 0-100. Scale to rank range: multiply by factor for progression
  // Max 100 * 1.0 = 100, we want Dan 10 at 11000+, so scale by 120
  const total = Math.round(weightedSum * 120);

  return { engagement, competence, contribution, growth, resilience, total };
}

// ── Commands ───────────────────────────────────────────────────────────

async function cmdCalculateScore(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.calculateScore", payload);
  const did = str(req.constituentDid);
  if (!did) return { error: "constituentDid is required" };

  const breakdown = await computeFullScore(sdk, did);
  const rankDef = scoreToRank(breakdown.total);
  const now = nowISO();

  // Tier 2: Domain write — score record
  await write(sdk, "score", {
    id: genID("sc"),
    'constituentDid': did,
    engagement: String(breakdown.engagement),
    competence: String(breakdown.competence),
    contribution: String(breakdown.contribution),
    growth: String(breakdown.growth),
    resilience: String(breakdown.resilience),
    'totalScore': String(breakdown.total),
    rank: rankDef.rank,
    'rankColor': rankDef.color,
    'calculatedAt': now,
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  // Tier 2: Score history snapshot for growth axis
  await write(sdk, "scoreHistory", {
    id: genID("sh"),
    'constituentDid': did,
    'totalScore': String(breakdown.total),
    engagement: String(breakdown.engagement),
    competence: String(breakdown.competence),
    contribution: String(breakdown.contribution),
    growth: String(breakdown.growth),
    resilience: String(breakdown.resilience),
    'recordedAt': now,
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  return {
    'constituentDid': did,
    ...breakdown,
    rank: rankDef.rank,
    'rankDisplay': rankDisplayName(rankDef.rank),
    'rankColor': rankDef.color,
    'calculatedAt': now,
  };
}

async function cmdPromoteRank(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.promoteRank", payload);
  const did = str(req.constituentDid);
  if (!did) return { error: "constituentDid is required" };

  // TODO(society6): vertex_s6_rank not in @etzhayyim/graph-schema — assume new constituent at kyu6
  const currentRows: Array<Record<string, unknown>> = [];
  const currentRank = str(currentRows[0]?.rank) || "kyu6";
  const currentScore = num(currentRows[0]?.totalScore);

  // Recalculate score
  const breakdown = await computeFullScore(sdk, did);
  const newRankDef = scoreToRank(breakdown.total);
  const now = nowISO();

  const promoted = newRankDef.rank !== currentRank && breakdown.total > currentScore;

  // Tier 2: Update rank record
  await write(sdk, "rank", {
    id: genID("rk"),
    'constituentDid': did,
    rank: newRankDef.rank,
    'rankColor': newRankDef.color,
    'totalScore': String(breakdown.total),
    'previousRank': currentRank,
    promoted: promoted ? "true" : "false",
    'updatedAt': now,
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  if (promoted) {
    // Tier 2: Achievement record
    await write(sdk, "achievement", {
      id: genID("ach"),
      'constituentDid': did,
      'achievementType': "rankPromotion",
      'fromRank': currentRank,
      'toRank': newRankDef.rank,
      'totalScore': String(breakdown.total),
      'achievedAt': now,
      'orgId': "anon",
      'userId': "anon",
      'actorId': appId,
    });

    // Tier 1: Social announcement
    const displayRank = rankDisplayName(newRankDef.rank);
    const prevDisplay = rankDisplayName(currentRank);
  }

  return {
    'constituentDid': did,
    'previousRank': currentRank,
    'newRank': newRankDef.rank,
    'newRankDisplay': rankDisplayName(newRankDef.rank),
    'rankColor': newRankDef.color,
    'totalScore': breakdown.total,
    promoted,
  };
}

async function cmdRegisterConstituent(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.registerConstituent", payload);
  const did = str(req.did);
  if (!did) return { error: "did is required" };

  const now = nowISO();
  const constituentId = genID("ct");

  // Tier 2: Constituent record
  await write(sdk, "constituent", {
    id: constituentId,
    'constituentDid': did,
    'displayName': str(req.displayName),
    'cofogCode': str(req.cofogCode),
    status: "active",
    'registeredAt': now,
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  // Tier 2: Initial rank at Kyu 6
  await write(sdk, "rank", {
    id: genID("rk"),
    'constituentDid': did,
    rank: "kyu6",
    'rankColor': "#FFFFFF",
    'totalScore': "0",
    'previousRank': "",
    promoted: "false",
    'updatedAt': now,
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  // Tier 1: Social announcement

  return { id: constituentId, did, rank: "kyu6", status: "registered" };
}

// ── Queries ────────────────────────────────────────────────────────────

async function qryGetScore(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.getScore", payload);
  const did = str(req.constituentDid);
  if (!did) return { error: "constituentDid is required" };

  // TODO(society6): vertex_s6_score not in @etzhayyim/graph-schema — lookup unavailable
  const rows: Array<Record<string, unknown>> = [];
  if (rows.length === 0) return { error: "no score found", 'constituentDid': did };

  const row = rows[0];
  const rank = str(row.rank);
  return {
    'constituentDid': did,
    engagement: num(row.engagement),
    competence: num(row.competence),
    contribution: num(row.contribution),
    growth: num(row.growth),
    resilience: num(row.resilience),
    'totalScore': num(row.totalScore),
    rank,
    'rankDisplay': rankDisplayName(rank),
    'rankColor': str(row.rankColor),
    'calculatedAt': str(row.calculatedAt),
  };
}

async function qryListScores(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.listScores", payload);
  const limit = Math.min(Math.max(num(req.limit) || 50, 1), 100);
  const offset = num(req.offset) || 0;

  // TODO(society6): vertex_s6_rank not in @etzhayyim/graph-schema — list unavailable
  void limit; void offset; void req;
  const rows: Array<Record<string, unknown>> = [];
  return {
    scores: rows.map(row => ({
      'constituentDid': str(row.constituentDid),
      rank: str(row.rank),
      'rankDisplay': rankDisplayName(str(row.rank)),
      'rankColor': str(row.rankColor),
      'totalScore': num(row.totalScore),
      'updatedAt': str(row.updatedAt),
    })),
    total: rows.length,
    offset,
    limit,
  };
}

async function qryGetRank(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.getRank", payload);
  const did = str(req.constituentDid);
  if (!did) return { error: "constituentDid is required" };

  // TODO(society6): vertex_s6_rank not in @etzhayyim/graph-schema — lookup unavailable
  const rows: Array<Record<string, unknown>> = [];
  if (rows.length === 0) return { error: "no rank found", 'constituentDid': did };

  const row = rows[0];
  const rank = str(row.rank);
  return {
    'constituentDid': did,
    rank,
    'rankDisplay': rankDisplayName(rank),
    'rankColor': str(row.rankColor),
    'totalScore': num(row.totalScore),
    'previousRank': str(row.previousRank),
    'updatedAt': str(row.updatedAt),
  };
}

async function qryGetLeaderboard(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.getLeaderboard", payload);
  const limit = Math.min(Math.max(num(req.limit) || 20, 1), 100);

  // TODO(society6): vertex_s6_rank / vertex_s6_constituent not in @etzhayyim/graph-schema — leaderboard unavailable
  void limit; void req;
  const rows: Array<Record<string, unknown>> = [];
  return {
    leaderboard: rows.map((row, idx) => ({
      position: idx + 1 + (num(req.cofogCode) ? 0 : 0),
      'constituentDid': str(row.constituentDid),
      'displayName': str(row.displayName),
      rank: str(row.rank),
      'rankDisplay': rankDisplayName(str(row.rank)),
      'rankColor': str(row.rankColor),
      'totalScore': num(row.totalScore),
    })),
    total: rows.length,
  };
}

async function qryListAchievements(sdk: HostSDK, payload: Uint8Array): Promise<unknown> {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.listAchievements", payload);
  const limit = Math.min(Math.max(num(req.limit) || 50, 1), 100);
  const offset = num(req.offset) || 0;

  // TODO(society6): vertex_s6_achievement not in @etzhayyim/graph-schema — achievements list unavailable
  void limit; void offset; void req;
  const rows: Array<Record<string, unknown>> = [];
  return { achievements: rows, total: rows.length, offset, limit };
}

function qryGetScoreBreakdown(sdk: HostSDK, payload: Uint8Array): unknown {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.getScoreBreakdown", payload);
  const did = str(req.constituentDid);
  if (!did) return { error: "constituentDid is required" };

  const breakdown = computeFullScore(sdk, did);
  const rankDef = scoreToRank(breakdown.total);

  return {
    'constituentDid': did,
    axes: AXES.map(axis => ({
      name: axis.name,
      weight: axis.weight,
      'rawScore': (breakdown as Record<string, unknown>)[axis.name],
      weighted: Math.round(num((breakdown as Record<string, unknown>)[axis.name]) * axis.weight),
    })),
    'totalScore': breakdown.total,
    rank: rankDef.rank,
    'rankDisplay': rankDisplayName(rankDef.rank),
    'rankColor': rankDef.color,
  };
}

// ── COFOG Classification ───────────────────────────────────────────────

function qryListCofog(_sdk: HostSDK, _payload: Uint8Array): unknown {
  return {
    divisions: COFOG_DIVISIONS,
    total: COFOG_DIVISIONS.length,
  };
}

function qryLookupCofog(_sdk: HostSDK, payload: Uint8Array): unknown {
  const req = parseLexiconInput("com.etzhayyim.apps.society6.lookupCofog", payload);

  if (req.code) {
    const found = COFOG_DIVISIONS.find(d => d.code === req.code);
    if (!found) return { error: "COFOG division not found", code: req.code };
    return found;
  }

  if (req.query) {
    const q = str(req.query).toLowerCase();
    const matches = COFOG_DIVISIONS.filter(d =>
      d.nameEn.toLowerCase().includes(q) || d.nameJa.includes(q),
    );
    return { divisions: matches, total: matches.length };
  }

  return { error: "code or query is required" };
}

function qryRankLadder(_sdk: HostSDK, _payload: Uint8Array): unknown {
  return {
    ranks: RANK_LADDER.map(r => ({
      rank: r.rank,
      'rankDisplay': rankDisplayName(r.rank),
      color: r.color,
      'minScore': r.minScore,
    })),
    total: RANK_LADDER.length,
  };
}

// ── Layer 1: Reactive Pipeline (handleComAtprotoSyncSubscribeReposCommit) ──────────────────────────

export async function handleComAtprotoSyncSubscribeReposCommit(sdk: HostSDK, commit: ComAtprotoSyncSubscribeReposCommit): Promise<{ ok: boolean; detail?: string }> {
  try {
    if (commit.action !== "create") return { ok: true };
    const collection = str(commit.collection);

    // Process inbound score assessment records
    if (collection === "com.etzhayyim.apps.society6.assessment" || collection.includes("society6.score")) {
      return await processAssessment(sdk, commit);
    }

    // Process dojo drill completions (cross-app) for competence axis update
    if (collection === "com.etzhayyim.apps.dojo.drill" || collection.includes("dojo.drill")) {
      return await processDojoDrillCompletion(sdk, commit);
    }

    // Process follows for engagement tracking
    if (collection === "app.bsky.graph.follow") {
      return processFollow(sdk, commit);
    }

    // Process likes/reposts for engagement
    if (collection === "app.bsky.feed.like" || collection === "app.bsky.feed.repost") {
      return await processEngagement(sdk, commit);
    }

// --- shouldDrill: kyumei-koji self-research ---

  // --- shouldAnalyze: domain data analysis ---

  // --- shouldValidate: data quality check ---

    return { ok: true };
  } catch (error) {
    return { ok: false, detail: String(error) };
  }
}

async function processAssessment(sdk: HostSDK, commit: ComAtprotoSyncSubscribeReposCommit): Promise<{ ok: boolean; detail: string }> {
  // TODO(society6): vertex_s6_assessment not in @etzhayyim/graph-schema — fall back to repo DID only
  const rows: Array<Record<string, unknown>> = [];
  const did = str(rows[0]?.constituentDid) || str(commit.repo);
  if (!did) return { ok: true, detail: "no constituentDid" };

  // Recalculate and promote
  const breakdown = await computeFullScore(sdk, did);
  const rankDef = scoreToRank(breakdown.total);

  await write(sdk, "score", {
    id: genID("sc"),
    'constituentDid': did,
    engagement: String(breakdown.engagement),
    competence: String(breakdown.competence),
    contribution: String(breakdown.contribution),
    growth: String(breakdown.growth),
    resilience: String(breakdown.resilience),
    'totalScore': String(breakdown.total),
    rank: rankDef.rank,
    'rankColor': rankDef.color,
    'calculatedAt': nowISO(),
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  return { ok: true, detail: `score recalculated: ${breakdown.total} (${rankDef.rank})` };
}

async function processDojoDrillCompletion(sdk: HostSDK, commit: ComAtprotoSyncSubscribeReposCommit): Promise<{ ok: boolean; detail: string }> {
  // Dojo drill completed — triggers competence axis recalculation
  const did = str(commit.repo);
  if (!did) return { ok: true, detail: "no repo DID" };

  // Record as engagement event
  await write(sdk, "event", {
    id: genID("ev"),
    'constituentDid': did,
    'eventType': "dojoDrillCompleted",
    'sourceCollection': str(commit.collection),
    'sourceRkey': str(commit.rkey),
    'createdAt': nowISO(),
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  return { ok: true, detail: "dojo drill event recorded" };
}

function processFollow(_sdk: HostSDK, commit: ComAtprotoSyncSubscribeReposCommit): { ok: boolean; detail: string } {
  // Follow events contribute to engagement axis
  // No write needed; engagement is calculated from S6Event count at score time
  return { ok: true, detail: `follow from ${str(commit.repo)}` };
}

async function processEngagement(sdk: HostSDK, commit: ComAtprotoSyncSubscribeReposCommit): Promise<{ ok: boolean; detail: string }> {
  const did = str(commit.repo);
  if (!did) return { ok: true, detail: "no repo DID" };

  await write(sdk, "event", {
    id: genID("ev"),
    'constituentDid': did,
    'eventType': str(commit.collection) === "app.bsky.feed.like" ? "like" : "repost",
    'sourceCollection': str(commit.collection),
    'sourceRkey': str(commit.rkey),
    'createdAt': nowISO(),
    'orgId': "anon",
    'userId': "anon",
    'actorId': appId,
  });

  return { ok: true, detail: `engagement event: ${str(commit.collection)}` };
}

// ── Layer 3: Heartbeat (Shinka) ────────────────────────────────────────

const cadenceState = createCadenceState();
const inbox = createInboxBuffer();

// --- Multi-DID ---

// Layer 3: Shinka (Social Evolution)
const shinkaEnabled = true; // domain: society6

export async function runHeartbeat(sdk: HostSDK): Promise<{ ok: boolean; actions: Array<Record<string, unknown>> }> {
  return { ok: true, actions: [] };
}

// ── SDK Factory & Command Registration ─────────────────────────────────

export default createWorkerExport((sdk) => {
  appId = sdk.pds.selfNanoid ?? "";
  actorDID = sdk.pds.selfRepo ?? "";
  sdk.app
      // Commands
      .command(nsid("com.etzhayyim.apps.society6.calculateScore"), (_, body) => cmdCalculateScore(sdk, body),
        asAgentTool("Calculate Well-Becoming 5-axis score for a constituent"),
        withCapabilityTags("scoring", "wellBecoming"),
        withOCELEvent("governance.audit"),
      )
      .command(nsid("com.etzhayyim.apps.society6.promoteRank"), (_, body) => cmdPromoteRank(sdk, body),
        asAgentTool("Evaluate and promote constituent Kyu/Dan rank"),
        withCapabilityTags("scoring", "rank", "promotion"),
      )
      .command(nsid("com.etzhayyim.apps.society6.registerConstituent"), (_, body) => cmdRegisterConstituent(sdk, body),
        asAgentTool("Register a new constituent with initial Kyu 6 rank"),
        withCapabilityTags("constituent", "registration"),
      )
      // Queries
      .command(nsid("com.etzhayyim.apps.society6.getScore"), (_, body) => qryGetScore(sdk, body),
        asAgentTool("Get latest score for a constituent"),
        withCapabilityTags("scoring", "query"),
      )
      .command(nsid("com.etzhayyim.apps.society6.listScores"), (_, body) => qryListScores(sdk, body),
        asAgentTool("List scores with optional rank filter"),
        withCapabilityTags("scoring", "query"),
      )
      .command(nsid("com.etzhayyim.apps.society6.getRank"), (_, body) => qryGetRank(sdk, body),
        asAgentTool("Get current rank for a constituent"),
        withCapabilityTags("rank", "query"),
      )
      .command(nsid("com.etzhayyim.apps.society6.getLeaderboard"), (_, body) => qryGetLeaderboard(sdk, body),
        asAgentTool("Get leaderboard by score"),
        withCapabilityTags("rank", "leaderboard"),
      )
      .command(nsid("com.etzhayyim.apps.society6.listAchievements"), (_, body) => qryListAchievements(sdk, body),
        asAgentTool("List achievements for a constituent"),
        withCapabilityTags("achievement", "query"),
      )
      .command(nsid("com.etzhayyim.apps.society6.getScoreBreakdown"), (_, body) => qryGetScoreBreakdown(sdk, body),
        asAgentTool("Get detailed 5-axis score breakdown with weights"),
        withCapabilityTags("scoring", "breakdown"),
      )
      .command(nsid("com.etzhayyim.apps.society6.listCofog"), (_, body) => qryListCofog(sdk, body),
        asAgentTool("List COFOG level-1 divisions"),
        withCapabilityTags("cofog", "classification"),
      )
      .command(nsid("com.etzhayyim.apps.society6.lookupCofog"), (_, body) => qryLookupCofog(sdk, body),
        asAgentTool("Lookup COFOG division by code or search query"),
        withCapabilityTags("cofog", "search"),
      )
      .command(nsid("com.etzhayyim.apps.society6.rankLadder"), (_, body) => qryRankLadder(sdk, body),
        asAgentTool("Get the full Kyu/Dan rank ladder with thresholds"),
        withCapabilityTags("rank", "reference"),
      )
      // Query aliases for Protocol Canvas
      .query("society6.score", (_, body) => qryGetScore(sdk, body))
      .query("society6.rank", (_, body) => qryGetRank(sdk, body))
      .query("society6.leaderboard", (_, body) => qryGetLeaderboard(sdk, body))
      .query("society6.cofog", (_, body) => qryListCofog(sdk, body));
});
