#!/bin/sh
# Saves the GitHub pull-request metadata analyze.mjs reads. The output holds
# review bodies (to count words), so keep it out of the repository; only the
# aggregates analyze.mjs prints are committed.
#
#   tools/equilibrium/fetch-github.sh <output-dir> <ferried endojs/endo PR numbers...>
#
# The ferried PR numbers are the `role: target` endojs/endo entries in the
# journal's legacy/v1/worktrees/*ferry* dispatch records.
set -eu
out="$1"
shift
mkdir -p "$out"
gh pr list -R endojs/endo-but-for-bots --state all --limit 3000 \
  --json number,author,state,isDraft,createdAt,mergedAt,closedAt,reviews,baseRefName \
  > "$out/ebfb-prs.json"
{
  printf '['
  sep=''
  for n in "$@"; do
    # Captured first: plain sh has no pipefail, so a failed gh piped straight
    # into jq would leave valid-looking empty output.
    view=$(gh pr view "$n" -R endojs/endo \
      --json number,state,createdAt,mergedAt,closedAt,additions,deletions,changedFiles,reviews,commits)
    printf '%s' "$sep"
    printf '%s' "$view" | jq -c '.commits |= length'
    sep=','
  done
  printf ']\n'
} > "$out/upstream-ferried.json"
printf '{"fetchedAt":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$out/meta.json"
