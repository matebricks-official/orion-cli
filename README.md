# Orion CLI Desktop

Orion CLI Desktop is the local companion app for Orion AI Coding Mode. It runs on Windows and creates a secure local bridge between the Orion web app and your machine, allowing Orion AI to inspect your selected workspace and run terminal commands locally when you enable Coding Mode.

## Download

Install the latest Windows release from:

[Orion CLI Releases](https://github.com/matebricks-official/orion-cli/releases)

Recommended installer:

[Download Orion CLI Web Setup](https://github.com/matebricks-official/orion-cli/releases/download/v1.0.0/Orion-CLI-Web-Setup-1.0.0-x64.exe)

## What It Does

- Starts automatically when Windows starts.
- Opens a local WebSocket bridge on port `92323`.
- Lets the Orion web app connect to your local terminal.
- Shows commands requested by Orion AI in the desktop app.
- Lets you enable or disable AI terminal access.
- Keeps execution local to your Windows machine.

## First-Time Setup

1. Download and run the Orion CLI installer.
2. Open Orion AI in your browser.
3. Enter Coding Mode.
4. Select your project folder.
5. Wait for Orion AI to detect the local CLI connection.
6. Continue once the setup screen shows that the CLI is connected.

## Release Files

The web installer requires both of these files to be available in the same GitHub release:

- `Orion-CLI-Web-Setup-1.0.0-x64.exe`
- `orion-cli-desktop-1.0.0-x64.nsis.7z`

If the package file is missing or private, the web installer will show a `404` download error.

## Privacy

Orion CLI Desktop runs locally. Terminal commands execute on your computer through the local bridge only after the desktop app is running and access is enabled.

## Support

If the installer cannot download the application package, make sure the release assets are public and reachable without being logged into GitHub.
