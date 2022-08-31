import { URL } from "url";
import fetch, { RequestInit, HeadersInit, BodyInit } from "node-fetch";
import pRetry from "p-retry";
import { app, BrowserWindow, ipcMain } from "electron";
import http from "http";
import https from "https";
import httpsProxyAgent from "https-proxy-agent";
import fs from "fs-extra";
import path from "path";
import { MirrorDirMeta, RyusakShaders, GithubIssue } from "../../types";
import Enumerable from "linq";

const USER_AGENT: string = `RyuSAK/${app.getVersion()}`;
const CDN_URL: string = "https://mirror.lewd.wtf";

export enum HTTP_PATHS {
  FIRMWARE_LIST     = "/json/archive/nintendo/switch/firmware/",
  FIRMWARE_ZIP      = "/archive/nintendo/switch/firmware/Firmware {fw_version}.zip",
  MODS_TITLE_LIST   = "/json/archive/nintendo/switch/mods/",
  MODS_VERSION_LIST = "/json/archive/nintendo/switch/mods/{title_id}/",
  MODS_LIST         = "/json/archive/nintendo/switch/mods/{title_id}/{version}/",
  MOD_DOWNLOAD      = "/json/archive/nintendo/switch/mods/{title_id}/{version}/{name}/",
  SAVES_LIST        = "/json/archive/nintendo/switch/savegames/",
  SAVES_DOWNLOAD    = "/archive/nintendo/switch/savegames/{file_name}",
  SHADERS_LIST      = "/archive/nintendo/switch/ryusak/shader_count_spirv.json",
  SHADERS_MIN_VER   = "/archive/nintendo/switch/ryusak/shader_min_version.txt",
  SHADERS_POST      = "/push_shader.php",
  SHADERS_ZIP       = "/archive/nintendo/switch/shaders/SPIR-V/{title_id}.zip",
  THRESHOLD         = "/archive/nintendo/switch/ryusak/threshold.txt",
}

export enum OTHER_URLS {
  SHADERS_UPLOAD     = "https://send.nukes.wtf/upload/",
  RELEASE_INFO       = "https://api.github.com/repos/Ecks1337/RyuSAK/releases/latest",
  COMPAT_LIST        = "https://api.github.com/search/issues?q={query}%20repo:Ryujinx/Ryujinx-Games-List",
  ESHOP_DATA         = "https://github.com/AdamK2003/titledb/releases/download/latest/titles.US.en.json",
  GAME_BANANA_SEARCH = "https://gamebanana.com/apiv7/Util/Game/NameMatch?_sName={query}&_nPerpage=10&_nPage=1",
  GAME_BANANA_PAGE   = "https://gamebanana.com/mods/games/{id}?mid=SubmissionsList&vl[preset]=most_dld&vl%5Border%5D=downloads",
  KEYS               = "http://emusak.coveforme.com/firmware/prod.keys",
}

class HttpService {
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;

  constructor() {
    const cacheDir = fs.existsSync(path.resolve(app.getPath("exe"), "..", "portable"))
      ? path.resolve(app.getPath("exe"), "..", "electron_cache")
      : path.join(app.getPath("userData"));

    const proxyFile = path.resolve(cacheDir, "proxy");
    const proxy: string = fs.existsSync(proxyFile)
      ? fs.readFileSync(proxyFile, "utf-8")
      : null;

    this.updateHttpAgents(proxy);
  }

  public updateHttpAgents(proxy: string) {
    let oldhttpAgent = this.httpAgent;
    let oldhttpsAgent = this.httpsAgent;

    if (proxy) {
      this.httpsAgent = this.httpAgent = httpsProxyAgent(proxy);
    } else {
      this.httpAgent = new http.Agent();
      this.httpsAgent = new https.Agent();
    }

    oldhttpAgent?.destroy();
    oldhttpsAgent?.destroy();
  }

  protected fetch(url: string, req: RequestInit = { }) {
    req.headers = {
      ...req.headers,
      "User-Agent": USER_AGENT
    };

    return fetch(url, req);
  }

  // Trigger HTTP request using an exponential backoff strategy
  protected get(path: string, contentType: "JSON" | "TXT" | "BUFFER" = "JSON", retries = 3) {
    const url = new URL(path, CDN_URL);
    return pRetry(
      async () => {
        const response = await this.fetch(url.href, {
          agent: url.protocol == "https:"
            ? this.httpsAgent
            : this.httpAgent
        });

        if (response.status >= 400) {
          throw new pRetry.AbortError(response.statusText);
        }

        if (contentType === "JSON") {
          return response.json();
        }

        if (contentType === "BUFFER") {
          return response.arrayBuffer();
        }

        return response.text();
      },
      { retries }
    ) as Promise<any>;
  }

  public async post(path: string, body: BodyInit, headers: HeadersInit = null) {
    const url = new URL(path, CDN_URL);
    return this.fetch(url.href, {
      agent: this.httpsAgent,
      method: "POST",
      body,
      headers
    });
  }

  public async postJSON(path: string, obj: any) {
    return this.post(
      path,
      JSON.stringify(obj),
      { "Content-Type": "application/json" }
    );
  }

