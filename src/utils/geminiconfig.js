import { GoogleGenerativeAI } from "@google/generative-ai";

export async function promptCommand(givenPrompt) {
  const gemini_key = process.env.GEMINI_API;
  const genAI = new GoogleGenerativeAI(gemini_key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let modifiedPrompt = `You are in a whatsapp group gc so you have to behave like a group member wile reponding to the message... A user is giving you prompt while talking to you... here's your prompt by the person: \n
    ${givenPrompt}
    \n Make sure you are savvy and roast the person giving you the prompt`;

  const result = await model.generateContent(modifiedPrompt);

  return result.response.text();
}

export async function getSummary(chat) {
  const gemini_key = process.env.GEMINI_API;
  const genAI = new GoogleGenerativeAI(gemini_key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Summarize this chat ${chat} \n make sure you use userids of the users while mentioning them \n make sure you give a quirky remark of the chat in the end`;

  const result = await model.generateContent(prompt);

  return result.response.text();
}
