import fs from "fs-extra";
import HttpService from "../services/HttpService";
import { proxyFile, SYS_SETTINGS } from "../../index";

export const setProxy = async (proxy: string) => {
  try {
    if (proxy) {
      await fs.writeFile(proxyFile, proxy);
    } else {
      await fs.unlink(proxyFile);
    }

    HttpService.updateHttpAgents(proxy);
    SYS_SETTINGS.proxy = proxy;

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
