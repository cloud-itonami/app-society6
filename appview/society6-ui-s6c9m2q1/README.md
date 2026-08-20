# society6-ui-s6c9m2q1

Society6 static portal component。COFOG components portal と Society6 の提言・
実装原則を配信します。

- Host: `https://society6.etzhayyim.com`（`wrangler.jsonc` は
  `s6c9m2q1.etzhayyim.com` も同じ worker に向けています）

## UI source

- Svelte source: `svelte/`
- Runtime static assets: `static/`

⚠ `svelte/` はこの repo 単体では install できません（`@etzhayyim/design-system`
が `workspace:*` 指定で、workspace root もそのパッケージもこの repo に無い）。
実測のエラーと切り分けは [`../../docs/operator-quickstart.md`](../../docs/operator-quickstart.md)。

## COFOG directory summary

- 生成物: `svelte/static/data/cofog-directory-summary.json`
  （`static/data/` にも同じものが同期されています）
- 生成器: `scripts/generate_cofog_directory_summary.sh`

⚠ **この生成器はこの repo では走りません。** `projects/etzhayyim-project-cofog/wasm`
と `60-apps/etzhayyim-project-society6/...` という旧 monorepo のパスを参照するため、
`find: ... No such file or directory` で exit 1 します。committed な summary は
2026-02-22 時点の凍結スナップショットです。

## src/app.ts

726 行の Cloudflare Worker entry ですが、`@etzhayyim/kotodama-host-sdk` を宣言する
`package.json` がこの repo に存在しないため、ビルドにも typecheck にも含まれません。
