import fs from "fs-extra";
import path from "path";
import zip from "adm-zip";
import HttpService, { HTTP_PATHS } from "../services/HttpService";
import { BrowserWindow, dialog } from "electron";
import { buildMetadataForTitleId } from "./emulatorFilesystem";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Buffer } from "buffer";

export type countShadersProps = [string, string];

export type installShadersProps = [string, string];

export type shareShaders = [string, string, number, number];

export const asyncZipWrite = (archive: zip, path: string): Promise<void> => new Promise((resolve) => {
  archive.writeZip(path, () => resolve());
});

const updateConfig = (conf: any) => {
  conf["logging_enable_error"] = true;
  conf["logging_enable_guest"] = true;
  conf["logging_enable_info"] = true;
  conf["logging_enable_stub"] = true;
  conf["logging_enable_warn"] = true;
  conf["logging_enable_fs_access_log"] = true;
  return conf;
};

const asyncReadRyujinxProcess = async (ryuBinPath: string): Promise<any> => new Promise((resolve, reject) => {
  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn(ryuBinPath);
  } catch(e) {
    dialog.showMessageBox({
      title: "Error",
      message: "Cannot launch Ryujinx, please redo the same but launch RyuSAK as admin. Probably antivirus is preventing RyuSAK to launch Ryujinx.",
      type: "error",
      buttons: ["Ok"],
    });
    return Promise.reject("");
  }
  let fullData = "";
  let ranTitleId: string;
  let ranTitleVersion: string;

  child.on("exit", () => resolve(false));
  child.stdout.on("data", (data: string) => {
    fullData += data;
    const titleIdMatch = /for Title (.+)/gi.exec(fullData);
    const titleVersionMatch = /v([\d+.]+) \[/.exec(fullData);

    if (titleVersionMatch && titleVersionMatch.length >= 2) {
      ranTitleVersion = titleVersionMatch[1];
    }

    if (titleIdMatch && titleIdMatch.length >= 2) {
      ranTitleId = titleIdMatch[1].trim();
    }

    if (ranTitleId && fullData.toLowerCase().includes("cache loaded")) {
      resolve({ ranTitleId, compiledShadersCount: 0, ranTitleVersion });
      child.kill();
    }
  });
  child.stdout.on("error", () => reject(false));
});

export const packShaders = async (dataPath: string, titleID: string): Promise<any> => {
  const guestData = path.resolve(dataPath, "games", titleID.toLowerCase(), "cache", "shader", "guest.data");
  const archive = new zip();
  archive.addLocalFile(guestData);
  archive.addLocalFile(path.resolve(dataPath, "games", titleID.toLowerCase(), "cache", "shader", "guest.toc"));
  archive.addLocalFile(path.resolve(dataPath, "games", titleID.toLowerCase(), "cache", "shader", "shared.data"));
  archive.addLocalFile(path.resolve(dataPath, "games", titleID.toLowerCase(), "cache", "shader", "shared.toc"));

  const zipPath = path.resolve(guestData, "..", "upload.zip");
  await asyncZipWrite(archive, zipPath);

  return zipPath;
};

export const countShaders = async (...args: countShadersProps): Promise<number> => {
  const [titleId, dataPath] = args;
  const shaderTocFile = path.resolve(dataPath, "games", titleId.toLocaleLowerCase(), "cache", "shader", "shared.toc");
  const shaderExists = await fs.pathExists(shaderTocFile);
  const shaderZipPath = path.resolve(dataPath, "games", titleId.toLocaleLowerCase(), "cache", "shader", "guest", "program", "cache.zip");
  const shaderZipExists = await fs.pathExists(shaderZipPath);

  if (!shaderExists) {
    if (shaderZipExists) {
      try {
        const archive = new zip(shaderZipPath);
        return archive.getEntries().length;
      } catch(e) {
        return 0;
      }
    }

    return 0;
  }

  // First, check cache version to ensure it will be accepted by Ryujinx
  const fd = await fs.open(shaderTocFile, "r+");
  const buffer = Buffer.alloc(8);
  await fs.read(fd, buffer, 0, 8, 4);
  const cacheVersion = buffer.readBigUInt64LE();
  await fs.close(fd);

  if (cacheVersion < 65537) {
    return 0;
  }

  // If cache version is accepted by Ryujinx, computer shader count
  const stat = await fs.stat(shaderTocFile);
  return Math.max(+((stat.size - 32) / 8), 0);
};

