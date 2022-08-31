import HttpService from "../services/HttpService";
import electron from "electron";
import { SYS_SETTINGS } from "../../index";

const loadComponentIpcHandler = async () => Promise.all([
  SYS_SETTINGS,
  HttpService.downloadRyujinxShaderList(),
  HttpService.downloadSaveList(),
  HttpService.downloadModsTitleList(),
  HttpService.getFirmwareVersion(),
  HttpService.getLatestApplicationVersion(),
  electron.app.getVersion(),
  HttpService.getThreshold(),
  HttpService.getShadersMinVersion()
]);

export default loadComponentIpcHandler;
