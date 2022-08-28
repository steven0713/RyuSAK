import fs from "fs-extra";
import path from "path";
import { Mutex } from "async-mutex";
import { app } from "electron";
import { EShopTitles, EShopTitleMeta } from "../../types";
import HttpService from "../services/HttpService";
import custom_meta_json from "../../assets/custom_meta.json";
const customMetas = custom_meta_json as EShopTitles;

class EShopMetaService {
  private eShopDataPath: string;
  private eShopTitles: EShopTitles;
  private mutex = new Mutex();

  constructor() {
    const cacheDir = fs.existsSync(path.resolve(app.getPath("exe"), "..", "portable"))
      ? path.resolve(app.getPath("exe"), "..", "electron_cache")
      : path.join(app.getPath("userData"));

    this.eShopDataPath = path.join(cacheDir, "titles.US.en.json");
  }

  private async getEShopTitles(): Promise<EShopTitles> {
    if (this.eShopTitles) {
      return this.eShopTitles;
    }

    const release = await this.mutex.acquire();
    try {
      if (!this.eShopTitles) {
        if (await fs.pathExists(this.eShopDataPath)) {
          this.eShopTitles = await fs.readJson(this.eShopDataPath);
        } else {
          await this.updateEShopData();
        }
      }

      return this.eShopTitles;
    }
    finally {
      release();
    }
  }

  async getEShopMeta(titleId: string): Promise<EShopTitleMeta> {
    const eShopTitles = await this.getEShopTitles();
    titleId = titleId.toUpperCase();

    let titleMeta = customMetas[titleId] || eShopTitles[titleId] || { id: titleId, name: titleId, iconUrl: "" };
    titleMeta.name ??= titleId;
    titleMeta.iconUrl ??= "";

    return titleMeta;
  }

  async updateEShopData(): Promise<boolean> {
    try {
      const eshopDataJson: string = await HttpService.downloadEshopData();

      await fs.writeFile(this.eShopDataPath, eshopDataJson, "utf-8");
      this.eShopTitles = JSON.parse(eshopDataJson);

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };
}

export default new EShopMetaService();
