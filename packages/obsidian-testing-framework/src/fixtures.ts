import { ElectronApplication, JSHandle, Page } from "playwright";
import { ObsidianTestingConfig } from "./index.js";
import { App } from "obsidian";
// import { getFile } from "./util.js";

export interface ObsidianTestFixtures {
	electronApp: ElectronApplication;
	page: Page;
	obsidian: ObsidianTestingConfig;
	appHandle: JSHandle<App>;
}
