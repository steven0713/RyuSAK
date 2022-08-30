import fs from "fs-extra";
import path from "path";
import zip from "adm-zip";
import HttpService, { HTTP_PATHS, OTHER_URLS } from "../services/HttpService";
import { BrowserWindow } from "electron";
import EShopMetaService from "../services/EShopMetaService";
import { Buffer } from "buffer";;
import FormData from "form-data";
import { MirrorUploadResponse } from "../../types";

export type countShadersProps = [string, string];

export type installShadersProps = [string, string];

export type shareShaders = [string, string, number, number];

export const writeZipAsync = (archive: zip, path: string): Promise<Error> => new Promise((resolve) => {
  archive.writeZip(path, (error) => resolve(error));
});

export const countShaders = async (...args: countShadersProps): Promise<number> => {
  const [titleId, dataPath] = args;
  const shaderTocFile = path.resolve(dataPath, "games", titleId.toLocaleLowerCase(), "cache", "shader", "shared.toc");

  if (!await fs.pathExists(shaderTocFile)) {
    return 0;
  }

  // First, check cache version to ensure it will be accepted by Ryujinx
  const fd = await fs.open(shaderTocFile, "r+");
  const buffer = Buffer.alloc(8);
  await fs.read(fd, buffer, 0, 8, 4);
  const cacheVersion = buffer.readUInt32LE();
  await fs.close(fd);

  // ((1 << 16) | 2) aka v1.2
  if (cacheVersion < 65538) {
    return 0;
  }

  // If cache version is accepted by Ryujinx, computer shader count
  const stat = await fs.stat(shaderTocFile);
  return Math.max((stat.size - 32) / 8, 0);
};

export const installShaders = async (mainWindow: BrowserWindow, ...args: installShadersProps): Promise<boolean> => {
  const [titleId, dataPath] = args;

  const shaderCacheDir = path.resolve(dataPath, "games", titleId.toLowerCase(), "cache", "shader");
  await fs.ensureDir(shaderCacheDir);
  await fs.emptyDir(shaderCacheDir);

  const shaderCacheZipPath = path.resolve(shaderCacheDir, `${titleId}.zip`);
  const result = await HttpService.getWithProgress(HTTP_PATHS.SHADERS_ZIP.replace("{title_id}", titleId), shaderCacheZipPath, mainWindow, titleId);

  if (!result) {
    return null;
  }

  const shaderCacheZip = new zip(shaderCacheZipPath);
  shaderCacheZip.extractAllTo(shaderCacheDir, true);
  await fs.unlink(shaderCacheZipPath);

  return true;
};

export const shareShaders = async (mainWindow: BrowserWindow, ...args: shareShaders) => {
  const [titleId, dataPath, localCount, ryusakCount] = args;
  const metadata = await EShopMetaService.getEShopMeta(titleId);
  const shaderCacheDir = path.resolve(dataPath, "games", titleId.toLowerCase(), "cache", "shader");
  const shaderCacheZipPath = path.resolve(shaderCacheDir, `${titleId}.zip`);

  const shaderCacheZip = new zip();
  shaderCacheZip.addLocalFile(path.resolve(shaderCacheDir, "guest.data"));
  shaderCacheZip.addLocalFile(path.resolve(shaderCacheDir, "guest.toc"));
  shaderCacheZip.addLocalFile(path.resolve(shaderCacheDir, "shared.data"));
  shaderCacheZip.addLocalFile(path.resolve(shaderCacheDir, "shared.toc"));

  await writeZipAsync(shaderCacheZip, shaderCacheZipPath);

  const size = fs.lstatSync(shaderCacheZipPath).size;
  let bytes = 0;
  let lastEmittedEventTimestamp = 0;
  const readStream = fs.createReadStream(shaderCacheZipPath).on("data", (chunk) => {
    bytes += chunk.length;
    const currentTimestamp = new Date().getUTCMilliseconds();
    if (currentTimestamp - lastEmittedEventTimestamp >= 100) {
      const percentage = (bytes / size * 100).toFixed(2);
      mainWindow.webContents.send("download-progress", titleId, percentage);
      lastEmittedEventTimestamp = new Date().getUTCMilliseconds();
    }
  });

  const formData = new FormData();
  formData.append("file", readStream);

  const uploadRes = await HttpService.post(OTHER_URLS.SHADERS_UPLOAD, formData);
  await fs.unlink(shaderCacheZipPath);

  if (!uploadRes.ok) {
    return { error: true, code: "SHADER_UPLOAD_FAIL", message: `${uploadRes.status} - ${uploadRes.statusText}` };
  }

  const uploadJson = await uploadRes.json() as MirrorUploadResponse;
  const message = {
    embeds: [
      {
        author: {
          name: "RyuSAK",
          url: "https://github.com/Ecks1337/RyuSAK",
          icon_url: "https://raw.githubusercontent.com/Ecks1337/RyuSAK/master/src/assets/icon.ico"
        },
        color: 5055982,
        fields: [
          {
            name: "Title Name",
            value: metadata.name
          },
          {
            name: "Title ID",
            value: metadata.id
          },
          {
            name: "Local Shader Count",
            value: localCount
          },
          {
            name: "RyuSAK Shader Count",
            value: ryusakCount
          },
          {
            name: "File ID",
            value: uploadJson.fileId
          },
          {
            name: "Deletion Token",
            value: uploadJson.deletionToken
          },
          {
            name: "Deletion Time",
            value: uploadJson.deletionTime
          }
        ]
      }
    ]
  };

  const webhookRes = await HttpService.postJSON(OTHER_URLS.SHADERS_POST, message);
  if (webhookRes.ok) {
    return { error: false, code: null, message: null };
  } else {
    return {
      error: true,
      code: "SHADER_WEBHOOK_FAIL",
      message: `<code>Title Name: ${metadata.name}</br>Title ID: ${metadata.id}</br>Local Shader Count: ${localCount}</br>RyuSAK Shader Count: ${ryusakCount}</br>File ID: ${uploadJson.fileId}</br>Deletion Token: ${uploadJson.deletionToken}</br>Deletion Time: ${uploadJson.deletionTime}</code>`
    };
  }
};
