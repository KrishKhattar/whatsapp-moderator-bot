// !help is generated from the command registry, so it never goes out of date.

const SECTIONS = [
  { category: "general", title: "*The basics* 🧑‍🤝‍🧑" },
  { category: "ai", title: "*Big brain stuff* 🧠" },
  { category: "admin", title: "*For the chosen ones (admins)* 👑" },
  { category: "moderation", title: "*Moderation (admins)* 🛡️" },
];

const formatCommand = (prefix, command) => {
  const lines = [];
  const usage = command.usage ? ` ${command.usage}` : "";
  lines.push(`${prefix}${command.name}${usage} - ${command.description}`);
  for (const [sub, description] of command.subcommands || []) {
    lines.push(`${prefix}${command.name} ${sub} - ${description}`);
  }
  return lines.join("\n");
};

export const buildHelpText = (commands, prefix = "!") => {
  const sections = SECTIONS.map(({ category, title }) => {
    const inSection = commands.filter((c) => c.category === category);
    if (inSection.length === 0) return null;
    return `${title}\n${inSection.map((c) => formatCommand(prefix, c)).join("\n")}`;
  }).filter(Boolean);

  const count = commands.length;
  const footer =
    count === 7
      ? "That's exactly 7 commands. Coincidence? I think not."
      : `That's ${count} commands. 7 would've been cooler, but here we are.`;

  return [
    "🤖 *Reporting for duty. Here's what I can do:*",
    ...sections,
    `${footer}\n_Thala for a Reason_ 🏏`,
  ].join("\n\n");
};

export default {
  name: "help",
  aliases: ["commands"],
  category: "general",
  description: "You're looking at it, genius",
  cooldown: { seconds: 10, scope: "user" },
  execute: async ({ reply, commands, prefix }) => {
    await reply(buildHelpText(commands, prefix));
  },
};
