import { expect } from '@playwright/test';
import {test} from "obsidian-testing-framework"
import {doWithApp, getApp} from "obsidian-testing-framework/utils";
test('something', async ({ page }) => {
	console.log(page.url());
	expect(/obsidian\.md/i.test(page.url())).toBeTruthy()
});
test("idk", async({page}) => {
	console.log("idk")
	let what = await doWithApp(page,async (app) => {
		console.log("hi", Object.keys(app), (app.metadataCache));
		let thing = app.metadataCache.getFirstLinkpathDest("Welcome", "/");
		console.log("THING", thing);
		await new Promise(res => setTimeout(res, 5000))
		console.log(thing?.path);
		const what = {...thing};
		delete what.parent;
		delete what.vault;
		return what;
	});
	expect(what.basename).toEqual("Welcome")
})
