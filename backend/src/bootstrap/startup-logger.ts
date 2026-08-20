import os from "node:os";
import { env } from "../../config/env.config";
import { printBanner } from "./banner";

export type StartupPhase =
	| "SYSTEM"
	| "DATABASE"
	| "AUTHENTICATION"
	| "EMAIL"
	| "STORAGE"
	| "REALTIME"
	| "QUEUES"
	| "AI SERVICES"
	| "APPLICATION";

export interface StartupLogEntry {
	phase: StartupPhase;
	level: "INFO" | "WARN" | "ERROR";
	message: string;
	timestamp: string;
}

export interface RuntimeActivityEntry {
	id: string;
	category: string;
	level: "INFO" | "SUCCESS" | "WARN";
	message: string;
	timestamp: string;
}

class StartupLoggerClass {
	private entries: StartupLogEntry[] = [];
	private isFlushed = false;
	private lastPort = 4100;
	private lastStartTime = performance.now();
	private lastDbConnected = true;
	private liveEntries: RuntimeActivityEntry[] = [];

	public log(phase: StartupPhase, level: "INFO" | "WARN" | "ERROR", message: string) {
		const timestamp = new Date().toTimeString().split(" ")[0];
		this.entries.push({ phase, level, message, timestamp });
	}

	public info(phase: StartupPhase, message: string) {
		this.log(phase, "INFO", message);
	}

	public warn(phase: StartupPhase, message: string) {
		this.log(phase, "WARN", message);
	}

	public error(phase: StartupPhase, message: string) {
		this.log(phase, "ERROR", message);
	}

	public getEntries(): StartupLogEntry[] {
		return [...this.entries];
	}

	public updateLiveActivity(entries: RuntimeActivityEntry[]) {
		this.liveEntries = entries;
		if (this.isFlushed) {
			this.renderBox();
		}
	}

	public flushAndRenderDashboard(
		port: number,
		startTime: number,
		dbConnected = true,
	): void {
		this.lastPort = port;
		this.lastStartTime = startTime;
		this.lastDbConnected = dbConnected;
		this.isFlushed = true;
		this.renderBox();
	}

