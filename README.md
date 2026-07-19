# etzhayyim-project-society6

COFOG wasm components のアクセスポータルと、Society6 向け提言・思想をまとめた公開サイトです。

- Public URL: `https://society6.etzhayyim.com`
- Runtime: App component
- Static delivery: `70-tools/etzhayyim-static-site`

## Scope

- `etzhayyim-project-cofog/wasm` の主要 MCP endpoints へのアクセスハブ
- Society6 の政策提言・実装原則・評価軸の公開
- web4.etzhayyim.com の世界観を参考にしたネットワーク指向 UI

## Component

- `60-apps/etzhayyim-project-society6/wasm/society6-ui-s6c9m2q1`
  - COFOG portal + Society6 manifesto を配信する static wasm component

## COFOG Directory Summary

- Summary JSON:
  - `60-apps/etzhayyim-project-society6/wasm/society6-ui-s6c9m2q1/static/data/cofog-directory-summary.json`
- Generator script:
  - `60-apps/etzhayyim-project-society6/wasm/society6-ui-s6c9m2q1/70-tools/70-tools/70-tools/scripts/generate_cofog_directory_summary.sh`

この summary は `etzhayyim-project-cofog/wasm` 配下の `cofog-*-component` を全件走査し、
Society6 portal (`cofog-components.json`) に含まれるかどうかも含めて集約します。
