import { expect } from '@playwright/test';
import {test} from "obsidian-testing-framework"
import {TFile} from "obsidian";
import {assertLineEquals, doWithApp, readFile} from "obsidian-testing-framework/utils";
test('something', async ({ page }) => {
	console.log(page.url());
	expect(/obsidian\.md/i.test(page.url())).toBeTruthy()
});
test("idk", async({page}) => {
	let what = await doWithApp<TFile | null>(page, async (app) => {
		return app.metadataCache.getFirstLinkpathDest("Welcome", "/");
	});
	// console.log("WHAT", what)
	// console.log(what?.vault)
	expect(what?.basename).toEqual("Welcome")
})

test("file line", async({page}) => {
	console.log(await readFile(page, "Welcome.md"))
	await assertLineEquals(page, "Welcome.md", 0, "This is your new *vault*.");
})
