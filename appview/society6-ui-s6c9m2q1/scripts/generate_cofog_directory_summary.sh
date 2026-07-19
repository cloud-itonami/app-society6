#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cofog_root="$repo_root/projects/etzhayyim-project-cofog/wasm"
component_root="$repo_root/60-apps/etzhayyim-project-society6/appview/society6-ui-s6c9m2q1"
portal_json="$component_root/svelte/static/data/cofog-components.json"
output_json="$component_root/svelte/static/data/cofog-directory-summary.json"
legacy_output_json="$component_root/static/data/cofog-directory-summary.json"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

dirs_txt="$tmp_dir/directories.txt"
portal_txt="$tmp_dir/portal-components.txt"
rows_jsonl="$tmp_dir/rows.jsonl"

find "$cofog_root" -mindepth 1 -maxdepth 1 -type d -name "cofog-*-component" \
  | sed 's#.*/##' \
  | sort > "$dirs_txt"

jq -r '.[].component' "$portal_json" | sort -u > "$portal_txt"

while IFS= read -r dir; do
  code="${dir#cofog-}"
  code="${code%-component}"
  digits="$(printf '%s' "$code" | tr -cd '0-9')"
  if [[ ${#digits} -ge 2 ]]; then
    group="${digits:0:2}"
  else
    group="$code"
  fi

  has_svelte=false
  if [[ -d "$cofog_root/$dir/svelte" ]]; then
    has_svelte=true
  fi

  in_portal=false
  if grep -qx "$dir" "$portal_txt"; then
    in_portal=true
  fi

  jq -n \
    --arg name "$dir" \
    --arg code "$code" \
    --arg group "$group" \
    --argjson hasSvelte "$has_svelte" \
    --argjson inPortal "$in_portal" \
    '{name:$name, code:$code, group:$group, hasSvelte:$hasSvelte, inPortal:$inPortal}'
done < "$dirs_txt" > "$rows_jsonl"

jq -s \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg source "projects/etzhayyim-project-cofog/wasm" \
  '
  . as $dirs
  | {
      generatedAt: $generatedAt,
      source: $source,
      totals: {
        directories: ($dirs | length),
        withSvelte: ([ $dirs[] | select(.hasSvelte) ] | length),
        inPortal: ([ $dirs[] | select(.inPortal) ] | length),
        excludedFromPortal: ([ $dirs[] | select(.inPortal | not) ] | length)
      },
      groups: (
        $dirs
        | sort_by(.group, .code, .name)
        | group_by(.group)
        | map({
            group: .[0].group,
            count: length,
            withSvelte: ([ .[] | select(.hasSvelte) ] | length),
            inPortal: ([ .[] | select(.inPortal) ] | length)
          })
      ),
      excludedFromPortal: (
        $dirs
        | map(select(.inPortal | not) | {name, code})
      ),
      directories: (
        $dirs
        | sort_by(.code, .name)
      )
    }
  ' "$rows_jsonl" > "$output_json"

echo "Generated: $output_json"

# Keep legacy static path in sync for local tooling that still reads static/data directly.
if [[ -d "$(dirname "$legacy_output_json")" ]]; then
  cp "$output_json" "$legacy_output_json"
  echo "Synced: $legacy_output_json"
fi
