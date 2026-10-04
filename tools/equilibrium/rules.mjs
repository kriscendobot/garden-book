// The pure rules analyze.mjs applies to the garden's records: statistics,
// regime classification, reviewer identity, and pricing. They live apart from
// the script that reads the journal so test/equilibrium.test.mjs can pin each
// rule against hand-worked inputs.

// Statistics

export const numbers = (values) => values.filter((v) => typeof v === "number" && Number.isFinite(v));
export const quantile = (values, q) => {
  const sorted = numbers(values).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
};
export const sum = (values) => numbers(values).reduce((a, b) => a + b, 0);
export const round = (value, digits = 3) =>
  value === null || value === undefined ? null : Number(value.toFixed(digits));
// With no numeric values every field but n is null, total included, so an
// empty bucket never reads as a measured zero.
export const describe = (values, digits = 3) => {
  const v = numbers(values);
  return {
    n: v.length,
    mean: v.length ? round(sum(v) / v.length, digits) : null,
    p25: round(quantile(v, 0.25), digits),
    median: round(quantile(v, 0.5), digits),
    p75: round(quantile(v, 0.75), digits),
    p90: round(quantile(v, 0.9), digits),
    max: v.length ? round(Math.max(...v), digits) : null,
    total: v.length ? round(sum(v), digits) : null,
  };
};
// Counts each value. Every key of `domain` is present, at zero when the value
// never occurs, so a reader of a fixed category set (panel stages, panel
// dispositions) never meets a missing key. The counts start from a
// prototype-free object, so a value named "constructor" counts like any other.
export const tally = (values, domain = []) => {
  const counts = Object.create(null);
  for (const key of domain) counts[key] = 0;
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
};
export const month = (iso) => (iso ? iso.slice(0, 7) : "unknown");
export const isoWeek = (iso) => {
  const date = new Date(iso);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
};
export const hoursBetween = (a, b) => (a && b ? (Date.parse(b) - Date.parse(a)) / 3.6e6 : null);

// Flat `key: value` frontmatter only; nested YAML (lists) is read separately.
export const frontmatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  const fields = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const m = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(line);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
};

// Regime rules
//
// The three scrutiny regimes the chapter compares:
//   garden   work landed on the garden's own main2 with no pull request;
//   ebfb     work on endojs/endo-but-for-bots, which carries the gauntlet;
//   upstream ferried work on endojs/endo itself (measured from GitHub only,
//            because ferries run off the board and record no cost events).
// Everything else is "other" (minion.town, finbot, the book, ...) or
// "unclassified". Precedence: base name, then the first GitHub repository
// URL in the completion report, then the earliest of a fixed set of
// repository words in the report. A record that matches none is left
// unclassified; it is never guessed into a regime, and it counts toward no
// regime's figures.

