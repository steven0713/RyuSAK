import HttpService from "../services/HttpService";
import electron from "electron";
import { RyusakMods, RyusakSaves, RyusakShaders } from "../../types";
import { SYS_SETTINGS } from "../../index";

export type loadComponentsProps = [string];

const loadComponentIpcHandler = async (...args: loadComponentsProps) => {
  const [url] = args;
  HttpService.url = url;
  return Promise.all([
    SYS_SETTINGS,
    <Promise<RyusakShaders>> (<unknown> HttpService.downloadRyujinxShaders()),
    <Promise<RyusakSaves>> (<unknown> HttpService.downloadSaves()),
    <Promise<string>> (<unknown> HttpService.getFirmwareVersion()),
    HttpService.getLatestApplicationVersion(),
    electron.app.getVersion(),
    <Promise<RyusakMods>> (<unknown> HttpService.downloadMods()),
    <Promise<number>> (<unknown> HttpService.getThreshold().catch(() => 1E7))
  ]);
};

export default loadComponentIpcHandler;
