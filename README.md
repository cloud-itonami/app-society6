# app-society6

COFOG（政府機能分類）サービスカタログと、5 軸の well-becoming スコア／級位・段位
ラダーを扱う Society6 のアプリ repo です。所有は `cloud-itonami`
（`cloud-itonami/society6` actor と同居）。公開 deployment identity
`society6.etzhayyim.com` はそのまま引き継いでいます。

**まず読むもの: [`docs/operator-quickstart.md`](docs/operator-quickstart.md)。**
この repo は旧 `etzhayyim-root` monorepo からそのまま切り出した seed なので、
3 つある tree のうち単体で動くのは今 2 つです（`svelte/` → `cljs/` 移行、
2026-08-26）。quickstart はどれが動きどれが動かないかを、実際に踏んだコマンドと
実測のエラーで書いてあります。

## 中身

| path | 中身 | 単体で動くか |
|---|---|---|
| `kotoba/` | COFOG カタログ + well-becoming スコアの registry（TypeScript / vitest、8 tests） | **動く** |
| `appview/society6-ui-s6c9m2q1/cljs/` | フロントエンド（ClojureScript / shadow-cljs / reagent + re-frame + jp-go-dds、`society6.etzhayyim.com` に配信）。2026-08-26 に旧 `svelte/`（SvelteKit portal、workspace 兄弟 `@etzhayyim/design-system` 不在で単体では動かなかった）から移行 | **動く** |
| `appview/society6-ui-s6c9m2q1/src/app.ts` | Cloudflare Worker entry（726 行） | 動かない（`@etzhayyim/kotodama-host-sdk` を宣言する package.json がこの repo に無い） |

テストを持つ tree は `kotoba/`（vitest、8 tests）と
`appview/society6-ui-s6c9m2q1/cljs/`（shadow-cljs node-test）で、どちらも
install を要します。install も network も要らない検査が 1 本、repo 直下に
あります。

```bash
nbb test/cofog_artifact_test.cljs        # → cofog-artifact-check: OK
cd kotoba && npm install && npm test     # → 8 passed
```

`test/cofog_artifact_test.cljs` は下の「COFOG directory summary」の凍結
スナップショットと `cofog-components.json` を突き合わせます（rollup が自分の
`directories` 一覧と一致するか、components が in-portal の directory と過不足なく
一致するか、2 つの COFOG コードが同じ `cofogRkey` に潰れていないか、そして
この README と quickstart が本文で引用している件数・日付が artifact の値と
一致するか）。**入力が読めないときは 0 でも 1 でもなく exit 2 を返します** ——
空の artifact は数の等式を全部満たしてしまうので、それを「検査して問題なし」と
区別できなければ意味がありません。手順と、赤くする方法は
`docs/operator-quickstart.md` の 5 節。

## データの分割（`kotoba/src/types.ts`）

- **平文（公開）** — COFOG サービスカタログ。政府機能分類の参照データ
  （division / group / class コードとラベル）で、個人情報を含みません。
- **E2E 暗号（PII）** — 個人ごとの well-becoming スコア（5 軸 + 合計 + 級位/段位）。
  `sdk.encryptedWrite` で封をし、read-cap は owner DID と明示された recipient のみ。
- **etzhayyim に残る** — 横断 SQL による competence / resilience の算出と、昇級通知の
  実行。consent-capability 経由で消費します。

級位・段位ラダーと 5 軸の重みは `RANK_LADDER` / `AXIS_WEIGHTS` に定数として
置いてあり、書き込み対象ではありません。

## COFOG directory summary（現状は凍結）

- 生成物: `appview/society6-ui-s6c9m2q1/static/data/cofog-directory-summary.json`
  （旧 `svelte/static/data/` 側の同期コピーは svelte 削除に伴い消滅済み）
- 生成器: `appview/society6-ui-s6c9m2q1/scripts/generate_cofog_directory_summary.sh`

**この生成器はこの repo では走りません。** 入力を旧 monorepo の
`projects/etzhayyim-project-cofog/wasm` と `60-apps/etzhayyim-project-society6/...`
から解決するので、`find: ... No such file or directory` で exit 1 になります。
したがって committed な summary は 2026-02-22 時点（102 directories）の凍結
スナップショットであり、現在値ではありません。

## Deploy

`appview/society6-ui-s6c9m2q1/wrangler.jsonc` が `society6.etzhayyim.com` /
`s6c9m2q1.etzhayyim.com` を向いています。⚠ **`main` は今も
`svelte/.svelte-kit/cloudflare/_worker.js` を指したままで、この svelte 移行
（2026-08-26）ではあえて触っていません**（frontend-only scope。backend の
Worker entry / deploy 設定は対象外）。その svelte tree はもう存在しないので、
この設定は今なお指す先を持てません。`cljs/` 側は独立してビルドできる
（`npm install && npm run build` → `public/js/app.js`）ので、実際にこの Worker
へ配信を繋ぎ直す（`main` / `assets.directory` を `cljs/public` へ向ける）のは
別途のデプロイ判断です。live の配信物は別の場所で作られたものです。

## 未了

移行時のチェックリストは `MIGRATION-TODO.md`。ad / pixel 層は 2026-05-23 に
closed ですが、DID-bind-auth と中央集権 DB の項目は open のままです
（実例: `appview/society6-ui-s6c9m2q1/src/app.ts:112` の `createKyselyDb()`）。
