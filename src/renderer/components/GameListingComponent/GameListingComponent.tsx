import React, { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import "./gameListing.css";
import { RyujinxConfigMeta, EShopTitleMeta } from "../../../types";
import useStore from "../../actions/state";
import { Box, Button, Divider, Grid, TextField, Tooltip } from "@mui/material";
import jackSober from "../../resources/jack_sober.png";
import defaultIcon from "../../resources/default_icon.jpg";
import useTranslation from "../../i18n/I18nService";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import { invokeIpc } from "../../utils";

interface IConfigContainer {
  config: RyujinxConfigMeta;
}

const nonAlphaNumeric = new RegExp(/[^a-z0-9\s]/g);

const Label = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  border: "1px solid black",
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 8px",
  color: "#FFF",
  zIndex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "block",
  textAlign: "center"
}));

const Cover = styled(Box)(() => ({
  width: "100%",
  aspectRatio: "1 / 1",
  backgroundColor: "#444",
  backgroundSize: "cover",
}));

const GameListingComponent = ({ config }: IConfigContainer) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openAlertAction] = useStore(s => [s.openAlertAction]);
  const [games, setGames] = useState<EShopTitleMeta[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filteredGames, setFilteredGames] = useState<typeof games>([]);

  // 1. Scan games on user system
  // 2. Build metadata from eshop with titleId as argument
  const createLibrary = async () => {
    let titleIds = await invokeIpc("scan-games", config.path);
    titleIds = titleIds.filter(id => id !== "0000000000000000"); // Homebrew app

    const gamesCollection: EShopTitleMeta[] = await Promise.all(titleIds.map(async (i: string) => invokeIpc("build-metadata-from-titleId", i)));
    gamesCollection.forEach(title => title.normalizedName = title.name.toLowerCase().normalize("NFKD").replace(nonAlphaNumeric, ""));

    setGames(gamesCollection);
  };

  useEffect(() => {
    createLibrary().catch(() => setIsLoaded(true));
  }, [config]);

  useEffect(() => {
    const searchTermLowerCase = searchTerm.toLowerCase();
    setFilteredGames(searchTerm.length > 0
      ? games.filter(title => title.normalizedName.includes(searchTermLowerCase))
      : games);
    setIsLoaded(true);
  }, [games, searchTerm]);

  const refreshLibrary = () => {
    openAlertAction("info", t("refreshInfo"));
    return createLibrary();
  };

  const onGameDetailClick = (titleId: string) => {
    navigate("/detail", { state: { titleId, dataPath: config.path } });
  };

  if ((games.length === 0 || filteredGames.length === 0 || !isLoaded) && searchTerm.length === 0) {
    return (
      <div style={{ textAlign: "center", width: "50%", margin: "0 auto" }}>
        <p>
          <img width="100%" src={jackSober} alt="" />
        </p>
        <Divider />
        <h4 dangerouslySetInnerHTML={{ __html: t("launchRyujinx") }} />
        <p style={{ textAlign: "center" }}>
          <Button onClick={refreshLibrary} startIcon={<RefreshIcon />} variant="outlined">{t("refresh")}</Button>
        </p>
      </div>
    );
  }

  return (
    <Stack className="masonry" spacing={2}>
      <Grid container>
        <Grid item xs={10} pr={2}>
          <TextField type="search" variant="standard" label={t("filter").replace("{{LENGTH}}", `${games.length}`)} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={2}>
          <Button onClick={refreshLibrary} startIcon={<RefreshIcon />} variant="outlined" fullWidth>{t("refresh")}</Button>
        </Grid>
      </Grid>
      <Grid container spacing={2} pr={4}>
        {
          filteredGames
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item, index) => (
              <Grid tabIndex={index} className="game" item xs={2} onClick={() => onGameDetailClick(item.id)} style={{ cursor: "pointer" }} key={index}>
                <Tooltip arrow placement="top" title={item.name}>
                  <div>
                    <Label>{item.name}</Label>
                    <Cover style={{ backgroundImage: `url(${item.iconUrl.length > 0 ? item.iconUrl : defaultIcon})` }} />
                  </div>
                </Tooltip>
              </Grid>
            ))
        }
      </Grid>
    </Stack>
  );
};

export default GameListingComponent;
