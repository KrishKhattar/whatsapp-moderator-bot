import { getGroupStats, getTotals, getLifetime } from "../../utils/stats.js";

const LABELS = {
  spam: "spam",
  harassment: "harassment",
  hate_speech: "hate speech",
  sexual: "sexual",
  threat: "threats",
  scam: "scams",
  self_harm: "self-harm",
};

const num = (value) => Number(value || 0).toLocaleString("en-IN");

export const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const flaggedBreakdown = (stats) => {
  const parts = Object.entries(stats)
    .filter(([metric, count]) => metric.startsWith("flagged:") && count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([metric, count]) => {
      const category = metric.slice("flagged:".length);
      return `${LABELS[category] || category} ${num(count)}`;
    });
  return parts.length ? ` (${parts.join(", ")})` : "";
};

const moderationLines = (s) => [
  `• Messages seen: ${num(s.messages_seen)}`,
  `• Checked by moderation: ${num(s.messages_checked)}`,
  `• Flagged: ${num(s.flagged)}${flaggedBreakdown(s)}`,
  `• Actions: ${num(s.deleted)} deleted, ${num(s.warned)} warned, ${num(s.removed)} removed`,
  `• Commands run: ${num(s.commands_run)}`,
];

export const buildStatsText = ({ group, totals, lifetime, uptimeMs }) => {
  const sections = ["📊 *Bot stats*"];

  if (group) {
    sections.push(["*This group*", ...moderationLines(group)].join("\n"));
  }

  const aiSaved = totals.ai_cache_hits
    ? ` (cache saved ${num(totals.ai_cache_hits)} calls)`
    : "";
  sections.push(
    [
      "*Across all groups* 🌍",
      `• Groups: ${num(totals.groups)}`,
      ...moderationLines(totals),
      `• AI checks: ${num(totals.ai_checks)}${aiSaved}`,
    ].join("\n")
  );

  const since = lifetime.firstStartedAt
    ? new Date(lifetime.firstStartedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "today";
  sections.push(
    [
      "*Uptime* ⏱️",
      `• Up for ${formatDuration(uptimeMs)} since the last restart`,
      `• On duty since ${since} (${num(lifetime.startCount)} starts)`,
    ].join("\n")
  );

  const flagged = Number((group || totals).flagged || 0);
  sections.push(
    flagged === 0
      ? "_Not a single villain so far. Suspiciously wholesome. 😇_"
      : "_Order has been maintained. 🫡_"
  );

  return sections.join("\n\n");
};

export default {
  name: "stats",
  category: "general",
  description: "Numbers. Graphs not included.",
  cooldown: { seconds: 30, scope: "group" },
  execute: async ({ chat, reply }) => {
    await reply(
      buildStatsText({
        group: chat.isGroup ? getGroupStats(chat.id._serialized) : null,
        totals: getTotals(),
        lifetime: getLifetime(),
        uptimeMs: process.uptime() * 1000,
      })
    );
  },
};
