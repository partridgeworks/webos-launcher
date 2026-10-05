'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createController, APP_ID} = require('../scripts/native-app-exit.cjs');
const HOME = 'com.webos.app.home';

function fixture(t, profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-exit-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const files = Object.fromEntries(['profile', 'state', 'layers', 'app'].map(k => [k + 'File', path.join(dir, k + '.json')]));
  const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
  if (profile !== undefined) write(files.profileFile, profile);
  write(files.layersFile, {layers: [{path: '/var/webos-profile/testLayer', selector: {type: 'none'}}]});
  write(files.appFile, {id: APP_ID});
  const mock = {effective: profile && profile.idleApp && profile.idleApp.appId || HOME,
    support: true, policy: 'idleApp', failReloads: 0, ignoreOverride: false};
  const readProfile = () => fs.existsSync(files.profileFile) ? JSON.parse(fs.readFileSync(files.profileFile, 'utf8')) : null;
  function call(method) {
    if (method.endsWith('/getProfiles')) return {returnValue: true, profiles: {
      idleApp: {support: mock.support, appId: mock.effective}
    }};
    if (method.endsWith('/getSystemSettings')) return {returnValue: true, settings: {lastAppHandlerPolicy: mock.policy}};
    assert.equal(method, 'com.webos.service.systemprofile/debug/rescan');
    if (mock.failReloads > 0) { mock.failReloads--; throw new Error('Reload unavailable'); }
    const current = readProfile();
    mock.effective = !mock.ignoreOverride && current && current.idleApp && current.idleApp.appId || HOME;
    return {returnValue: true};
  }
  return {controller: createController({...files, call}), files, mock, readProfile, write};
}

test('enable, repeat enable and disable preserve existing and subsequently added profile keys', t => {
  const f = fixture(t, {other: {enabled: false}, idleApp: {appId: 'another.home', support: true}});
  f.controller.enable();
  const backup = fs.readFileSync(f.files.stateFile, 'utf8');
  assert.equal(f.mock.effective, APP_ID);
  assert.equal(f.readProfile().other.enabled, false);
  f.controller.enable();
  assert.equal(fs.readFileSync(f.files.stateFile, 'utf8'), backup);
  const changed = f.readProfile();
  changed.addedLater = {keep: true};
  changed.idleApp.extra = 42;
  f.write(f.files.profileFile, changed);
  f.controller.disable();
  assert.deepEqual(f.readProfile(), {other: {enabled: false}, addedLater: {keep: true},
    idleApp: {appId: 'another.home', support: true, extra: 42}});
  assert.equal(f.mock.effective, 'another.home');
  assert.equal(fs.existsSync(f.files.stateFile), false);
});

test('pristine install removes its own profile file on disable', t => {
  const f = fixture(t);
  f.controller.enable();
  assert.deepEqual(f.readProfile(), {idleApp: {appId: APP_ID}});
  f.controller.disable();
  assert.equal(f.readProfile(), null);
  assert.equal(f.mock.effective, HOME);
});

for (const profile of [{}, {idleApp: {}}, {other: 123}]) {
  test('restore preexisting empty objects: ' + JSON.stringify(profile), t => {
    const f = fixture(t, profile);
    f.controller.enable();
    f.controller.disable();
    assert.deepEqual(f.readProfile(), profile);
  });
}

for (const reason of ['layers', 'app', 'policy', 'support']) {
  test('unsupported ' + reason + ' refuses without writing', t => {
    const f = fixture(t, {untouched: true});
    if (reason === 'layers') f.write(f.files.layersFile, {layers: []});
    if (reason === 'app') fs.unlinkSync(f.files.appFile);
    if (reason === 'policy') f.mock.policy = 'lastInputApp';
    if (reason === 'support') f.mock.support = false;
    assert.throws(() => f.controller.enable());
    assert.deepEqual(f.readProfile(), {untouched: true});
    assert.equal(fs.existsSync(f.files.stateFile), false);
  });
}

test('malformed existing profile is never overwritten', t => {
  const f = fixture(t);
  fs.writeFileSync(f.files.profileFile, '{invalid');
  assert.throws(() => f.controller.enable());
  assert.equal(fs.readFileSync(f.files.profileFile, 'utf8'), '{invalid');
  assert.equal(fs.existsSync(f.files.stateFile), false);
});

test('an unowned Launcher override is not adopted with a guessed backup', t => {
  const f = fixture(t, {idleApp: {appId: APP_ID}});
  assert.throws(() => f.controller.enable(), /outside this tool/);
  assert.throws(() => f.controller.disable(), /No backup/);
  assert.equal(fs.existsSync(f.files.stateFile), false);
});

test('enable restores the original file and destination if live reload fails', t => {
  const original = {unrelated: 8};
  const f = fixture(t, original);
  f.mock.failReloads = 1;
  assert.throws(() => f.controller.enable(), /Reload unavailable/);
  assert.deepEqual(f.readProfile(), original);
  assert.equal(f.mock.effective, HOME);
  assert.equal(fs.existsSync(f.files.stateFile), false);
});

test('enable verifies effective destination, not just a successful rescan response', t => {
  const f = fixture(t);
  f.mock.ignoreOverride = true;
  assert.throws(() => f.controller.enable(), /did not select Launcher/);
  assert.equal(f.readProfile(), null);
  assert.equal(fs.existsSync(f.files.stateFile), false);
});

test('failed recovery retains backup for retrying disable', t => {
  const f = fixture(t);
  f.mock.failReloads = 2;
  assert.throws(() => f.controller.enable(), /automatic recovery failed/);
  assert.equal(fs.existsSync(f.files.stateFile), true);
  assert.equal(f.readProfile(), null);
  f.controller.disable();
  assert.equal(fs.existsSync(f.files.stateFile), false);
});

test('disable works after Launcher uninstall and can retry a failed profile reload', t => {
  const f = fixture(t);
  f.controller.enable();
  fs.unlinkSync(f.files.appFile);
  f.mock.failReloads = 1;
  assert.throws(() => f.controller.disable(), /Reload unavailable/);
  assert.equal(f.readProfile(), null);
  assert.equal(fs.existsSync(f.files.stateFile), true);
  f.controller.disable();
  assert.equal(f.mock.effective, HOME);
  assert.equal(fs.existsSync(f.files.stateFile), false);
});

test('disable refuses to overwrite a destination changed by another tool', t => {
  const f = fixture(t);
  f.controller.enable();
  f.write(f.files.profileFile, {idleApp: {appId: 'new.home'}, keep: true});
  assert.throws(() => f.controller.disable(), /another setup/);
  assert.deepEqual(f.readProfile(), {idleApp: {appId: 'new.home'}, keep: true});
  assert.equal(fs.existsSync(f.files.stateFile), true);
});

test('status is read-only and distinguishes an unmanaged override', t => {
  const f = fixture(t, {idleApp: {appId: APP_ID}});
  assert.deepEqual(JSON.parse(f.controller.status()), {
    effectiveAppId: APP_ID, overrideAppId: APP_ID, managedByThisTool: false
  });
  assert.equal(fs.existsSync(f.files.stateFile), false);
});
