import HttpService from "../services/HttpService";
import electron from "electron";
import { MirrorDirMeta, RyusakShaders } from "../../types";
import { SYS_SETTINGS } from "../../index";

const loadComponentIpcHandler = async () => Promise.all([
  SYS_SETTINGS,
  <Promise<RyusakShaders>>HttpService.downloadRyujinxShaderList(),
  <Promise<MirrorDirMeta>>HttpService.downloadSaveList(),
  <Promise<MirrorDirMeta>>HttpService.downloadModsTitleList(),
  <Promise<string>>HttpService.getFirmwareVersion(),
  HttpService.getLatestApplicationVersion(),
  electron.app.getVersion(),
  <Promise<number>>HttpService.getThreshold()
]);
export default loadComponentIpcHandler;