export const installShaders = async (mainWindow: BrowserWindow, ...args: installShadersProps): Promise<boolean> => {
  const [titleId, dataPath] = args;

  const shaderCacheDir = path.resolve(dataPath, "games", titleId.toLowerCase(), "cache", "shader");
  await fs.ensureDir(shaderCacheDir);
  await fs.emptyDir(shaderCacheDir);

  const shaderCacheZipPath = path.resolve(shaderCacheDir, "cache.zip");
  const result = await HttpService.fetchWithProgress(HTTP_PATHS.SHADER_ZIP.replace("{title_id}", titleId), shaderCacheZipPath, mainWindow, titleId);

  if (!result) {
    return null;
  }

  const shaderCacheZip = new zip(shaderCacheZipPath);
  shaderCacheZip.extractAllTo(shaderCacheDir, true);
  await fs.unlink(shaderCacheZipPath);

  return true;
};

export const shareShaders = async (mainWindow: BrowserWindow, ...args: shareShaders) => {
  throw new Error("Not implemented"); // @ts-ignore

  const [titleId, dataPath, localCount, ryusakCount] = args;

  const guestTocFile = path.resolve(dataPath, "games", titleId.toLowerCase(), "cache", "shader", "guest.toc");

  if (!await fs.pathExists(guestTocFile)) {
    return { error: true, code: "SHADER_CACHE_V1" };
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"] });

  if (canceled) {
    return { error: true, code: "OPERATION_CANCELED" };
  }

  const ryuBinary = filePaths[0];

  if (!ryuBinary.toLowerCase().includes("ryujinx")) {
    return { error: true, code: "INVALID_RYUJINX_BINARY" };
  }

  const ldnConfigPath = path.resolve(dataPath, "LDNConfig.json");
  const hasLdnConfigFile = await fs.promises.access(ldnConfigPath).then(() => true).catch(() => false);
  const standardConfigPath = path.resolve(dataPath, "Config.json");

  let ryujinxConfig = JSON.parse((await fs.promises.readFile(standardConfigPath)).toString());
  ryujinxConfig = updateConfig(ryujinxConfig);
  await fs.promises.writeFile(hasLdnConfigFile ? ldnConfigPath : standardConfigPath, JSON.stringify(ryujinxConfig, null, 2), "utf-8");

  const metadata = await buildMetadataForTitleId(titleId);
  const result = await asyncReadRyujinxProcess(ryuBinary).catch(() => false);

  if (!result) {
    return;
  }

  if (result.ranTitleId.toLowerCase() !== titleId.toLowerCase()) {
    return { error: true, code: `You shared the wrong titleID, you had to run ${metadata.title || metadata.titleId} in Ryujinx` };
  }

  /**
   if (result.compiledShadersCount !== localCount) {
    return { error: true, code: `You have ${localCount} on your cache but Ryujinx compiled ${result.compiledShadersCount}. That means that some shaders are either corrupted or rejected. This probably isn't your fault, it probably means you build shaders a longer time ago and Ryujinx chose to reject them because they changed something in their code. The game probably run fine, but because we share shaders to everyone, we chose to reject your submission to avoid any conflict as we aren't 100% sure if this will cause issue to anyone.` };
  }
   */

  const shadersPath = await packShaders(dataPath, titleId);
  const size = fs.lstatSync(shadersPath).size;
  let bytes = 0;
  let lastEmittedEventTimestamp = 0;

  // @ts-ignore
  const readStream = fs.createReadStream(shadersPath).on("data", (chunk) => {
    bytes += chunk.length;
    const currentTimestamp = +new Date();
    if (currentTimestamp - lastEmittedEventTimestamp >= 100) {
      const percentage = (bytes / size * 100).toFixed(2);
      mainWindow.webContents.send("download-progress", titleId, percentage);
      lastEmittedEventTimestamp = +new Date();
    }
  });

  // TODO: implement uploading shaders
  return true;
};
