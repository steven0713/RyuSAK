import { app, ipcMain, BrowserWindow } from "electron";
import loadComponentIpcHandler from "./loadComponent.ipc";
import titleBarIpc from "./titleBar.ipc";
import {
  emulatorFilesystem,
  scanGamesForConfig,
  buildMetadataForTitleId,
  deleteGameProps,
  deleteGame
} from "./emulatorFilesystem";
import { RyusakEmulatorsKind } from "../../types";
import { addEmulatorConfigurationIpc, createDefaultConfigActionForEmu } from "./addEmulatorConfiguration.ipc";
import installFirmware from "./firmware.ipc";
import { installKeys } from "./installKeys";
import updateEshopData from "./eshopData.ipc";
import openFolderForGame, { openFolderIPCProps } from "./openFolderForGame";
import ryujinxCompatibility, { ryujinxCompatibilityProps } from "./ryujinxCompatibility";
import savesDownloads from "./savesDownload";
import { countShaders, countShadersProps, installShaders, installShadersProps, shareShaders } from "./shaders";
import { toggleCustomDnsResolver } from "./dns.ipc";
import { hasDnsFile } from "../../index";
import { searchGameBana, searchProps } from "./gamebanana";
import { setProxy } from "./settings.ipc";

export type IPCCalls = {
  "load-components": Promise<ReturnType<typeof loadComponentIpcHandler>>,
  "get-app-version": Promise<string>,
  "title-bar-action": Promise<ReturnType<typeof titleBarIpc>>,
  "add-emulator-folder": Promise<ReturnType<typeof addEmulatorConfigurationIpc>>,
  "system-scan-for-config": Promise<ReturnType<typeof emulatorFilesystem>>,
  "build-default-emu-config": Promise<ReturnType<typeof createDefaultConfigActionForEmu>>,
  "scan-games": Promise<ReturnType<typeof scanGamesForConfig>>,
  "build-metadata-from-titleId": Promise<ReturnType<typeof buildMetadataForTitleId>>,
  "install-firmware": Promise<ReturnType<typeof installFirmware>>,
  "install-keys": Promise<ReturnType<typeof installKeys>>,
  "update-eshop-data": ReturnType<typeof updateEshopData>,
  "openFolderForGame": ReturnType<typeof openFolderForGame>,
  "getRyujinxCompatibility": ReturnType<typeof ryujinxCompatibility>,
  "downloadSave": ReturnType<typeof savesDownloads>,
  "count-shaders": ReturnType<typeof countShaders>,
  "install-shaders": ReturnType<typeof installShaders>,
  "share-shaders": ReturnType<typeof shareShaders>,
  "toggle-custom-dns": ReturnType<typeof toggleCustomDnsResolver>,
  "has-dns-file": Promise<boolean>,
  "search-gamebanana": ReturnType<typeof searchGameBana>,
  "delete-game": ReturnType<typeof deleteGame>,
  "set-proxy": ReturnType<typeof setProxy>,
};

const makeIpcRoutes = (mainWindow: BrowserWindow) => {
  ipcMain.handle("load-components", async (_) => loadComponentIpcHandler());
  ipcMain.handle("get-app-version", async () => app.getVersion());
  ipcMain.handle("title-bar-action", async (_, action: "maximize" | "close" | "minimize") => titleBarIpc(action, mainWindow));
  ipcMain.handle("add-emulator-folder", async (_, emuKind: RyusakEmulatorsKind) => addEmulatorConfigurationIpc(mainWindow, emuKind));
  ipcMain.handle("system-scan-for-config", async (_, emuKind: RyusakEmulatorsKind, path: string) => emulatorFilesystem(emuKind, path));
  ipcMain.handle("build-default-emu-config", async (_, emu: RyusakEmulatorsKind) => createDefaultConfigActionForEmu(emu));
  ipcMain.handle("scan-games", async (_, dataPath: string, emu: RyusakEmulatorsKind) => scanGamesForConfig(dataPath, emu));
  ipcMain.handle("build-metadata-from-titleId", async (_, titleId: string) => buildMetadataForTitleId(titleId));
  ipcMain.handle("install-firmware", async (event, emu: RyusakEmulatorsKind, dataPath: string, fwVersion: string) => installFirmware(emu, dataPath, fwVersion, mainWindow));
  ipcMain.handle("install-keys", async (_, dataPath: string, emu: RyusakEmulatorsKind) => installKeys(dataPath, emu));
  ipcMain.handle("update-eshop-data", async () => updateEshopData());
  ipcMain.handle("openFolderForGame", async (_, ...args: openFolderIPCProps) => openFolderForGame(...args));
  ipcMain.handle("getRyujinxCompatibility", async (_, ...args: ryujinxCompatibilityProps) => ryujinxCompatibility(...args));
  ipcMain.handle("downloadSave", async (_, fileName: string) => savesDownloads(fileName));
  ipcMain.handle("count-shaders", async (_, ...args: countShadersProps) => countShaders(...args));
  ipcMain.handle("install-shaders", async (_, ...args: installShadersProps) => installShaders(mainWindow, ...args));
  ipcMain.handle("share-shaders", async (_, ...args: shareShaders) => shareShaders(mainWindow, ...args));
  ipcMain.handle("toggle-custom-dns", async () => toggleCustomDnsResolver());
  ipcMain.handle("has-dns-file", async () => hasDnsFile);
  ipcMain.handle("search-gamebanana", async (_, ...args: searchProps) => searchGameBana(...args));
  ipcMain.handle("delete-game", (_, ...args: deleteGameProps) => deleteGame(...args));
  ipcMain.handle("set-proxy", async (_, proxy: string) => setProxy(proxy));
};

export default makeIpcRoutes;
