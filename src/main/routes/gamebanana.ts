import HttpService from "../services/HttpService";
import cheerio from "cheerio";
import { GameBananaMod } from "../../types";

export type searchProps = [string];

export const searchGameBana = async (...args: searchProps): Promise<GameBananaMod[]> => {
  const [name] = args;
  const response = await HttpService.searchGameBana(name) as { _idRow: number }[];

  if (response.length === 0) {
    return;
  }

  const modPageContent = await HttpService.getGameBananaPage(response[0]._idRow);

  if (!modPageContent) {
    return [];
  }

  const $ = cheerio.load(modPageContent);
  const modsIdentifiers = $("recordCell[class='Identifiers']");
  const modsPreviews = $("recordCell[class='Preview']");

  const mods = modsIdentifiers.map((i, element) => {
    if (!modsPreviews[i]) return {};
    const modElement: any = $(element).find("a[class='Name']");
    return {
      name: modElement.text().trim(),
      url: modElement.attr("href"),
      cover: $(modsPreviews[i]).find("img").attr("src")
    };
  });

  return Object.values(mods).filter(d => d.name && d.url && d.cover) as GameBananaMod[];
};
