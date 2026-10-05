#!/usr/bin/env node
'use strict';

// Optional tool run in a root shell ON THE TV. Never loaded by the web app.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const APP_ID = 'works.partridge.webos-launcher';
const PROFILE_DIR = '/var/webos-profile/testLayer';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function luna(method, payload) {
  const output = execFileSync('/usr/bin/luna-send', [
    '-w', '10000', '-n', '1', 'luna://' + method, JSON.stringify(payload)
  ], {encoding: 'utf8', timeout: 12000, maxBuffer: 1024 * 1024});
  const reply = JSON.parse(output.trim());
  if (reply.returnValue !== true) throw new Error(reply.errorText || method + ' failed');
  return reply;
}

function createController(options = {}) {
  const profileFile = options.profileFile || PROFILE_DIR + '/profile.json';
  const stateFile = options.stateFile || '/home/root/.local/share/webos-launcher/native-app-exit.json';
  const layersFile = options.layersFile || '/etc/webos-profile/common/layers/platformLayers.json';
  const appFile = options.appFile || '/media/developer/apps/usr/palm/applications/' + APP_ID + '/appinfo.json';
  const call = options.call || luna;

  function read(file) {
    try {
      if (!fs.lstatSync(file).isFile()) throw new Error(file + ' must be a regular file');
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!isObject(value)) throw new Error(file + ' must contain a JSON object');
      return value;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  function write(file, value) {
    if (value === null) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      return;
    }
    fs.mkdirSync(path.dirname(file), {recursive: true});
    const mode = fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o644;
    const temporary = file + '.launcher-' + process.pid;
    try {
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode});
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }

  function localProfile() {
    const profile = read(profileFile);
    if (profile && own(profile, 'idleApp') && !isObject(profile.idleApp)) {
      throw new Error('Existing idleApp override must be a JSON object');
    }
    return profile;
  }

  function effectiveId() {
    const reply = call('com.webos.service.systemprofile/getProfiles', {names: ['idleApp']});
    const idle = reply.profiles && reply.profiles.idleApp;
    if (!idle || idle.support !== true || typeof idle.appId !== 'string' || !idle.appId) {
      throw new Error('This TV does not expose a supported idleApp profile');
    }
    return idle.appId;
  }

  function reload() {
    call('com.webos.service.systemprofile/debug/rescan', {});
    return effectiveId();
  }

  function backup() {
    const state = read(stateFile);
    if (state && (state.version !== 1 || typeof state.fileExisted !== 'boolean' ||
        typeof state.idleExisted !== 'boolean' || typeof state.hadAppId !== 'boolean' ||
        typeof state.effectiveAppId !== 'string' ||
        (state.hadAppId && !own(state, 'appId')))) {
      throw new Error('Invalid backup: ' + stateFile);
    }
    return state;
  }

  function enable() {
    const layers = read(layersFile);
    if (!layers || !Array.isArray(layers.layers) ||
        !layers.layers.some(layer => layer.path === PROFILE_DIR && layer.selector && layer.selector.type === 'none')) {
      throw new Error('This firmware does not declare the tested system-profile override layer');
    }
    const app = read(appFile);
    if (!app || app.id !== APP_ID) throw new Error('Install Launcher before enabling native app exits');
    const settings = call('com.webos.settingsservice/getSystemSettings', {
      category: 'general', keys: ['lastAppHandlerPolicy']
    });
    if (!settings.settings || settings.settings.lastAppHandlerPolicy !== 'idleApp') {
      throw new Error('lastAppHandlerPolicy is not idleApp; no settings were changed');
    }
    const currentId = effectiveId();
    const before = localProfile();
    const state = backup();
    if (state) {
      if (!before || !before.idleApp || before.idleApp.appId !== APP_ID) {
        throw new Error('A backup exists but the override differs; run disable to recover first');
      }
      if (reload() !== APP_ID) throw new Error('Profile reload did not select Launcher');
      return 'Already enabled';
    }
    if (currentId === APP_ID || (before && before.idleApp && before.idleApp.appId === APP_ID)) {
      throw new Error('Launcher is already selected outside this tool; use that setup\'s rollback first');
    }
    const idle = before && before.idleApp;
    const saved = {
      version: 1, fileExisted: before !== null, idleExisted: !!idle,
      hadAppId: !!idle && own(idle, 'appId'), effectiveAppId: currentId
    };
    if (saved.hadAppId) saved.appId = idle.appId;
    fs.mkdirSync(path.dirname(stateFile), {recursive: true});
    fs.writeFileSync(stateFile, JSON.stringify(saved, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    try {
      const next = JSON.parse(JSON.stringify(before || {}));
      next.idleApp = next.idleApp || {};
      next.idleApp.appId = APP_ID;
      write(profileFile, next);
      if (reload() !== APP_ID) throw new Error('Profile reload did not select Launcher');
    } catch (error) {
      try {
        write(profileFile, before);
        if (reload() !== currentId) throw new Error('Original destination was not restored');
        fs.unlinkSync(stateFile);
      } catch (recoveryError) {
        throw new Error(error.message + '; automatic recovery failed: ' + recoveryError.message +
          '. Backup retained at ' + stateFile + '; run disable to retry recovery.');
      }
      throw error;
    }
    return 'Enabled native app exits to Launcher. Disable before uninstalling Launcher.';
  }

  function disable() {
    const state = backup();
    if (!state) throw new Error('No backup from this tool; refusing to guess the previous destination');
    const profile = localProfile();
    const idle = profile && profile.idleApp;
    const hasId = !!idle && own(idle, 'appId');
    const alreadyRestored = state.hadAppId ? hasId && idle.appId === state.appId : !hasId;
    if (!alreadyRestored && (!hasId || idle.appId !== APP_ID)) {
      throw new Error('idleApp.appId was changed by another setup; leaving it and the backup untouched');
    }
    if (!alreadyRestored) {
      if (state.hadAppId) idle.appId = state.appId;
      else delete idle.appId;
      if (!state.idleExisted && Object.keys(idle).length === 0) delete profile.idleApp;
      write(profileFile, !state.fileExisted && Object.keys(profile).length === 0 ? null : profile);
    }
    // Keep the backup on reload failure so disable can be retried even if Launcher was removed.
    const restored = reload();
    if (restored === APP_ID) throw new Error('Launcher remains the effective idle app; backup retained');
    fs.unlinkSync(stateFile);
    return 'Restored native app exits to ' + restored;
  }

  function status() {
    const id = effectiveId();
    const profile = localProfile();
    return JSON.stringify({
      effectiveAppId: id,
      overrideAppId: profile && profile.idleApp ? profile.idleApp.appId : null,
      managedByThisTool: backup() !== null
    }, null, 2);
  }

  return {enable, disable, status};
}

module.exports = {createController, APP_ID};
if (require.main === module) {
  try {
    const action = process.argv[2];
    if (process.argv.length !== 3 || !['status', 'enable', 'disable'].includes(action)) {
      throw new Error('Usage ON THE TV: node native-app-exit.cjs status|enable|disable');
    }
    if (typeof process.getuid !== 'function' || process.getuid() !== 0) {
      throw new Error('Run this tool in a root shell on the TV');
    }
    console.log(createController()[action]());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
