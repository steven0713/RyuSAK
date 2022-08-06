const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");

module.exports = {
  "forge": "./forge.config.js",
  "packagerConfig": {
    "icon": "./icon.ico",
    "executableName": "RyuSAK"
  },
  "publishers": [
    {
      "name": "@electron-forge/publisher-github",
      "config": {
        "repository": {
          "owner": "Ecks1337",
          "name": "RyuSAK"
        }
      }
    }
  ],
  "makers": [
    {
      "name": "@electron-forge/maker-squirrel",
      "config": {
        "setupIcon": "./icon.ico"
      }
    },
    {
      "name": "@electron-forge/maker-zip",
      "platforms": [
        "win32"
      ]
    },
    {
      "name": "@electron-forge/maker-deb"
    },
    {
      "name": "@electron-forge/maker-rpm"
    },
    {
      "name": "@electron-forge/maker-flatpak"
    }
  ],
  "plugins": [
    [
      "@electron-forge/plugin-webpack",
      {
        "mainConfig": "./webpack.main.config.js",
        "renderer": {
          "config": "./webpack.renderer.config.js",
          "entryPoints": [
            {
              "html": "./src/index.html",
              "js": "./src/renderer.ts",
              "name": "main_window"
            }
          ]
        }
      }
    ]
  ],
  "hooks": {
    "postMake": async (_, makeResults) => {
      const version = makeResults[0].packageJSON.version;
      const portablePath = makeResults.map(b => b.artifacts).flat().find(i => i.includes(".zip") && i.includes("win32"));
      const exePath = makeResults.map(b => b.artifacts).flat().find(i => i.includes("Setup.exe"));

      if (portablePath) {
        const filename = path.basename(portablePath);
        await fs.move(portablePath, portablePath.replace(filename, `RyuSAK-win32-x64-${version}-portable.zip`));
      }

      if (exePath) {
        const filename = path.basename(exePath);
        await fs.move(exePath, exePath.replace(filename, `RyuSAK-win32-x64-${version}-installer.exe`));
      }

      return makeResults.map(r => ({
        ...r,
        ...{
          artifacts:
            r.artifacts.map(fullPath => {
              const filename = path.basename(fullPath);

              if (fullPath.includes(".zip") && fullPath.includes("win32")) {
                const zipPath = fullPath.replace(filename, `RyuSAK-win32-x64-${version}-portable.zip`);

                const archive = new Zip(zipPath);
                archive.addFile("portable", Buffer.from("portable", "utf8"));

                fs.removeSync(zipPath);
                archive.writeZip(zipPath);

                return zipPath;
              }

              if (fullPath.includes(".exe")) {
                return fullPath.replace(filename, `RyuSAK-win32-x64-${version}-installer.exe`);
              }

              return fullPath;
            })
        }
      }));
    }
  }
};
