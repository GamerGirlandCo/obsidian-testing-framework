import { App, TFile } from "obsidian";
import { JSHandle, Page } from "playwright";
import { expect } from "@playwright/test";

// type TestArgs = Parameters<Parameters<typeof test>[2]>[0];

export async function assertFileEquals(
	page: Page,
	path: string,
	expectedContent: string,
	cached: boolean = true
) {
	const fileContent = await readFile(page, path, cached);

	expect(fileContent).toEqual(normalizeEOL(expectedContent));
}
export async function assertLineEquals(
	page: Page,
	path: string,
	lineNumber: number,
	expectedContent: string,
	cached: boolean = true
) {
	const fileContent = await readFile(page, path, cached);

	expect(fileContent.split("\n")[lineNumber]).toEqual(
		normalizeEOL(expectedContent)
	);
}
export async function getApp(page: Page): Promise<JSHandle<App>> {
	return await page.evaluateHandle("window.app");
}

export async function assertLinesEqual(
	page: Page,
	filePath: string,
	start: number,
	end: number,
	expected: string,
	cached: boolean = true
) {
	const fileContent = await readFile(page, filePath, cached);
	const lines = fileContent.split("\n").slice(start, end);
	const expectedLines = normalizeEOL(expected).split("\n");
	expect(lines.every((l, i) => l == expectedLines[i])).toEqual(true);
}

export function getFile(app: App, file: string): TFile {
	let f = app.vault.getFileByPath(file);
	if (!f) {
		throw new Error("File does not exist in vault.");
	}
	return f;
}

function normalizeEOL(str: string): string {
	return str.split(/\r\n|\r|\n/).join("\n");
}

export async function readFile(
	app: Page,
	path: string,
	cached: boolean = true
): Promise<string> {
	return normalizeEOL(
		await doWithApp(app, (a) => {
			const file = getFile(a, path);
			return cached ? a.vault.cachedRead(file) : a.vault.read(file);
		})
	);
}

export async function doWithApp<T = unknown>(
	page: Page,
	callback: (a: App) => T | Promise<T>
): Promise<T> {
	const cbStr = callback.toString();
	return await page.evaluate<T, string>(async (cb) => {
		const func = new Function(`return (${cb})(window.app)`)
		return await func();
	}, cbStr);
}

export function waitForIndexingComplete(appHandle: JSHandle<App>) {
	return appHandle.evaluate(() => {
		return new Promise((res2, rej2) => {
			let resolved = false;
			app.metadataCache.on("resolved", () => {
				res2(null);
				resolved = true;
			});
			setTimeout(() => !resolved && rej2("timeout"), 10000);
		});
	});
}

export const pageUtils = {
	getFile,
}
