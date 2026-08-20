# app-society6

COFOG（政府機能分類）サービスカタログと、5 軸の well-becoming スコア／級位・段位
ラダーを扱う Society6 のアプリ repo です。所有は `cloud-itonami`
（`cloud-itonami/society6` actor と同居）。公開 deployment identity
`society6.etzhayyim.com` はそのまま引き継いでいます。

**まず読むもの: [`docs/operator-quickstart.md`](docs/operator-quickstart.md)。**
この repo は旧 `etzhayyim-root` monorepo からそのまま切り出した seed なので、
3 つある tree のうち単体で動くのは 1 つだけです。quickstart はどれが動きどれが
動かないかを、実際に踏んだコマンドと実測のエラーで書いてあります。

## 中身

| path | 中身 | 単体で動くか |
|---|---|---|
| `kotoba/` | COFOG カタログ + well-becoming スコアの registry（TypeScript / vitest、8 tests） | **動く** |
| `appview/society6-ui-s6c9m2q1/svelte/` | SvelteKit portal（`society6.etzhayyim.com` に配信） | 動かない（workspace 兄弟 `@etzhayyim/design-system` が無い） |
| `appview/society6-ui-s6c9m2q1/src/app.ts` | Cloudflare Worker entry（726 行） | 動かない（`@etzhayyim/kotodama-host-sdk` を宣言する package.json がこの repo に無い） |

`kotoba/` だけがテストを持つので、信号のある変更ができるのはそこです。

```bash
cd kotoba && npm install && npm test     # → 8 passed
```

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

- 生成物: `appview/society6-ui-s6c9m2q1/svelte/static/data/cofog-directory-summary.json`
  （と `static/data/` 側の同期コピー）
- 生成器: `appview/society6-ui-s6c9m2q1/scripts/generate_cofog_directory_summary.sh`

**この生成器はこの repo では走りません。** 入力を旧 monorepo の
`projects/etzhayyim-project-cofog/wasm` と `60-apps/etzhayyim-project-society6/...`
から解決するので、`find: ... No such file or directory` で exit 1 になります。
したがって committed な summary は 2026-02-22 時点（102 directories）の凍結
スナップショットであり、現在値ではありません。

## Deploy

`appview/society6-ui-s6c9m2q1/wrangler.jsonc` が `society6.etzhayyim.com` /
`s6c9m2q1.etzhayyim.com` を向いています。ただし `main` が指すのは SvelteKit の
ビルド生成物なので、上記のとおり**この repo は今そのビルドを作れません**。
live の配信物は別の場所で作られたものです。

## 未了

移行時のチェックリストは `MIGRATION-TODO.md`。ad / pixel 層は 2026-05-23 に
closed ですが、DID-bind-auth と中央集権 DB の項目は open のままです
（実例: `appview/society6-ui-s6c9m2q1/src/app.ts:112` の `createKyselyDb()`）。
