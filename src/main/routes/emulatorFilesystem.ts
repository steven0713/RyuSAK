import path from "path";
import fs from "fs-extra";
import { RyusakEmulatorGames } from "../../types";

export const scanGamesForConfig = async (dataPath: string): Promise<RyusakEmulatorGames> => {
  try {
    const directories = await fs.readdir(path.join(dataPath, "games"), { withFileTypes: true });
    return directories.filter(d => d.isDirectory()).map(d => d.name.toLowerCase());
  } catch(e) {
    return [];
  }
};

export type deleteGameProps = [string, string];

export const deleteGame = async (...args: deleteGameProps) => {
  const [titleId, dataPath] = args;

  await fs.remove(path.resolve(dataPath, "games", titleId.toLowerCase()));
};
