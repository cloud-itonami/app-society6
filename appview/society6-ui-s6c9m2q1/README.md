# society6-ui-s6c9m2q1

Society6 static portal component。COFOG components portal と Society6 の提言・
実装原則を配信します。

- Host: `https://society6.etzhayyim.com`（`wrangler.jsonc` は
  `s6c9m2q1.etzhayyim.com` も同じ worker に向けています）

## UI source

- ClojureScript source (reagent + re-frame + jp-go-dds): `cljs/`
- Runtime static assets: `static/`

`svelte/` was migrated away (2026-08-26): it never installed in this repo
(`@etzhayyim/design-system` was `workspace:*` with no workspace root or such
package present — see the frozen error in the old
[`../../docs/operator-quickstart.md`](../../docs/operator-quickstart.md)
history). `cljs/` has no such problem — `jp-go-dds` is a plain git dep, not a
workspace sibling — and builds standing alone with `amu compile --target wasm32-browser app`.

## COFOG directory summary

- 生成物: `static/data/cofog-directory-summary.json`
  （旧 `svelte/static/data/` 側の同期コピーは svelte 削除に伴い消滅済み）
- 生成器: `scripts/generate_cofog_directory_summary.sh`

⚠ **この生成器はこの repo では走りません。** `projects/etzhayyim-project-cofog/wasm`
と `60-apps/etzhayyim-project-society6/...` という旧 monorepo のパスを参照するため、
`find: ... No such file or directory` で exit 1 します。committed な summary は
2026-02-22 時点の凍結スナップショットです。

## src/app.ts

726 行の Cloudflare Worker entry ですが、`@etzhayyim/kotodama-host-sdk` を宣言する
`package.json` がこの repo に存在しないため、ビルドにも typecheck にも含まれません。