const ebfbBase = /^(endojs-endo-but-for-bots-|kriscendobot-endo-but-for-bots-|ebfb-)/;
const repoUrl = /github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/(?:pull|issues|commit|tree|blob|compare|actions)\b/;
export const repoRegime = (repo) => {
  if (/^(endojs|kriscendobot)\/endo-but-for-bots$/.test(repo)) return "ebfb";
  if (/^(kriscendobot|kriskowal)\/garden$/.test(repo)) return "garden";
  if (repo === "endojs/endo") return "upstream";
  return "other";
};
const wordRegimes = [
  ["endo-but-for-bots", "ebfb"],
  ["minion.town", "other"],
  ["finbot", "other"],
  ["garden-book", "other"],
  ["agoric-sdk", "other"],
  ["main2", "garden"],
];
// `report` is the job's completion report text, or undefined when it has none.
export const classify = (base, report) => {
  if (ebfbBase.test(base)) return "ebfb";
  if (report === undefined) return "unclassified";
  const url = repoUrl.exec(report);
  if (url) return repoRegime(url[1]);
  let best = null;
  for (const [word, regime] of wordRegimes) {
    const at = report.indexOf(word);
    if (at >= 0 && (best === null || at < best[0])) best = [at, regime];
  }
  return best ? best[1] : "unclassified";
};
export const ebfbPullRequest = (base, report) => {
  const fromBase = /endo-but-for-bots-pr(\d+)/.exec(base);
  if (fromBase) return Number(fromBase[1]);
  const fromReport = report && /endo-but-for-bots\/pull\/(\d+)/.exec(report);
  return fromReport ? Number(fromReport[1]) : null;
};
// A gauntlet's stage bases (`<parent>-gauntlet-panel-3`) and the gauntlet
// itself (`<parent>-gauntlet`) belong to the parent job's family.
export const gauntletFamily = (base) => base.replace(/-gauntlet(?:-.*)?$/, "");
// Many stage jobs name no pull request in their base or report. Such a stage
// inherits the pull request of its parent job, else of the first sibling stage
// (in base order) that names one, so its cost still reaches the pull request.
// `own` is the per-base rule (ebfbPullRequest with the base's report).
export const familyPullRequests = (bases, own) => {
  const sibling = new Map();
  for (const base of [...bases].sort()) {
    const family = gauntletFamily(base);
    if (family === base || sibling.has(family)) continue;
    const pullRequest = own(base);
    if (pullRequest !== null) sibling.set(family, pullRequest);
  }
  return (base) => {
    const pullRequest = own(base);
    const family = gauntletFamily(base);
    if (pullRequest !== null || family === base) return pullRequest;
    return own(family) ?? sibling.get(family) ?? null;
  };
};
export const gauntletStage = (base) => {
  const m = /-gauntlet-(panel|fix|clean|undraft|viability)(?:-(\d+))?$/.exec(base);
  return m ? { stage: m[1], index: m[2] ? Number(m[2]) : null } : null;
};

// Reviewers

export const BOT_LOGIN = "kriscendobot";
// A reviewer is a person unless the login is the bot itself (in any case),
// ends in bot/b0t/[bot], or is GitHub's Copilot reviewer. The suffix rule is
// review-rounds.sh's; it would also drop a person whose login ends in "bot"
// (an "abbot"). No reviewer login in the fetched data does: every login
// ending in bot or b0t there is a bot account.
export const isHuman = (login, botLogin = BOT_LOGIN) =>
  typeof login === "string" &&
  login !== "" &&
  login.toLowerCase() !== botLogin.toLowerCase() &&
  !/(bot|b0t|\[bot\])$/i.test(login) &&
  !/^copilot/i.test(login);
export const words = (text) => (text ?? "").split(/\s+/).filter(Boolean).length;

// Prices

// GARDEN_REP_HOURLY_RATE's default in scripts/jobs/reputation.sh on main2: the
// configured price of a maintainer hour, not a measurement. scenario.mjs reads
// this same constant.
export const HOURLY_RATE_DOLLARS = 125;
// The reducer's review formula: five minutes per round plus one minute per
// twenty words of review text, at the hourly rate.
export const reviewFormulaDollars = (rounds, wordCount) => ((5 * rounds + wordCount / 20) / 60) * HOURLY_RATE_DOLLARS;
// The flat price of one review round: twelve minutes at $150 an hour, the
// illustrative price in designs/issue-cost-and-triple-evaluation.md on main2.
// It is a second, separate rate from HOURLY_RATE_DOLLARS on purpose.
export const FLAT_ROUND_MINUTES = 12;
export const FLAT_HOURLY_RATE_DOLLARS = 150;
export const flatRoundDollars = (rounds) => rounds * (FLAT_ROUND_MINUTES / 60) * FLAT_HOURLY_RATE_DOLLARS;

// A usage line is Anthropic when it says so, or when it predates the provider
// field and names a Claude model. Only Anthropic lines carry total_cost_usd.
export const isAnthropic = (line) => line.provider === "anthropic" || (!line.provider && /^claude/.test(line.model ?? ""));

// Flat dollars per notional dollar for one month. A month whose priced lines
// sum to no notional dollars has no allocation (null), and so does any input
// whose quotient is not a finite number: never Infinity or NaN.
export const allocationFactor = (flatDollars, notional) => {
  const factor = notional > 0 ? flatDollars / notional : null;
  return Number.isFinite(factor) ? factor : null;
};
