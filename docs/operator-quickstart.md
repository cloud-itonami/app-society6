# Operator quickstart — app-society6

Every command below was run end to end in a clean checkout of `main`
(`141e262`) on 2026-08-21 before this file was written. Where something does
**not** work, the measured error is quoted rather than described, so you can
tell "I hit the known wall" apart from "I broke it".

## What is actually runnable in this repo

`app-society6` is a transfer seed seeded verbatim from the old
`etzhayyim-root` monorepo, so most of its paths still point at that monorepo.
Only one of the three trees builds standing alone:

| tree | what it is | runnable here? |
|---|---|---|
| `kotoba/` | the COFOG catalog + well-becoming score registry (TypeScript, vitest) | **yes** — this quickstart |
| `appview/society6-ui-s6c9m2q1/svelte/` | SvelteKit portal, deployed to `society6.etzhayyim.com` | **no** — missing workspace sibling, see below |
| `appview/society6-ui-s6c9m2q1/src/app.ts` | 726-line Cloudflare Worker entry | **no** — its SDK is declared in no `package.json` here |

`kotoba/` is the part with a test suite, so it is the part you can change with
a signal. Start there.

## 1. Install

```bash
cd kotoba
npm install
```

Took about 6 minutes and added 135 packages. Two dependencies
(`@etzhayyim/sdk`, `@etzhayyim/sdk-mock`) are git deps pinned by commit, so
this step needs network and GitHub access to the `etzhayyim` org.

**If you get `EALLOWSCRIPTS` here, it is your machine, not this repo.** The
error reads:

```
npm error code EALLOWSCRIPTS
npm error --allow-scripts is not allowed in project-scoped installs.
```

npm 11.16 rejects an `allow-scripts[]` entry in a *user* config during a
project-scoped install. Check with `grep -n allow-scripts ~/.npmrc`, and if it
is there, install with that config bypassed:

```bash
npm install --userconfig /dev/null
```

Do **not** add an `allowScripts` field to `kotoba/package.json` to make this go
away — that would bake one workstation's npm config into the project.

`npm install` leaves `kotoba/node_modules/` and `kotoba/package-lock.json`
untracked **and un-ignored** (this repo has no `.gitignore`). Do not
`git add -A` after this step. Whether the lockfile should be committed is an
open decision, not something this doc settles.

## 2. Typecheck

```bash
npm run typecheck        # tsc --noEmit
```

Exit 0, no output.

Note what this covers: `tsconfig.json` has `"include": ["src/**/*.ts"]`, so
`test/` is **not** typechecked by this step — and it is not typechecked by
step 3 either, because vitest strips types through esbuild without checking
them. `test/` is currently typechecked by nothing. Widening `include` is a
project decision, so it is recorded here as a gap rather than done in passing.

## 3. Test

```bash
npm test                 # vitest run
```

Expect:

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

Around 0.6s. The suite runs against `MockEtzhayyim` from
`@etzhayyim/sdk-mock`, so it touches no network and no real PDS.

## 4. Prove the suite can fail

A green suite you have never seen go red tells you nothing. Break one
character and watch exactly two tests fail.

From the repo root:

```bash
# rank ladder boundary: >= becomes >
perl -0pi -e 's/if \(totalScore >= t\.minScore\) tier = t;/if (totalScore > t.minScore) tier = t;/' kotoba/src/types.ts
cd kotoba && npm test; cd ..
```

Expect exit 1 and this, naming the boundary:

```
AssertionError: expected 'Kyu 3' to be 'Kyu 2'
 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
```

That is the right shape: a constituent sitting exactly on a rank threshold is
the case an off-by-one would silently demote. Restore and confirm you are back
to 8 passed:

```bash
git checkout -- kotoba/src/types.ts
cd kotoba && npm test; cd ..
```

## What these checks do not cover

Measured, not guessed — each of these was probed the same way as step 4.

- **The stated "no float" invariant is not actually tested.** `src/types.ts`
  says *"AT-Lexicon: no float. 5-axis scores + total are integers"*, and
  `weightedTotal` enforces it with `Math.floor(raw / 100)`. Deleting that
  `Math.floor` — `return raw / 100;` — leaves the suite at **8 passed**,
  including the test literally named `computes weighted integer total ... (no
  float)`. Every axis in the fixtures is a round number, so `raw` is always an
  exact multiple of 100 and floor never has anything to do. A test that
  discriminates needs a fixture where `raw % 100 !== 0` (e.g. `engagement: 1`
  alone gives `raw = 25`), which first requires deciding what the right answer
  is: does a 1-point axis round down to 0? That is a product decision, so it
  is named here rather than guessed at.
- **`test/` is typechecked by nothing** (see step 2).
- **Nothing here exercises the real `@etzhayyim/sdk`** — only the mock. The
  encryption claims in `src/registry.ts` (`encryptedWrite` sealing a score so
  the substrate never sees it in plaintext) are only as true as the mock.

## What is not runnable here, and why

Do not spend time on these until the missing pieces arrive; each failure below
is reproducible today.

**The SvelteKit portal** (`appview/society6-ui-s6c9m2q1/svelte/`) declares
`"@etzhayyim/design-system": "workspace:*"`, and this repo has no
`pnpm-workspace.yaml` and no such package:

```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND  "@etzhayyim/design-system@workspace:*" is in
the dependencies but no package named "@etzhayyim/design-system" is present in
the workspace
```

Its `pnpm-lock.yaml` is also out of date with its own `package.json` (5 deps
added, 1 removed, 6 mismatched), so `pnpm install --frozen-lockfile` fails
first with `ERR_PNPM_OUTDATED_LOCKFILE`.

**The Worker entry** `appview/society6-ui-s6c9m2q1/src/app.ts` imports
`@etzhayyim/kotodama-host-sdk`, which appears in **no** `package.json` in this
repo (there are exactly two: `kotoba/` and `.../svelte/`). There is no build
that includes this file. Note also that it calls `createKyselyDb()` at line
112 — a centralized-SQL path that `MIGRATION-TODO.md` still lists as unchecked.
The scan note in that file saying Kysely was "NOT detected" is literally true
(there is no direct `from "kysely"`), but the SQL path is reached through the
host SDK helper, so treat that checkbox as genuinely open.

**The COFOG summary generator**
`appview/society6-ui-s6c9m2q1/scripts/generate_cofog_directory_summary.sh`
resolves its inputs from the old monorepo layout —
`$repo_root/projects/etzhayyim-project-cofog/wasm` and
`$repo_root/60-apps/etzhayyim-project-society6/...` — neither of which exists
here. It exits 1 with:

```
find: .../projects/etzhayyim-project-cofog/wasm: No such file or directory
```

So the two committed `cofog-directory-summary.json` files are a frozen
snapshot (`"generatedAt": "2026-02-22T09:48:13Z"`, 102 directories) that
cannot be regenerated in this repo. Do not treat them as current.

## Deploy

`appview/society6-ui-s6c9m2q1/wrangler.jsonc` targets
`society6.etzhayyim.com` and `s6c9m2q1.etzhayyim.com`, with
`main` pointing at `svelte/.svelte-kit/cloudflare/_worker.js` — a build
artifact of the SvelteKit tree above. **Since that tree does not install here,
this repo cannot currently produce the artifact it deploys.** The live site is
served from a build made elsewhere.