  public async getWithProgress(path: string, destPath: string, mainWindow: BrowserWindow, eventName: string) {
    const url = new URL(path, CDN_URL);
    const fileStream = fs.createWriteStream(destPath);
    const controller = new AbortController();

    const response = await this.fetch(url.href, {
      signal: controller.signal,
      agent: this.httpsAgent
    });

    let chunkLength = 0;
    let lastEmittedEventTimestamp = 0;
    const contentLength = +(response.headers.get("content-length"));
    const startTime = Date.now();

    ipcMain.on("cancel-download", async (_, abortKey: string) => {
      if (abortKey !== eventName) return;
      fileStream.close();
      await fs.unlink(destPath).catch(() => null);
      controller.abort();
    });

    return new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on("error", reject);
      response.body.on("data", (chunk) => {
        chunkLength += chunk.length;
        const percentage = chunkLength / contentLength * 100;
        const currentTimestamp = +new Date();
        const timeRange = currentTimestamp - startTime;
        const downloadSpeed = chunkLength / timeRange / 1024;

        // Throttle event to 1 time every 100ms
        if (currentTimestamp - lastEmittedEventTimestamp >= 200) {
          mainWindow.webContents.send("download-progress", eventName, percentage.toFixed(2), +downloadSpeed.toFixed(2));
          lastEmittedEventTimestamp = currentTimestamp;
        }
      });
      fileStream.on("finish", () => resolve(destPath));
    }).catch(() => null);
  }

  public async downloadRyujinxShaderList() {
    return this.get(HTTP_PATHS.SHADERS_LIST) as Promise<RyusakShaders>;
  }

  public async downloadSaveList() {
    return this.get(HTTP_PATHS.SAVES_LIST) as Promise<MirrorDirMeta>;
  }

  public async downloadModsTitleList() {
    return this.get(HTTP_PATHS.MODS_TITLE_LIST) as Promise<MirrorDirMeta>;
  }

  public async getThreshold() {
    return this.get(HTTP_PATHS.THRESHOLD, "TXT").catch(() => -1) as Promise<number>;
  }

  public async getShadersMinVersion() {
    return this.get(HTTP_PATHS.SHADERS_MIN_VER, "TXT") as Promise<number>;
  }

  public async getFirmwareVersion() {
    const firmwareJson = await this.get(HTTP_PATHS.FIRMWARE_LIST) as MirrorDirMeta;
    const fileName = Enumerable.from(firmwareJson).where(entry => entry.type == "file").last().name;

    return fileName.substring(9, fileName.length - 11);
  }

  public async getLatestApplicationVersion() {
    // Do not use this.get because we do not want exponential backoff strategy since GitHub api is limited to 10 requests per minute for unauthenticated requests
    const response = await this.fetch(OTHER_URLS.RELEASE_INFO, {
      agent: this.httpsAgent
    });

    if (response.status != 200) {
      return app.getVersion();
    }

    const responseJson = await response.json() as any;
    const tagName = responseJson.tag_name as string;

    return tagName.replace("v", "");
  }

  public async downloadKeys() {
    return this.get(OTHER_URLS.KEYS, "TXT") as Promise<string>;
  }

  public async downloadEshopData() {
    return this.get(OTHER_URLS.ESHOP_DATA, "TXT") as Promise<string>;
  }

  public async getRyujinxCompatibility(query: string) {
    // Do not use this.get because we do not want exponential backoff strategy since GitHub api is limited to 10 requests per minute for unauthenticated requests
    return this.fetch(OTHER_URLS.COMPAT_LIST.replace("{query}", query), {
      agent: this.httpsAgent
    }).then(r => r.json()) as Promise<GithubIssue>;
  }

  public async getModVersions(titleId: string) {
    return this.get(HTTP_PATHS.MODS_VERSION_LIST.replace("{title_id}", titleId)) as Promise<MirrorDirMeta>;
  }

  public async getModsForVersion(titleId: string, version: string) {
    return this.get(HTTP_PATHS.MODS_LIST.replace("{title_id}", titleId).replace("{version}", version));
  }

  public async getModName(titleId: string, version: string, name: string): Promise<{ modName: string, url: string }> {
    const path = HTTP_PATHS.MOD_DOWNLOAD
                           .replace("{title_id}", titleId)
                           .replace("{version}", encodeURIComponent(version))
                           .replace("{name}", encodeURIComponent(name));

    const mod = (await this.get(path)) as MirrorDirMeta;

    if (!mod[0]) {
      return;
    }

    const url = new URL(`${path}${encodeURIComponent(mod[0].name)}`, CDN_URL);

    return {
      modName: mod[0].name,
      url: url.href
    };
  }

  public async downloadSave(fileName: string) {
    return this.get(HTTP_PATHS.SAVES_DOWNLOAD.replace("{file_name}", fileName), "BUFFER") as Promise<ArrayBuffer>;
  }

  public async searchGameBanana(query: string) {
    return this.get(OTHER_URLS.GAME_BANANA_SEARCH.replace("{query}", query));
  }

  public async getGameBananaPage(id: number) {
    return this.get(OTHER_URLS.GAME_BANANA_PAGE.replace("{id}", id.toString()), "TXT") as Promise<string>;
  }
}

export default new HttpService();
