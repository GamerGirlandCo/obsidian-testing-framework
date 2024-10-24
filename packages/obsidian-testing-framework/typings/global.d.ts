import {App} from "obsidian";
declare global {
	var app: App;
	var __callback: <T>(app: App) => T;
}
export {}
