import { createInterface } from "node:readline/promises";

export async function confirmSend(): Promise<boolean> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question("Send emails? (y/n) ");
    return answer.trim().toLowerCase() === "y";
  } finally {
    readline.close();
  }
}