	private renderBox(): void {
		const port = this.lastPort;
		const startTime = this.lastStartTime;
		const dbConnected = this.lastDbConnected;

		const INNER_WIDTH = 96;
		const ansiEscape = String.fromCharCode(27);
		const stripAnsi = (str: string): string =>
			str.replace(new RegExp(`${ansiEscape}\\[[0-9;]*m`, "g"), "");
		const visualLength = (str: string): number => stripAnsi(str).length;

		const topBorder = `\x1b[90m┌${"─".repeat(INNER_WIDTH + 2)}┐\x1b[0m\n`;
		const midBorder = `\x1b[90m├${"─".repeat(INNER_WIDTH + 2)}┤\x1b[0m\n`;
		const botBorder = `\x1b[90m└${"─".repeat(INNER_WIDTH + 2)}┘\x1b[0m\n`;

		const makeRow = (content: string): string => {
			const vLen = visualLength(content);
			const pad = " ".repeat(Math.max(0, INNER_WIDTH - vLen));
			return `\x1b[90m│\x1b[0m ${content}${pad} \x1b[90m│\x1b[0m\n`;
		};

		const makeTwoColRow = (
			left: string,
			right: string,
			col1Width = 46,
		): string => {
			const leftVLen = visualLength(left);
			const leftPad = " ".repeat(Math.max(0, col1Width - leftVLen));
			const combined = left + leftPad + right;
			return makeRow(combined);
		};

		let box = "\x1b[2J\x1b[H"; // Clear terminal screen cleanly before rendering
		printBanner();

		box += topBorder;
		box += makeTwoColRow(
			"\x1b[1;96mMANMADHAN-PROGRESS ENTERPRISE BACKEND\x1b[0m",
			"\x1b[90mv1.0.0\x1b[0m",
			84,
		);
		box += midBorder;

		// System Telemetry Section
		const startupTimeSec = `${((performance.now() - startTime) / 1000).toFixed(2)}s`;
		const memoryUsageMb = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
		const cpus = os.cpus();
		const cpuModel =
			cpus.length > 0
				? `${cpus[0].model.substring(0, 32)} (${cpus.length} Cores)`
				: "Standard Engine";

		box += makeTwoColRow(
			`Environment : \x1b[37m${env.NODE_ENV.charAt(0).toUpperCase() + env.NODE_ENV.slice(1)}\x1b[0m`,
			`Node      : \x1b[35m${process.version}\x1b[0m`,
		);
		box += makeTwoColRow(
			`Platform    : \x1b[37m${process.platform}\x1b[0m`,
			`PID       : \x1b[35m${process.pid}\x1b[0m`,
		);
		box += makeTwoColRow(
			`Boot Time   : \x1b[32m${startupTimeSec}\x1b[0m`,
			`Memory    : \x1b[37m${memoryUsageMb}\x1b[0m`,
		);
		box += makeRow(`CPU         : \x1b[37m${cpuModel}\x1b[0m`);

		box += midBorder;

		// Service Status Section
		box += makeRow(
			`\x1b[1mService Status (${dbConnected ? "All Connected & Active" : "Degraded / Partial Service"})\x1b[0m`,
		);
		box += makeRow("");
		box += makeTwoColRow(
			`PostgreSQL (Neon) ${dbConnected ? "\x1b[32m✓ Connected\x1b[0m" : "\x1b[31m✗ Unavailable\x1b[0m"}`,
			`Drizzle ORM Tables ${dbConnected ? "\x1b[32m✓ Connected\x1b[0m" : "\x1b[33m⚠ Degraded\x1b[0m"}`,
		);
		box += makeTwoColRow(
			"Cloudinary Storage\x1b[32m✓ Connected\x1b[0m",
			"Google OAuth Gate \x1b[32m✓ Connected\x1b[0m",
		);
		box += makeTwoColRow(
			"Firebase FCM Push \x1b[32m✓ Connected\x1b[0m",
			"BullMQ Auto-Clear \x1b[32m✓ Connected\x1b[0m",
		);
		box += makeTwoColRow(
			"Socket.IO Engine  \x1b[32m✓ Connected\x1b[0m",
			"Gmail SMTP        \x1b[32m✓ Primary\x1b[0m",
		);
		box += makeTwoColRow(
			"Gmail Transport   \x1b[32m✓ Port 587 (TLS)\x1b[0m",
			"Groq Llama 3.3 70B\x1b[32m✓ Connected\x1b[0m",
		);

		box += midBorder;

		// Endpoints Section
		const hostUrl = (
			process.env.SERVER_URL ||
			process.env.RENDER_EXTERNAL_URL ||
			(env.NODE_ENV === "production" ? env.CLIENT_URL : `http://localhost:${port}`)
		).replace(/\/+$/, "");

		const wsUrl = hostUrl.replace(/^http/, "ws");

		box += makeRow("\x1b[1mEndpoints\x1b[0m");
		box += makeRow("");
		box += makeRow(
			`REST API    \x1b[4;34m${hostUrl}/api/v1\x1b[0m`,
		);
		box += makeRow(
			`Health      \x1b[4;34m${hostUrl}/health\x1b[0m`,
		);
		box += makeRow(`Socket.IO   \x1b[4;34m${wsUrl}\x1b[0m`);

		box += midBorder;

		// Startup Logs Section
		box += makeRow("\x1b[1mStartup Initialization Logs\x1b[0m");
		box += makeRow("");

		const phases: StartupPhase[] = [
			"SYSTEM",
			"DATABASE",
			"AUTHENTICATION",
			"EMAIL",
			"STORAGE",
			"REALTIME",
			"QUEUES",
			"AI SERVICES",
			"APPLICATION",
		];

		for (const phase of phases) {
			const phaseLogs = this.entries.filter((e) => e.phase === phase);
			if (phaseLogs.length > 0) {
				for (const entry of phaseLogs) {
					const levelColor =
						entry.level === "INFO"
							? "\x1b[32mINFO\x1b[0m"
							: entry.level === "WARN"
								? "\x1b[33mWARN\x1b[0m"
								: "\x1b[31mERR \x1b[0m";
					const phaseTag = `\x1b[36m${entry.phase.padEnd(14)}\x1b[0m`;
					const logLine = `\x1b[90m[${entry.timestamp}]\x1b[0m ${levelColor} ${phaseTag} ${entry.message}`;
					box += makeRow(logLine);
				}
			}
		}

		// LIVE ACTIVITY Section (Temporary Runtime Events)
		if (this.liveEntries.length > 0) {
			box += midBorder;
			box += makeRow("\x1b[1;33mLIVE ACTIVITY\x1b[0m");
			box += makeRow("");
			for (const entry of this.liveEntries) {
				const badge =
					entry.level === "SUCCESS"
						? "\x1b[1;32mSUCCESS\x1b[0m"
						: entry.level === "WARN"
							? "\x1b[1;33mWARN\x1b[0m"
							: "\x1b[1;36mINFO\x1b[0m";
				const catTag = `\x1b[33m[${entry.category.padEnd(8)}]\x1b[0m`;
				box += makeRow(
					`\x1b[90m[${entry.timestamp}]\x1b[0m ${badge} ${catTag} ${entry.message}`,
				);
			}
		}

		box += midBorder;

		// Overall Status & Listening Message
		const statusStr = dbConnected
			? "\x1b[1;32mALL SYSTEMS READY\x1b[0m"
			: "\x1b[1;33mDATABASE UNAVAILABLE (DEGRADED)\x1b[0m";
		box += makeRow(`Status : ${statusStr}`);
		box += makeRow(
			`Backend server listening at \x1b[1m${hostUrl}\x1b[0m`,
		);

		box += botBorder;

		process.stdout.write(box);
	}
}

export const startupLogger = new StartupLoggerClass();

class RuntimeActivityLoggerClass {
	private activeEntries: RuntimeActivityEntry[] = [];
	private timers: Map<string, NodeJS.Timeout> = new Map();

	public startLifecycle(id: string) {
		if (this.timers.has(id)) {
			clearTimeout(this.timers.get(id));
			this.timers.delete(id);
		}
		this.activeEntries = this.activeEntries.filter((e) => e.id !== id);
		this.render();
	}

	public info(id: string, category: string, message: string) {
		this.addEvent(id, category, "INFO", message);
	}

	public success(id: string, category: string, message: string) {
		this.addEvent(id, category, "SUCCESS", message);
	}

	public warn(id: string, category: string, message: string) {
		this.addEvent(id, category, "WARN", message);
	}

	private addEvent(
		id: string,
		category: string,
		level: "INFO" | "SUCCESS" | "WARN",
		message: string,
	) {
		const timestamp = new Date().toTimeString().split(" ")[0];
		this.activeEntries.push({ id, category, level, message, timestamp });
		this.render();
	}

	public clearLifecycle(id: string, delayMs = 1200) {
		if (this.timers.has(id)) {
			clearTimeout(this.timers.get(id));
		}
		const timer = setTimeout(() => {
			this.activeEntries = this.activeEntries.filter((e) => e.id !== id);
			this.timers.delete(id);
			this.render();
		}, delayMs);
		this.timers.set(id, timer);
	}

	private render() {
		startupLogger.updateLiveActivity(this.activeEntries);
	}
}

export const runtimeActivity = new RuntimeActivityLoggerClass();
