import { test as base } from "@playwright/test";
import { _electron as electron } from "playwright";
import { Fixtures } from "@playwright/test";
import path from "path";
import { ObsidianTestFixtures } from "./fixtures.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { pageUtils, waitForIndexingComplete } from "./util.js";
import { execSync } from "child_process";
import { randomBytes } from "crypto";

export interface ObsidianTestingConfig {
	vault?: string;
}

export function getExe(): string {
	checkToy();
	if (process.platform == "win32") {
		return path.join(
			process.env.LOCALAPPDATA!,
			"Obsidian",
			"Resources",
			"app.asar"
		);
	}

	const possibleDirs = [
		"/opt/Obsidian",
		"/usr/lib/Obsidian",
		"/opt/obsidian",
		"/usr/lib/obsidian",
		"/var/lib/flatpak/app/md.obsidian.Obsidian/current/active/files",
		"/snap/obsidian/current",
	];
	for (let i = 0; i < possibleDirs.length; i++) {
		if (existsSync(possibleDirs[i])) {
			console.log(execSync(`ls -l ${possibleDirs[i]}`).toString());
			return path.join(possibleDirs[i], "resources", "app.asar");
		}
	}
	return "";
}

function checkToy() {
	if (process.platform == "darwin") {
		throw new Error("use a non-toy operating system, dumbass");
	}
}

function generateVaultConfig(vault: string) {
	const vaultHash = randomBytes(8).toString("hex").toLocaleLowerCase();
	let configLocation;
	console.log("vault is", vault, existsSync(vault));
	checkToy();
	if (process.platform == "win32") {
		configLocation = path.join(`${process.env.APPDATA}`, "Obsidian");
	} else {
		configLocation = path.join(`${process.env.XDG_CONFIG_HOME}`, "obsidian");
		try {
			mkdirSync(configLocation, { recursive: true });
		} catch (e) {}
	}
	const obsidianConfigFile = path.join(configLocation, "obsidian.json");
	if (!existsSync(obsidianConfigFile)) {
		writeFileSync(obsidianConfigFile, JSON.stringify({ vaults: {} }));
	}
	const json: {
		vaults: {
			[key: string]: {
				path: string;
				ts: number;
				open?: boolean;
			};
		};
	} = JSON.parse(readFileSync(obsidianConfigFile).toString());

	if (!Object.values(json.vaults).some((a) => a.path === vault)) {
		json.vaults[vaultHash] = {
			path: vault,
			ts: Date.now(),
		};
		writeFileSync(obsidianConfigFile, JSON.stringify(json));
		writeFileSync(path.join(configLocation, `${vaultHash}.json`), "{}");
		return vaultHash;
	} else {
		return Object.entries(json.vaults).find(a => a[1].path === vault)![0];
	}
}

const obsidianTestFixtures: Fixtures<ObsidianTestFixtures> = {
	electronApp: [
		async ({ obsidian: { vault } }, run) => {
			process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
			console.log("asar located at:", getExe());
			let uriArg = "";
			if (vault) {
				let id = generateVaultConfig(vault);
				if (!!id) {
					uriArg = `obsidian://open?vault=${encodeURIComponent(id)}`;
				}
			}

			const electronApp = await electron.launch({
				timeout: 60000,
				args: [getExe(), uriArg].filter((a) => !!a) as string[],
			});
			electronApp.on("console", async (msg) => {
				console.log(
					...(await Promise.all(msg.args().map((a) => a.jsonValue())))
				);
			});
			await electronApp.waitForEvent("window");
			await run(electronApp);
			await electronApp.close();
		},
		{ timeout: 60000 },
	],
	page: [
		async ({ electronApp }, run) => {
			const windows = electronApp.windows();
			// console.log("windows", windows);
			let page = windows[windows.length - 1]!;
			await page.waitForLoadState("domcontentloaded");
			try {
				await waitForIndexingComplete(page);
			} catch(e) {
				console.warn("timed out waiting for metadata cache. continuing...");
			}
			for(let fn of Object.entries(pageUtils)) {
				await page.exposeFunction(fn[0], fn[1]);
			}
			page.on("pageerror", exc => {
				console.error("EXCEPTION");
				console.error(exc);
			})
			page.on("console", async (msg) => {
				console.log(
					...(await Promise.all(msg.args().map((a) => a.jsonValue())))
				);
			});
			await run(page);
		},
		{ timeout: 60000 },
	],
	obsidian: [{}, { option: true }],
};
// @ts-ignore some error about a string type now having `undefined` as part of it's union
export const test = base.extend<ObsidianTestFixtures>(obsidianTestFixtures);
