# Return to Launcher when an app exits (experimental, root only)

On the tested firmware, pressing Back to exit YouTube normally opens LG Home.
A foreground watcher can launch Launcher afterward, but LG Home visibly flashes
first. webOS's native `idleApp` profile lets the app manager select Launcher
before opening the destination, eliminating that intermediate LG Home launch.

This is an optional system configuration for a rooted TV. It does not require a
new Launcher build. The normal app and its Developer Mode installation continue
to work without it.

## Compatibility and scope

Verified on **LG OLED55C2PUA (C2, 2022), SDK 10.3.1, firmware 33.31.68**, with
Launcher 1.0.0 and the TV's Node 16.20.2:

- A real YouTube Back-button exit returned to Launcher without the LG Home flash.
- With no foreground redirect helper running, a subscription to
  `applicationManager/getForegroundAppInfo` recorded
  `works.partridge.webos-launcher → youtube.leanback.v4 → works.partridge.webos-launcher`
  when exercising `launchDefaultApp` with `{"category":"idleApp"}`.
- The tool's enable, repeat-enable, status and disable commands were tested on
  the TV. Disabling restored `com.webos.app.home`.
- With Home remapping temporarily disabled, Home on an iOS remote still opened
  LG Home. **Home-button mapping is separate**; keep Input Hook if you need it.

Other models, older webOS releases (including the project's original webOS 6
target), physical Home buttons, and persistence across a full reboot are
**not verified**. This uses an undocumented LG interface. Feature checks prevent
writing when the expected profile layer, installed Launcher or `idleApp` policy
is absent, but do not establish compatibility with every firmware exposing them.

The destination is system-wide: it applies whenever webOS chooses its idle app,
including exits from apps not opened through Launcher. Other uses of that idle
app, such as boot behavior, may also be affected. Apps that explicitly launch a
different destination are outside this mechanism. Back navigation within an app
is not remapped.

## Set up

Use an existing **root shell on the TV**, through SSH or your usual root access.
Developer Mode shell access alone is insufficient. Keep Launcher installed while
this option is enabled.

Copy [scripts/native-app-exit.cjs](../scripts/native-app-exit.cjs) to a persistent
location outside the Launcher package. For example, from your computer:

```sh
scp scripts/native-app-exit.cjs root@<tv-ip>:/home/root/native-app-exit.cjs
```

Run these commands **on the TV**:

```sh
node /home/root/native-app-exit.cjs status
node /home/root/native-app-exit.cjs enable
```

No app-manager restart or reboot is needed. Open an app and exit it with Back,
then check navigation and deliberate access to LG Home. The tool writes no
startup hook and runs no background watcher.

If a manual setup already selects Launcher, the tool refuses to invent its
previous destination. Undo that setup using its original rollback before
adopting this tool.

## Disable and uninstall

**Disable before uninstalling Launcher**, otherwise webOS could try to return to
an app that no longer exists:

```sh
node /home/root/native-app-exit.cjs disable
node /home/root/native-app-exit.cjs status
```

The first command restores the saved override value, or removes only the added
`idleApp.appId` key when none existed. Unrelated profile keys, including ones
added later, are preserved. The effective destination is printed after reload.
It is normally `com.webos.app.home`, but an existing customization may differ.

If profile reload fails, the backup remains so `disable` can be retried. If
another tool changed `idleApp.appId`, this tool stops rather than overwriting it.
Do not delete the backup while recovery is pending. The backup is located at:

```text
/home/root/.local/share/webos-launcher/native-app-exit.json
```

That file records the prior key and effective destination; it is not a backup of
all TV settings. A successful disable removes it. The rollback command can run
even after Launcher has been uninstalled.

## Mechanism

LG's `/usr/sbin/profile_test.py` on the tested TV uses a partial profile at
`/var/webos-profile/testLayer/profile.json`, followed by
`luna://com.webos.service.systemprofile/debug/rescan`. The platform layer list at
`/etc/webos-profile/common/layers/platformLayers.json` includes this directory.
The tool merges this one key into that profile:

```json
{"idleApp":{"appId":"works.partridge.webos-launcher"}}
```

SAM receives the resulting `systemprofile/getProfiles` update and chooses this
app as its idle destination. The tool verifies the effective `appId` after the
reload and attempts rollback if enabling fails. It leaves
`general.lastAppHandlerPolicy` at its existing `idleApp` value.

Changing `configd`'s `profile.idleApp` alone did not update SAM's destination on
the tested firmware. This recipe uses the system-profile layer instead. It does
not patch firmware binaries, rename or replace LG Home, or intercept Back keys.

The file is saved in writable storage and listed in LG's profile loader, but
that is not a substitute for a reboot test. Recheck the effective profile after a
full reboot or firmware update before relying on persistence.

## Developer checks

From the repository on your computer:

```sh
node --test test/native-app-exit.test.cjs
```

Tests use temporary files and a fake Luna service. They cover preservation of
existing settings, unsupported configurations, reload failures, rollback retry,
and conflicting edits. They do not establish firmware compatibility.
