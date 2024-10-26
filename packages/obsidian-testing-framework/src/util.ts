import { App, TFile } from "obsidian";
import { Page } from "playwright";
import { expect } from "@playwright/test";


/**
 * asserts that the contents of the file at `path` is equal to `expectedContent`.  
 *
 * @export
 * @param {Page} page - a Playwright page
 * @param {string} path - the file to check
 * @param {string} expectedContent - the expected content
 * @param {boolean} [cached=true] - whether to use `app.vault.cachedRead`
 */
export async function assertFileEquals(
	page: Page,
	path: string,
	expectedContent: string,
	cached: boolean = true
) {
	const fileContent = await readFile(page, path, cached);
	expect(fileContent).toEqual(normalizeEOL(expectedContent));
}

/**
 * asserts that the line at `lineNumber` in the file at `path` is equal
 * to `expectedContent`.
 *
 * @export
 * @param {Page} page - a Playwright page
 * @param {string} path - the file to check
 * @param {number} lineNumber - the line in the file to check (0-based)
 * @param {string} expectedContent - the expected content
 * @param {boolean} [cached=true] - whether to use `app.vault.cachedRead`
 */
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

/**
 * asserts that the lines in the specified range are equal to the expected
 * content.
 *
 * @export
 * @param {Page} page - a Playwright page
 * @param {string} path - the file to check
 * @param {number} start - the start of the desired line range (0-based)
 * @param {number} end - the end of the desired line range (1-based)
 * @param {string} expected - the expected content
 * @param {boolean} [cached=true] - whether to use `app.vault.cachedRead`
 */
export async function assertLinesEqual(
	page: Page,
	path: string,
	start: number,
	end: number,
	expected: string,
	cached: boolean = true
) {
	const fileContent = await readFile(page, path, cached);
	const lines = fileContent.split("\n").slice(start, end);
	const expectedLines = normalizeEOL(expected).split("\n");
	expect(lines.every((l, i) => l == expectedLines[i])).toEqual(true);
}

const getFile = (file: string): TFile => {
	let f = window.app.vault.getFileByPath(file);
	if (!f) {
		throw new Error("File does not exist in vault.");
	}
	return f;
}

/**
 * asserts all lines in the given range match a regex.
 *
 * @export
 * @param {Page} page - a Playwright page
 * @param {string} path - the file to check
 * @param {number} start - the start of the desired line range (0-based)
 * @param {number} end - the end of the desired line range (1-based)
 * @param {RegExp} regex - the regex to test against
 * @param {boolean} [cached=true] - whether to use `app.vault.cachedRead`
 */
export async function assertLinesMatch(page: Page, path: string, start: number, end: number, regex: RegExp, cached: boolean = true) {
	const fileContent = await readFile(page, path, cached);
	const lines = fileContent.split("\n").slice(start, end);
	expect(lines.every(l => regex.test(l))).toEqual(true);
}

/**
 * reads the file at `path` and returns its contents
 *
 * @export
 * @param {Page} page - a Playwright page
 * @param {string} path the file to read
 * @param {boolean} [cached=true] - whether to use `app.vault.cachedRead`
 * @return {Promise<string>} the file's contents
 */
export async function readFile(
	page: Page,
	path: string,
	cached: boolean = true
): Promise<string> {
	const fn = getFile.toString();
	return normalizeEOL(
		await doWithApp(page, async (app, args) => {
			const gf = eval(`(${args.getFile})`);
			const file = gf(args.path);
			return await (args.cached ? app.vault.cachedRead(file) : app.vault.read(file));
		}, {path, cached, getFile: fn})
	);
}

/**
 * do something with the global `App` instance,
 * and return the result of that invocation
 *
 * @export
 * @typeParam - T the return type of the callback
 * @typeParam - A the additional argument(s) to pass
 * @param {Page} page - a Playwright page
 * @param {((a: App, args?: A) => T | Promise<T>)} callback - the function to execute
 * @param {A} [args] - optional arguments to pass to the callback
 * @return {Promise<T>} a promise containing `callback`'s return value (if any)
 */
export async function doWithApp<T = unknown, A = any>(
	page: Page,
	callback: (a: App, args?: A) => T | Promise<T>,
	args?: A
): Promise<T> {
	const cbStr = callback.toString();
	return await page.evaluate<T, {__callback: string, args: A}>(async ({__callback: cb, args}) => {
		const func = new Function("args", `return ((${cb}))(window.app, args)`)
		return await func(args);
	}, {__callback: cbStr, args});
}

/**
 * @internal
 */
export function waitForIndexingComplete(page: Page) {
	return page.evaluateHandle<App>("window.app").then((appHandle) => {
		return appHandle.evaluate((app) => {
			return new Promise((res2, rej2) => {
				let resolved = false;
				app.metadataCache.on("resolved", () => {
					res2(null);
					resolved = true;
				});
				setTimeout(() => !resolved && rej2("timeout"), 10000);
			});
		});
	});
}

/**
 * @internal 
 */
function normalizeEOL(str: string): string {
	return str.split(/\r\n|\r|\n/).join("\n");
}

/**
 * @internal
 */
export const pageUtils = {
	getFile,
};
