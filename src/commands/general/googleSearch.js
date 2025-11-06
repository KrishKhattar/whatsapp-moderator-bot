import axios from 'axios';

const googleSearch = async (client, message) => {
  try {
    const query = message.body.slice(message.body.indexOf(" ") + 1).trim();
    if (!query) {
      await client.sendMessage(message.from, "Please provide a search query. Usage: !google <query>");
      return;
    }

    const apiKey = process.env.SERPAPI_KEY;
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`;

    const response = await axios.get(url);
    const results = response.data.organic_results?.slice(0, 5) || [];

    if (results.length === 0) {
      await client.sendMessage(message.from, "No results found for your search.");
      return;
    }

    let responseText = `*Google Search Results for "${query}":*\n\n`;
    results.forEach((item, index) => {
      responseText += `*${index + 1}. ${item.title}*\n${item.link}\n${item.snippet}\n\n`;
    });

    await client.sendMessage(message.from, responseText);
  } catch (error) {
    console.error("Google search error:", error);
    await client.sendMessage(
      message.from,
      "Failed to perform search. Please try again later."
    );
  }
};

export default googleSearch;
