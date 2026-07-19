import { describe, it, expect, beforeEach } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import {
  registerCofog,
  getCofog,
  cofogExists,
  listCofog,
  recordScore,
  listScores,
  getScore,
  coverage,
  rankFor,
  weightedTotal,
} from "../src/index.js";

const OWNER = "did:web:society6.etzhayyim.com";

describe("society6 kotoba (kotoba-E2E split)", () => {
  let e: any;
  beforeEach(() => {
    e = new MockEtzhayyim({ did: OWNER });
  });

  describe("cofogService (PLAINTEXT public taxonomy)", () => {
    it("registers, dedups, validates, gets, lists/filters, FK exists()", async () => {
      expect((await registerCofog(e, { cofogCode: "07.1", label: "Medical products", division: "07-Health" })).status).toBe("registered");
      expect((await registerCofog(e, { cofogCode: "07.1", label: "Medical products", division: "07-Health" })).status).toBe("alreadyExists");
      expect((await registerCofog(e, { cofogCode: "", label: "x", division: "d" })).status).toBe("rejected");
      await registerCofog(e, { cofogCode: "09.2", label: "Secondary education", division: "09-Education" });
      expect((await getCofog(e, { cofogCode: "07.1" })).cofog?.label).toBe("Medical products");
      expect((await getCofog(e, { cofogCode: "nope" })).error).toBe("notFound");
      expect(await cofogExists(e, "07.1")).toBe(true);
      expect(await cofogExists(e, "nope")).toBe(false);
      expect((await listCofog(e)).total).toBe(2);
      expect((await listCofog(e, { division: "07-Health" })).total).toBe(1);
    });
  });

  describe("rank helpers (public reference constants)", () => {
    it("computes weighted integer total + maps to kyu/dan tier (no float)", () => {
      // all axes 1000: total = (1000*25 + 1000*25 + 1000*20 + 1000*20 + 1000*10)/100 = 1000
      const total = weightedTotal({ engagement: 1000, competence: 1000, contribution: 1000, growth: 1000, resilience: 1000 });
      expect(total).toBe(1000);
      expect(Number.isInteger(total)).toBe(true);
      expect(rankFor(0).display).toBe("Kyu 6");
      expect(rankFor(1000).display).toBe("Kyu 2");
      expect(rankFor(2000).display).toBe("Dan 1");
      expect(rankFor(99999).display).toBe("Dan 10");
    });
  });

  describe("constituentScore (E2E-ENCRYPTED PII)", () => {
    beforeEach(async () => {
      await registerCofog(e, { cofogCode: "07.1", label: "Medical products", division: "07-Health" });
      await registerCofog(e, { cofogCode: "09.2", label: "Secondary education", division: "09-Education" });
    });

    it("seals via encryptedWrite, computes rank, round-trips via encryptedRead", async () => {
      const ok = await recordScore(e, { constituentDid: "did:web:alice.example", cofogCode: "07.1", engagement: 1000, competence: 1000, contribution: 1000, growth: 1000, resilience: 1000 });
      expect(ok.status).toBe("recorded");
      expect(ok.keyId).toBeTruthy();
      expect(ok.totalScore).toBe(1000);
      expect(ok.rankDisplay).toBe("Kyu 2");

      const got = await getScore(e, { constituentDid: "did:web:alice.example" });
      expect(got.score?.totalScore).toBe(1000);
      expect(got.score?.rank).toBe(-2);
      expect(got.score?.cofogCode).toBe("07.1");
    });

    it("validates axis scores + FK against the plaintext catalog", async () => {
      expect((await recordScore(e, { constituentDid: "d", cofogCode: "07.1", engagement: -1, competence: 0, contribution: 0, growth: 0, resilience: 0 })).status).toBe("rejected"); // negative axis
      expect((await recordScore(e, { constituentDid: "d", cofogCode: "ZZ", engagement: 0, competence: 0, contribution: 0, growth: 0, resilience: 0 })).error).toBe("unknownCofogCode"); // bad FK
    });

    it("lists + filters by cofogCode", async () => {
      await recordScore(e, { constituentDid: "did:web:a", cofogCode: "07.1", engagement: 100, competence: 100, contribution: 100, growth: 100, resilience: 100 });
      await recordScore(e, { constituentDid: "did:web:b", cofogCode: "09.2", engagement: 50, competence: 50, contribution: 50, growth: 50, resilience: 50 });
      expect((await listScores(e)).total).toBe(2);
      expect((await listScores(e, { cofogCode: "07.1" })).total).toBe(1);
    });

    it("enforces read-cap: a non-recipient DID sees zero scores", async () => {
      await registerCofog(e, { cofogCode: "07.1", label: "Medical products", division: "07-Health" });
      await recordScore(e, { constituentDid: "did:web:a", cofogCode: "07.1", engagement: 10, competence: 10, contribution: 10, growth: 10, resilience: 10 });
      const outsider: any = new MockEtzhayyim({ did: "did:web:outsider.example" });
      expect((await listScores(outsider)).total).toBe(0);
    });

    it("grants read-cap to an explicit recipient (e.g. the constituent / mentor)", async () => {
      const mentor = "did:web:mentor.example";
      const r = await recordScore(e, { constituentDid: "did:web:a", cofogCode: "07.1", engagement: 10, competence: 10, contribution: 10, growth: 10, resilience: 10, recipients: [mentor] });
      expect(r.status).toBe("recorded");
      expect((await listScores(e)).total).toBe(1); // owner can read
    });
  });

  describe("coverage rollup", () => {
    it("counts plaintext COFOG services + E2E constituent scores", async () => {
      await registerCofog(e, { cofogCode: "07.1", label: "Medical", division: "07-Health" });
      await registerCofog(e, { cofogCode: "07.2", label: "Outpatient", division: "07-Health" });
      await registerCofog(e, { cofogCode: "09.2", label: "Education", division: "09-Education" });
      await recordScore(e, { constituentDid: "did:web:a", cofogCode: "07.1", engagement: 5, competence: 5, contribution: 5, growth: 5, resilience: 5 });
      const cov = await coverage(e);
      expect(cov.cofogServiceCount).toBe(3);
      expect(cov.constituentScoreCount).toBe(1);
      expect(cov.cofogByDivision?.["07-Health"]).toBe(2);
      expect(cov.cofogByDivision?.["09-Education"]).toBe(1);
    });
  });
});
