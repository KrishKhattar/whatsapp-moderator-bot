import { cussWords } from "./badwords.js";

export const containsCussWords = (message) => {
  const lowerCaseMessage = message.toLowerCase();
  for (let word of cussWords) {
    if (lowerCaseMessage.includes(word.toLowerCase())) {
      return true;
    }
  }
  return false;
};
