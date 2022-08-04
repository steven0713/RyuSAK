import { SetState } from "zustand/vanilla";
import { RyusakEmulatorConfig, RyusakEmulatorsKind, LS_KEYS } from "../../types";
import { IEmulatorConfig } from "./emulatorConfig.action";
import { IGameAction } from "./game.action";
import useTranslation from "../i18n/I18nService";
import { i18n } from "../app";
import { invokeIpc } from "../utils";

export interface ITitleBar {
  version: string,
  getVersionAction: () => void;
  closeRyuSAKAction: () => void;
  maximizeRyuSAKAction: () => void;
  minimizeRyuSAKAction: () => void;
  currentEmu: RyusakEmulatorsKind;
  switchEmuAction: (currentEmu: RyusakEmulatorsKind) => void;
  switchLanguageAction: (language: string) => void;
}

const { t } = useTranslation();

const createTitleBarSlice = (set: SetState<ITitleBar & IEmulatorConfig & IGameAction>): ITitleBar => ({
  version: "",
  currentEmu: (localStorage.getItem(LS_KEYS.TAB) || "ryu") as RyusakEmulatorsKind,
  getVersionAction: async () => {
    const version = await invokeIpc("get-app-version");
    return set({ version });
  },
  closeRyuSAKAction: async () => {
    await invokeIpc("title-bar-action", "close");
  },
  minimizeRyuSAKAction: async () => {
    await invokeIpc("title-bar-action", "minimize");
  },
  maximizeRyuSAKAction: async () => {
    await invokeIpc("title-bar-action", "maximize");
  },
  switchEmuAction: (currentEmu) => {
    localStorage.setItem(LS_KEYS.TAB, currentEmu);
    return set({ currentEmu, selectedConfig: null });
  },
  switchLanguageAction: async (locale) => {
    localStorage.setItem(LS_KEYS.LOCALE, locale);
    await i18n.changeLanguage(locale);
    let configs: RyusakEmulatorConfig[] = localStorage.getItem(LS_KEYS.CONFIG) ? JSON.parse(localStorage.getItem(LS_KEYS.CONFIG)) : [];
    configs = configs.map(c => ({
      ...c,
      ...{
        name: c.isDefault ? (c.emulator === "ryu" ? t("ryuDefault") : t("yuzuDefault")) : c.name
      }
    }));
    localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(configs));

    window.location.reload();
  }
});

export default createTitleBarSlice;
