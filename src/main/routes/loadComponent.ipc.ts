import HttpService from "../services/HttpService";
import electron from "electron";
import { MirrorDirMeta, RyusakShaders } from "../../types";
import { SYS_SETTINGS } from "../../index";

const loadComponentIpcHandler = async () => Promise.all([
  SYS_SETTINGS,
  <Promise<RyusakShaders>>(<unknown>HttpService.downloadRyujinxShaderList()),
  <Promise<MirrorDirMeta>>(<unknown>HttpService.downloadSaveList()),
  <Promise<string>>(<unknown>HttpService.getFirmwareVersion()),
  HttpService.getLatestApplicationVersion(),
  electron.app.getVersion(),
  <Promise<number>>(<unknown>HttpService.getThreshold())
]);
export default loadComponentIpcHandler;
