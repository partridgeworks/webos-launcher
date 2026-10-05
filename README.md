# webOS Launcher

A minimalist home screen for LG webOS TVs: a greeting and clock, a row of your apps, a
row of your inputs, and a way back to LG's own home. Built for **webOS 6 (Chrome 79)**,
where sideloaded web apps are more restricted than on newer firmware.

- **Apps**: your choice of apps, in your order
- **Sources**: Live TV and the HDMI inputs, with the names set in the TV's input settings
- **More**: LG's own home screen, and Settings
- Black background with a soft grey gradient, lots of space, remote-first navigation
- Follows the TV's 12/24-hour clock setting
- No root, no background service, no startup scripts: a plain app in its own sandbox

> **Status: no maintainer.** This project is published as-is. Issues and pull requests
> may not get a response. Fork it freely.

## Using it

| Where | Key | Does |
|---|---|---|
| Home | ↑ ↓ | Move between rows |
| Home | ← → | Move along a row |
| Home | OK | Open the app or input |
| Settings | OK | Add or remove an app/source |
| Settings | Hold OK (or **Re-order** button) | Enter/leave re-order mode |
| Re-order mode | OK, arrows, OK | Pick up a tile, move it, put it down |
| Re-order mode | Back | Cancel the move / leave re-order mode |
| Settings | Back | Return home |

The Magic Remote pointer is hidden when the launcher opens; shake the remote to bring it
back. Clicking works everywhere.

The launcher doesn't take over the HOME button. On a rooted TV you can map a button to it
with [LG Input Hook](https://github.com/Simon34545/lginputhook) (app ID
`works.partridge.webos-launcher`).

On a compatible rooted TV, [native app-exit setup](docs/native-app-exit.md) can
return to Launcher when an app exits without briefly displaying LG Home. This
experimental, optional configuration was tested on a C2 running SDK 10.3.1;
Home-button mapping remains separate. Read the compatibility and rollback notes
before enabling it.

## Install

**From the Homebrew Channel** (rooted TVs): search for *Launcher*.

**From a release**: download the `.ipk` from
[Releases](../../releases) and install it with the Homebrew Channel, the
[webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation)
(`ares-install`), or [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop).
It also works in LG's Developer Mode, without root.

## Build

Needs Node 18+.

```sh
npm install
npm run build      # type-check, then build dist/ (chrome79, classic script)
npm run package    # dist/ → build/works.partridge.webos-launcher_<version>_all.ipk
```

To install on a rooted TV over SSH, copy `tv.env.example` to `tv.env` (git-ignored) and
set `TV_HOST` to an ssh alias or `root@<tv-ip>`, then:

```sh
npm run install:tv   # copy the ipk over SSH, install it, launch it
npm run deploy       # build + package + install:tv
```

`npm run dev` serves the UI in a desktop browser with sample inputs and the whole
catalogue, for layout work without a TV.

## Which apps appear

webOS 6 doesn't let a sideloaded web app list the installed apps or read their icons.
So the launcher ships a catalogue ([src/config/catalog.ts](src/config/catalog.ts)) with
icon copies in [public/icons/apps/](public/icons/apps/), and shows only the entries the TV
reports as installed (`applicationManager/getAppLoadStatus`, which is allowed). Apps
without a bundled icon get a plain monogram tile.

To add your own apps or change the default row **without editing tracked files**, copy
[src/config/catalog.local.example.ts](src/config/catalog.local.example.ts) to
`src/config/catalog.local.ts` (git-ignored) and rebuild.

### Option: live app list via the Homebrew Channel (off by default)

*Settings → Options → Live app list via Homebrew Channel.*

On a rooted TV with the [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel),
turning this on reads the full list of installed apps and their real icons, instead of
the catalogue. It works by asking the Homebrew Channel's service to run
`luna-send ... listLaunchPoints` and to base64-encode each icon file. **Those commands run
as root.** The launcher only sends fixed commands; icon paths are validated and
shell-quoted before use, and app IDs never reach the shell. If the Homebrew Channel isn't
there, the launcher says so and uses the catalogue. Icons are cached in the app's local
storage.

## Compatibility and testing

Tested on **one TV only**: an LG OLED C1 (2021) running **webOS 6.5**, rooted, with the
Homebrew Channel 0.7.3. Everything else is untested:

- Newer webOS (22 and later) should run it, since the build targets an older engine, but
  the Luna calls it relies on haven't been confirmed there.
- Older webOS (5 and earlier) is unknown; the External Input Manager call
  (`com.webos.service.eim/getAllInputStatus`) may differ.
- Only the UK app IDs in the catalogue were checked on a real TV. The others come from
  public sources and are simply skipped if wrong.

Reports of what works on other models are welcome as issues, though see *no maintainer*
above.

### Notes for developers

- **Chrome 79.** `<script type="module">` won't load from `file://` on webOS 6 (no MIME
  type), and `?.`/`??` are syntax errors. [vite.config.ts](vite.config.ts) builds one IIFE
  for `chrome79` and rewrites the script tag; CI fails the build if ES2020 syntax slips
  in. The CSS avoids flex `gap`, `inset` and `aspect-ratio`.
- **Luna calls used** (all in the "public" LS2 group a web app gets):
  `applicationManager/launch`, `applicationManager/getAppLoadStatus`,
  `eim/getAllInputStatus`, `systemservice/getPreferences` (`timeFormat`). Denied to web
  apps on webOS 6: `listLaunchPoints`, `listApps`, `getAppInfo`, `getForegroundAppInfo`.
- **Pointer.** The pointer is drawn by the system, so CSS `cursor: none` does nothing;
  the app calls `webOSSystem.setCursorHidden(true)` when it comes to the foreground.
- **Remote debugging.** A dev-mode or rooted TV exposes the web inspector on port 9998.

## Project layout

```
src/
  config/      constants (IDs, key codes, Luna URIs) and the app catalogue
  theme/       design tokens (colours, type, layout, motion) and the stylesheet
  lib/         Luna bridge, launching, inputs, app providers, storage, clock, pointer
  hooks/       remote keys, OK press/hold, clock tick, time format
  components/  Header, Clock, Row, Grid, Tile, OptionList, Glyph, Toast
  screens/     Home, Settings
  app.tsx      state, data loading and wiring
scripts/       package.sh, install.sh, gen-manifest.mjs
public/        appinfo.json, app icon, bundled icons, licence texts
.github/       build on push; release (ipk + Homebrew manifest) on tag
```

## Releasing

Bump `version` in `public/appinfo.json` (and `package.json`), commit, then push a
matching tag:

```sh
git tag v1.0.1 && git push origin v1.0.1
```

The release workflow builds the ipk, generates the Homebrew Channel manifest
(`works.partridge.webos-launcher.manifest.json`, with the ipk's SHA-256) and attaches both
to a GitHub release. The Homebrew repository reads the manifest from the latest release.

## Licence and credits

Code: [MIT](LICENSE). Bundled Preact (MIT) and the Inter typeface (SIL OFL 1.1): see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

**Third-party icons.** The app and input icons in `public/icons/` belong to their owners
and are not covered by the MIT licence. They're included in good faith, only to show
recognisable tiles for apps already on the user's TV. Rights holders can ask for removal
by opening an issue; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This project is
not affiliated with LG Electronics or any app publisher.

Written with AI assistance (Claude Code), directed, tested and reviewed by a human on a
real TV.
