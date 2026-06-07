import chalk from "chalk";
import type { Logger } from "../types/services.js";

export class CliLogger implements Logger {
  info(message: string): void {
    console.log(chalk.cyan("i"), message);
  }
  success(message: string): void {
    console.log(chalk.green("✓"), message);
  }
  warn(message: string): void {
    console.log(chalk.yellow("!"), message);
  }
  error(message: string): void {
    console.error(chalk.red("✗"), message);
  }
}
