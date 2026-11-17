import axios from "axios";

export default {
  name: "google",
  category: "ai",
  description: "Top 5 results, because typing in a browser is hard",
  usage: "<query>",
  requiresArgs: true,
  cooldown: { seconds: 20, scope: "user" },
  execute: async ({ args, reply }) => {
    const query = args.join(" ");
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      await reply("Google search isn't set up yet (missing SERPAPI_KEY).");
      return;
    }

    const response = await axios.get("https://serpapi.com/search.json", {
      params: { q: query, api_key: apiKey },
      timeout: 15_000,
    });
    const results = response.data.organic_results?.slice(0, 5) || [];

    if (results.length === 0) {
      await reply("No results found. The internet has failed you. 🫠");
      return;
    }

    const lines = results.map(
      (item, i) => `*${i + 1}. ${item.title}*\n${item.link}\n${item.snippet ?? ""}`
    );
    await reply(`*Google results for "${query}":*\n\n${lines.join("\n\n")}`);
  },
};
