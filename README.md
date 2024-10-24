# the Obsidian Testing Framework 

## what is this?

this is a library that (finally!) lets you end-to-end test your obsidian plugins.
it uses [playwright](https://playwright.dev/docs/intro) to interact with obsidian,
which is an Electron app under the hood.

## great! how do i use it?

### basic usage
```ts
import {test} from "obsidian-testing-framework";
test('obsidian app url', async ({ page }) => {
	console.log(page.url());
	expect(/obsidian\.md/i.test(page.url())).toBeTruthy()
});
```
### usage with the `app` instance
```ts
test("idk", async({page}) => {
	console.log("idk")
	let tfile = await doWithApp(page,async (app) => {
		return app.metadataCache.getFirstLinkpathDest("Welcome", "/");
	});
	expect(what.basename).toEqual("Welcome")
})
```

### other utilities

see `src/util.ts` for the currently included utilities and their documentation.
