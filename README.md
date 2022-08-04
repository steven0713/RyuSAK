# RyuSAK

![showDownloads](https://img.shields.io/github/downloads/Ecks1337/RyuSAK/total?style=for-the-badge)
![showVersion](https://img.shields.io/github/package-json/v/Ecks1337/RyuSAK?style=for-the-badge)
![showLicense](https://img.shields.io/github/license/Ecks1337/RyuSAK?style=for-the-badge)

<p align="center">
  <img width="80%" alt="screenshot" src="https://raw.githubusercontent.com/Ecks1337/RyuSAK/master/screenshot_1.png" />
</p>

## Installation

Just go to the [releases](https://github.com/Ecks1337/RyuSAK/releases) page and download the latest build for your OS.
The Windows build also comes with an auto update feature.

### Windows

Install the software by executing the `.exe` file. Afterwards, you can remove the software like any other program on your computer.

### Linux

##### Debian

Download the `.deb` file, then install it with `sudo dpkg -i ./RyuSAK-X.Y_amd64.deb`.

##### Arch Linux



##### Red Hat Linux

Download the `.rpm` file, then install it with `sudo rpm -i /RyuSAK-X.Y-1.x86_64.rpm`.

##### Universal

Download the `.AppImage` file, then mark it as executable and run it.

### Features

* Add one or multiple Ryujinx folders (where `Ryujinx.exe` is located) to manage different builds (such as mainline, portable, LDN, etc.) 
* List your game library
* Display your local shaders count & RyuSAK shaders count (to download them if you have fewer shaders)
* Update firmware
* Update production keys
* Download saves for a specific game
* Download shaders for a specific game
* Downloads mods for a specific game
* You can share shaders in just one click if you have more shaders than RyuSAK

### Contributing

Requirements:

* NodeJS v14+
* Yarn `npm i -g yarn`

Install & run:

```
yarn install
yarn start
```

### Credits

* CapitaineJSparrow for creating the original [emusak-ui](https://github.com/CapitaineJSparrow/emusak-ui) project
* Ecchibitionist for hosting the firmware, saves, shaders and mods on his CDN
