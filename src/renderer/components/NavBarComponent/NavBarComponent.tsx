import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useTranslation from "../../i18n/I18nService";
import discord_logo from "../../resources/discord_logo.png";
import { IconButton, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import useStore from "../../actions/state";
import { LS_KEYS } from "../../../types";
import { LANGUAGES } from "../../app";
import SettingComponent from "../SettingComponent/SettingComponent";

const NavBarComponent = () => {
  const { t } = useTranslation();
  const [switchLanguageAction] = useStore(s => [s.switchLanguageAction]);
  const locale = localStorage.getItem(LS_KEYS.LOCALE) ?? "en";

  const onLocaleSelectChange = (e: SelectChangeEvent) => {
    switchLanguageAction(e.target.value);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar enableColorOnDark color="primary" position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} style={{ flex: "0 0 90px" }}>
            <b>{ t("ryusak") }</b>
          </Typography>
          <div style={{ flex: 1 }}>
          </div>
          <Box style={{ flex: "0 0 80px" }} pr={3}>
            <Select
              value={locale}
              label="Age"
              onChange={onLocaleSelectChange}
              variant="standard"
              fullWidth
            >
              {
                LANGUAGES.map((l: string) => <MenuItem key={l} value={l.toLowerCase()}>{l.toUpperCase()}</MenuItem>)
              }
            </Select>
          </Box>
          <Box style={{ flex: "0 0 50px" }}>
            <a href="https://discord.gg/42Xnp7FRVW" className="no-blank-icon" target="_blank">
              <IconButton
                edge="start"
                color="inherit"
              >
                <img height={40} src={discord_logo} alt=""/>
              </IconButton>
            </a>
          </Box>
          <Box style={{ flex: "0 0 50px" }}>
            <SettingComponent />
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default NavBarComponent;
