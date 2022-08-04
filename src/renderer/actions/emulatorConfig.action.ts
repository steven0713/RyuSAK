import { GetState, SetState } from "zustand/vanilla";
import { IAlert } from "./alert.action";
import { RyusakEmulatorConfig, RyusakEmulatorGame, RyusakEmulatorMode, LS_KEYS } from "../../types";
import Swal from "sweetalert2";
import { i18n } from "../app";
import { ITitleBar } from "./titleBar.actions";
import { invokeIpc } from "../utils";

export interface IEmulatorConfig {
  addNewEmulatorConfigAction: () => void;
  emulatorBinariesPath: RyusakEmulatorConfig[];
  selectedConfig: RyusakEmulatorConfig;
  setSelectConfigAction: (selectedConfig: RyusakEmulatorConfig) => void,
  removeEmulatorConfigAction: (path: string) => void,
  getModeForBinary: (binaryPath: string) => Promise<RyusakEmulatorMode>;
  createDefaultConfig: () => void;
  emulatorGames: RyusakEmulatorGame[];
}

const configuredEmulators: IEmulatorConfig["emulatorBinariesPath"] = JSON.parse(localStorage.getItem(LS_KEYS.CONFIG)) || [];

const emulatorConfig = (set: SetState<IEmulatorConfig>, get: GetState<Partial<IAlert & IEmulatorConfig & ITitleBar>>): IEmulatorConfig => ({
  emulatorBinariesPath: configuredEmulators,
  emulatorGames: [] as RyusakEmulatorGame[],
  selectedConfig: null as RyusakEmulatorConfig,
  setSelectConfigAction: (selectedConfig: RyusakEmulatorConfig = null) => {
    if (!selectedConfig) {
      return;
    }

    localStorage.setItem(`${get().currentEmu}-selected`, selectedConfig.path);
    return set({ selectedConfig });
  },
  addNewEmulatorConfigAction: async () => {
    await Swal.fire({
      icon: "info",
      text: get().currentEmu === "ryu" ? i18n.t("pickRyuBin") : i18n.t("pickYuzuBin")
    });

    const response = await invokeIpc("add-emulator-folder", get().currentEmu);

    if (typeof response === "object") {
      get().openAlertAction("error", response.code);
      return null;
    }

    const emulatorBinariesPath = get().emulatorBinariesPath || [];

    if (emulatorBinariesPath.find(item => item.path === response)) {
      get().openAlertAction("error", "EMULATOR_PATH_ALREADY_EXISTS");
      return null;
    }

    let promptUserForConfiguration = true;
    while (promptUserForConfiguration) {
      const { isConfirmed, value } = await Swal.fire({
        text: i18n.t("addConfigTitle"),
        input: "text",
        inputAttributes: {
          placeholder: i18n.t("addConfigEg")
        },
        showCancelButton: true,
      });

      if (!isConfirmed) {
        promptUserForConfiguration = false;
      }

      if (value && value.length > 0) {
        const config: RyusakEmulatorConfig = {
          path: response,
          name: value,
          emulator: get().currentEmu
        };
        emulatorBinariesPath.push(config);
        localStorage.setItem(`${get().currentEmu}-selected`, config.path);
        localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(emulatorBinariesPath));
        return set({ emulatorBinariesPath, selectedConfig: config });
      }
    }
  },
  removeEmulatorConfigAction: (path) => {
    const configs = get().emulatorBinariesPath;
    const index = configs.findIndex(item => item.path === path);
    configs.splice(index, 1);
    localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(configs));
    return set({ emulatorBinariesPath: configs, selectedConfig: configs.filter(c => c.emulator === get().currentEmu)[0] });
  },
  getModeForBinary: async (path): Promise<RyusakEmulatorMode> => {
    return invokeIpc("system-scan-for-config", get().currentEmu, path);
  },
  createDefaultConfig: async () => {
    let config = await invokeIpc("build-default-emu-config", get().currentEmu);
    config = { ...config, ...{ isDefault: true, name: config.emulator === "yuzu" ? i18n.t("yuzuDefault"): i18n.t("ryuDefault") }  };
    const configs = get().emulatorBinariesPath;

    if (configs.find(c => c.isDefault && c.emulator === get().currentEmu)) {
      return;
    }

    configs.push(config);
    localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(configs));
    return set({ emulatorBinariesPath: configs, selectedConfig: config });
  },
});

export default emulatorConfig;
