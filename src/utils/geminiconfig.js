import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getSummary(chat) {
  const gemini_key = process.env.GEMINI_API;
  const genAI = new GoogleGenerativeAI(gemini_key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Summarize this chat ${chat}`;

  const result = await model.generateContent(prompt);

  return result.response.text();
}
