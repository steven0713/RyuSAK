import { GetState, SetState } from "zustand/vanilla";
import { MirrorDirMeta, RyusakShaders, LS_KEYS, Settings } from "../../types";
import { IDownloadManager } from "./downloadManager.action";
import useTranslation from "../i18n/I18nService";
import { invokeIpc } from "../utils";

const { t } = useTranslation();

interface IBootstrap {
  isAppInitialized: boolean;
  saves: MirrorDirMeta;
  ryujinxShaders: RyusakShaders;
  bootstrapAppAction: () => Promise<void>;
  firmwareVersion: string;
  latestVersion?: string;
  currentVersion?: string;
  threshold?: number;
  settings: Settings;
}

const lastEshopUpdate = localStorage.getItem(LS_KEYS.ESHOP_UPDATE) ? +localStorage.getItem(LS_KEYS.ESHOP_UPDATE) : null;

const createBootstrapSlice = (set: SetState<IBootstrap>, get: GetState<IDownloadManager>): IBootstrap => ({
  isAppInitialized: false,
  saves: [],
  ryujinxShaders: {},
  firmwareVersion: "",
  latestVersion: null,
  currentVersion: null,
  settings: {},
  bootstrapAppAction: async () => {
    const [
      settings,
      ryujinxShaders,
      saves,
      firmwareVersion,
      latestVersion,
      currentVersion,
      threshold
    ] = await invokeIpc("load-components");

    const dayInMilliseconds = 1000 * 60 * 60 * 24;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const lastEshopUpdatePlus1Day = new Date(lastEshopUpdate + dayInMilliseconds).setHours(0, 0, 0, 0);

    if (!lastEshopUpdate || (tomorrow.getTime() > lastEshopUpdatePlus1Day)) {
      get().upsertFileAction({
        filename: t("updatingEshop"),
        progress: Infinity,
        downloadSpeed: Infinity
      });

      invokeIpc("update-eshop-data").then((res) => {

        if (res === true) {
          localStorage.setItem(LS_KEYS.ESHOP_UPDATE, `${new Date().getTime()}`);
        }

        get().removeFileAction(t("updatingEshop"));
      });
    }

    return set({
      settings,
      isAppInitialized: true,
      saves: saves,
      ryujinxShaders,
      firmwareVersion,
      latestVersion,
      currentVersion,
      threshold
    });
  }
});

export default createBootstrapSlice;
