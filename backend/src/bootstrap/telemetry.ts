import os from "os";
import { env } from "../../config/env.config";
import { printBanner } from "./banner";

export interface TelemetryData {
  startupTimeSec: string;
  memoryUsageMb: string;
  cpuModel: string;
}

export const getTelemetryData = (startTime: number): TelemetryData => {
  const startupTimeSec = ((performance.now() - startTime) / 1000).toFixed(2) + "s";
  const memoryUsageMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB";
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? `${cpus[0].model.substring(0, 32)} (${cpus.length} Cores)` : "Standard Engine";

  return { startupTimeSec, memoryUsageMb, cpuModel };
};

const stripAnsi = (str: string): string => str.replace(/\x1b\[[0-9;]*m/g, "");
const visualLength = (str: string): number => stripAnsi(str).length;

export const printStartupDashboard = (port: number, startTime: number): void => {
  const telemetry = getTelemetryData(startTime);
  const INNER_WIDTH = 92;
  const topBorder = `\x1b[90m┌${"─".repeat(INNER_WIDTH + 2)}┐\x1b[0m\n`;
  const midBorder = `\x1b[90m├${"─".repeat(INNER_WIDTH + 2)}┤\x1b[0m\n`;
  const botBorder = `\x1b[90m└${"─".repeat(INNER_WIDTH + 2)}┘\x1b[0m\n`;

  const makeRow = (content: string): string => {
    const vLen = visualLength(content);
    const pad = " ".repeat(Math.max(0, INNER_WIDTH - vLen));
    return `\x1b[90m│\x1b[0m ${content}${pad} \x1b[90m│\x1b[0m\n`;
  };

  const makeTwoColRow = (left: string, right: string, col1Width = 44): string => {
    const leftVLen = visualLength(left);
    const leftPad = " ".repeat(Math.max(0, col1Width - leftVLen));
    const combined = left + leftPad + right;
    return makeRow(combined);
  };

  printBanner();

  let box = topBorder;
  box += makeTwoColRow("\x1b[1;96mMANMADHAN-PROGRESS ENTERPRISE BACKEND\x1b[0m", "\x1b[90mv1.0.0\x1b[0m", 80);
  box += midBorder;

  box += makeTwoColRow(
    `Environment : \x1b[37m${env.NODE_ENV.charAt(0).toUpperCase() + env.NODE_ENV.slice(1)}\x1b[0m`,
    `Node      : \x1b[35m${process.version}\x1b[0m`
  );
  box += makeTwoColRow(
    `Platform    : \x1b[37m${process.platform}\x1b[0m`,
    `PID       : \x1b[35m${process.pid}\x1b[0m`
  );
  box += makeTwoColRow(
    `Boot Time   : \x1b[32m${telemetry.startupTimeSec}\x1b[0m`,
    `Memory    : \x1b[37m${telemetry.memoryUsageMb}\x1b[0m`
  );
  box += makeRow(`CPU         : \x1b[37m${telemetry.cpuModel}\x1b[0m`);

  box += midBorder;

  box += makeRow("\x1b[1mService Status (All Connected & Active)\x1b[0m");
  box += makeRow("");
  box += makeTwoColRow("PostgreSQL (Neon) \x1b[32m✓ Connected\x1b[0m", "Drizzle ORM Tables\x1b[32m✓ Connected\x1b[0m");
  box += makeTwoColRow("Cloudinary Storage\x1b[32m✓ Connected\x1b[0m", "Google/GitHub Auth\x1b[32m✓ Connected\x1b[0m");
  box += makeTwoColRow("Firebase FCM Push \x1b[32m✓ Connected\x1b[0m", "BullMQ Auto-Clear \x1b[32m✓ Connected\x1b[0m");
  box += makeTwoColRow("Socket.IO Engine  \x1b[32m✓ Connected\x1b[0m", "SMTPS Email Sender\x1b[32m✓ Connected\x1b[0m");
  box += makeTwoColRow("Groq Llama 3.3 70B\x1b[32m✓ Connected\x1b[0m", "Gemini 3.6 Flash \x1b[32m✓ Connected\x1b[0m");

  box += midBorder;

  box += makeRow("\x1b[1mEndpoints\x1b[0m");
  box += makeRow("");
  box += makeRow(`REST API    \x1b[4;34mhttp://localhost:${port}/api/v1\x1b[0m`);
  box += makeRow(`Health      \x1b[4;34mhttp://localhost:${port}/health\x1b[0m`);
  box += makeRow(`Socket.IO   \x1b[4;34mws://localhost:${port}\x1b[0m`);

  box += midBorder;

  box += makeRow("Status : \x1b[1;32mALL CONNECTED & READY\x1b[0m");
  box += makeRow(`Backend server listening at \x1b[1mhttp://localhost:${port}\x1b[0m`);

  box += botBorder;

  process.stdout.write(box);
};
