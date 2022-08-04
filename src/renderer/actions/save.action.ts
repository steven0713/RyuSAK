import { SetState } from "zustand/vanilla";
import { IDownloadManager } from "./downloadManager.action";
import useStore from "./state";
import Swal from "sweetalert2";
import { invokeIpc } from "../utils";

export interface ISaveAction {
  currentSaveDownload?: string,
  setCurrentSaveDownloadAction: (id: string) => void,
  clearCurrentSaveAction: () => void,
  downloadSaveAction: (fileName: string) => void,
}

const createDownloadSaveSlice = (set: SetState<ISaveAction & IDownloadManager>): ISaveAction => ({
  currentSaveDownload: null,
  setCurrentSaveDownloadAction: (currentSaveDownload) => set({ currentSaveDownload }),
  clearCurrentSaveAction: () => set({ currentSaveDownload: null }),
  downloadSaveAction: async (fileName) => {
    const state = useStore.getState();
    state.upsertFileAction({
      filename: state.currentSaveDownload,
      downloadSpeed: Infinity,
      progress: Infinity
    });
    await invokeIpc("downloadSave", fileName);
    state.removeFileAction(state.currentSaveDownload);
    Swal.fire({
      icon: "success",
      text: `${fileName} has been placed on your desktop`
    });
  }
});

export default createDownloadSaveSlice;
