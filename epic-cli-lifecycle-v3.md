# epic(extension-api): Add CLI binary lifecycle helpers to `CliTool`

## Problem

Seven or more Podman Desktop extensions manage CLI tool binaries (detect, download, install system-wide, uninstall). Each one reimplements the same patterns independently — resulting in thousands of lines of copy-pasted code with minor variations.

This epic adds **optional** helper methods to the existing `CliTool` object for platform-agnostic operations (detect, install, uninstall), and moves all GitHub-specific logic (release listing, asset download, Octokit) into the **extension-github** extension — which becomes a bundled dependency. All additions are opt-in — **zero breaking changes** for existing extensions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Core (packages/extension-api + packages/main)              │
│                                                             │
│  CliTool                                                    │
│    ├── detect()              ← PATH lookup + version parse  │
│    ├── installSystemWide(sourcePath)                        │
│    │     → chmod + copy to system dir (with admin if needed)│
│    │     → returns destination path                         │
│    └── uninstall(binaryPath)                                │
│          → rm (with admin fallback on EACCES)               │
│                                                             │
│  env                                                        │
│    └── isWindows / isMac / isLinux  (existing, unchanged)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  extension-github (bundled, pre-installed)                   │
│                                                             │
│  Published API (@podman-desktop/extension-github-api)        │
│    ├── getCliInstaller(config)                              │
│    │     → CliInstaller.listVersions()  ← list releases    │
│    │     → CliInstaller.installToStorage(release, destPath) │
│    │         ← download + chmod → returns binary path       │
│    └── resolveAssetName(version, os, arch) provided by ext  │
│                                                             │
│  Internals                                                  │
│    ├── Octokit management + token handling                  │
│    └── GitHub authentication session                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Consumer extensions (compose, kind, kubectl-cli, etc.)     │
│                                                             │
│  package.json: extensionDependencies: ["podman-desktop.github"] │
│  Imports @podman-desktop/extension-github-api for types     │
│  Gets API via extensions.getExtension<GitHubExtensionApi>() │
│  Calls github extension API for releases & downloads        │
│  Calls core CliTool for detect/install/uninstall            │
└─────────────────────────────────────────────────────────────┘

Full install flow:

  ┌──────────────┐    listVersions()     ┌──────────────────┐
  │  Extension   │ ───────────────────── │ extension-github │
  │  (compose)   │                       │  (CliInstaller)  │
  │              │ installToStorage()    │                  │
  │              │ ───────────────────── │  Octokit + auth  │
  │              │  ← binary in storage  │                  │
  └──────┬───────┘                       └──────────────────┘
         │
         │  installSystemWide(storagePath)
         ▼
  ┌──────────────┐
  │  Core CliTool│ → chmod + admin copy → /usr/local/bin/
  └──────────────┘   ← returns system path
```

### Design principles

1. **No GitHub in core** — Podman Desktop core must not depend on `@octokit/rest` or any GitHub-specific library. All GitHub logic lives in extension-github.
2. **extension-github is bundled** — it ships pre-installed so CLI extensions can depend on it without user action.
3. **Consumer-oriented API** — the extension API exposes what consumers need (`detect`, `installSystemWide`, `uninstall`), not implementation details (`systemPath`, raw arch mappings).
4. **No platform helpers** — avoid duplication with `env`. Extensions receive raw `os`/`arch` in `resolveAssetName` and do their own 1-2 line mapping. No `PlatformInfo`, no `cli.platform`.
5. **Nothing GitHub-related in `extension-api.d.ts`** — methods like `getCliInstaller`, `listReleases`, `downloadAsset` are NOT declared in the core extension API. They are provided by extension-github's exported API object, typed via `@podman-desktop/extension-github-api`. Core extension API only gains `detect()`, `installSystemWide()`, and `uninstall()` on `CliTool`.
6. **Extensible later** — when GitLab or another provider is needed, we introduce a download provider registry. Until then, GitHub-specific code in extension-github is sufficient.

---

## Scope

### Extensions that will benefit


| Extension          | CLI tool         | Download source                         | Uses GitHub ext? |
| ------------------ | ---------------- | --------------------------------------- | ---------------- |
| compose            | `docker-compose` | GitHub Assets (`docker/compose`)        | Yes              |
| kubectl-cli        | `kubectl`        | CDN (`dl.k8s.io`) + GH for version list | Yes (versions)   |
| kind               | `kind`           | GitHub Assets (`kubernetes-sigs/kind`)  | Yes              |
| extension-kind     | `kind`           | GitHub Assets                           | Yes              |
| extension-minikube | `minikube`       | GitHub Assets (`kubernetes/minikube`)   | Yes              |
| extension-grype    | `grype`, `syft`  | GitHub Assets (`anchore/*`) — archived  | Yes              |
| minc-extension     | `minc`           | GitHub Assets                           | Yes              |
| crc-extension      | `crc`            | Pre-installed, PATH only                | No (detect only) |


---

## Core extension API changes

All changes to `packages/extension-api/src/extension-api.d.ts` and implemented in `packages/main`.

---

### 1. `CliTool.detect()` method

#### What is duplicated

Each extension searches for its binary using `which`/`where.exe`, checks extension storage, optionally checks macOS-specific directories (`/opt/homebrew/bin`, etc.), then runs the binary with version flags and parses the output. The structure is the same but each tool has:

- **Different version flags**: `--version`, `version --client -o json`, `--version --format=json`
- **Different output formats**: plain text, JSON with nested keys
- **Same PATH lookup logic**: duplicated `which`/`where.exe` + fallback dirs

See: [compose/detect.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/detect.ts), [kubectl/detect.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/detect.ts), [kind/util.ts L48-122](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/util.ts#L48-L122)

External: [minikube/util.ts L135-167](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L135-L167), [grype/anchore-cli-service.ts L212-249](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L212-L249)

#### Solution

```typescript
detect(options?: { additionalDirs?: string[] }): Promise<CliToolDetectResult | undefined>;
```

A new method on `CliTool`. The common PATH lookup logic moves into the API. Tool-specific parts are configured via two new optional fields on `CliToolOptions`:

- `**versionArgs**` (`string[]`, default `['--version']`) — arguments to get version output.
- `**parseVersion**` (`(stdout: string) => string`, default heuristic) — parses raw stdout into a clean version string.

**Search order:** 1) System PATH via `which`/`where.exe`, 2) Extension storage `<storagePath>/bin/<name>[.exe]`, 3) macOS extra dirs (`/usr/local/bin`, `/opt/homebrew/bin`, `/opt/podman/bin`), 4) `options.additionalDirs`.

**installationSource logic:** Found at known system install locations or extension storage → `'extension'`. Found elsewhere (e.g. `/opt/homebrew/bin`) → `'external'`.

**Side-effect-free:** Does NOT update the CliTool's state. The caller decides whether to call `updateVersion()`.

Returns `CliToolDetectResult`:


| Field                | Type                        | Description                                 |
| -------------------- | --------------------------- | ------------------------------------------- |
| `path`               | `string`                    | Absolute path to the found binary           |
| `version`            | `string`                    | Parsed version string (without leading `v`) |
| `installationSource` | `CliToolInstallationSource` | `'extension'` or `'external'`               |


---

### 2. `CliTool.installSystemWide()` method

#### What is duplicated

All extensions do: chmod source binary → copy to system dir with admin privileges. Three identical copies in built-in extensions:

See: [compose/cli-run.ts L41-103](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/cli-run.ts#L41-L103), [kubectl/cli-run.ts L52-103](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/cli-run.ts#L52-L103), [kind/util.ts L125-158](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/util.ts#L125-L158)

External: [minikube/util.ts L93-133](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L93-L133), [grype/anchore-cli-service.ts L91-120](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L91-L120)

#### Solution

```typescript
installSystemWide(sourcePath: string): Promise<string>;
```

A new method on `CliTool`. The destination path is an implementation detail — the method decides it internally based on the tool's `name` and the current OS:

- **macOS/Linux**: `/usr/local/bin/<name>` — creates dir if needed, copies with admin prompt
- **Windows**: `%LOCALAPPDATA%\Microsoft\WindowsApps\<name>.exe` — `fs.copyFile`, no admin needed

Always ensures source is executable first (`chmod +x` on Unix). Returns the destination path.

---

### 3. `CliTool.uninstall()` method

#### What is duplicated

`deleteFile` + `deleteFileAsAdmin` + `deleteExecutableAsAdmin` — character-for-character identical in three built-in extensions:

See: [compose/extension.ts L480-521](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/extension.ts#L480-L521), [kubectl/extension.ts L499-540](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/extension.ts#L499-L540), [kind/extension.ts L680-721](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/extension.ts#L680-L721)

External: [minikube/util.ts L169-199](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L169-L199), [grype/anchore-cli-service.ts L280-300](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L280-L300)

#### Solution

```typescript
uninstall(binaryPath: string): Promise<void>;
```

A new method on `CliTool`. Tries `fs.promises.unlink()`, on EACCES/EPERM retries with admin (`rm` on Unix, `del` on Windows). No-ops on ENOENT.

---

## Extension-github changes

The existing [podman-desktop/extension-github](https://github.com/podman-desktop/extension-github) repository gains:

### New: published API package

A new `packages/api` directory (published as `@podman-desktop/extension-github-api`) providing TypeScript types and the API contract. Consumer extensions import this for type-safety.

### API surface

```typescript
// @podman-desktop/extension-github-api

export interface GitHubRelease {
  label: string;   // Human-readable name (QuickPickItem-compatible)
  tag: string;     // e.g. 'v2.29.1'
  id: number;      // GitHub release ID
}

export interface ListReleasesOptions {
  count?: number;              // default 5
  includePrerelease?: boolean; // default false
}

export interface CliInstallerConfig {
  owner: string;
  repo: string;
  resolveAssetName: (version: string, os: string, arch: string) => string;
}

export interface CliInstaller {
  listVersions(options?: ListReleasesOptions): Promise<GitHubRelease[]>;
  installToStorage(release: GitHubRelease, destPath: string): Promise<string>;
}

export interface GitHubExtensionApi {
  getCliInstaller(config: CliInstallerConfig): CliInstaller;
}
```

### Key details

- **Single entry point: `getCliInstaller()`** — given a repo config + asset name resolver, returns an object with `listVersions()` and `installToStorage()`. Extensions use whichever methods they need (kubectl uses only `listVersions()`, compose uses both).
- **Token management** — extension-github uses the `github-authentication` session internally. Consumer extensions don't need to know about Octokit or tokens.
- **No platform helpers** — extensions receive raw `os` (`'darwin'`, `'linux'`, `'win32'`) and `arch` (`'x64'`, `'arm64'`) in `resolveAssetName` and do their own 1-2 line mapping inline. Each tool's naming convention is slightly different anyway.

---

## What extensions still own (NOT moved to API)

- **Asset name format** — each tool names its release assets differently; extensions provide this via `resolveAssetName` to the github installer
- **Version picker UI** — extensions call `listVersions()` then `window.showQuickPick()` themselves; no bundled UI
- **Tool-specific detection quirks** — compose checks Docker socket; kind auto-installs on cluster create
- **kubectl CDN download** — only tool using direct URL download; uses `listReleases()` for versions but keeps its own fetch logic
- **Archive extraction** — grype is the only extension needing `.tar.gz`/`.zip` extraction; keeps its own logic
- `**createCliTool` + `registerInstaller`/`registerUpdate` wiring** — existing API unchanged; the new methods simplify what goes inside the callbacks

---

## Usage examples

### Example 1: compose — full lifecycle

```typescript
import type { GitHubExtensionApi } from '@podman-desktop/extension-github-api';

const githubExtension = extensionApi.extensions.getExtension<GitHubExtensionApi>('podman-desktop.github');
if (!githubExtension) throw new Error('GitHub extension not found');
const github = githubExtension.exports;

const tool = extensionApi.cli.createCliTool({
  name: 'docker-compose',
  displayName: 'Compose',
  markdownDescription: '...',
  images: { icon: '...' },
  versionArgs: ['--version', '--format=json'],
  parseVersion: stdout => JSON.parse(stdout).version,
});

// Detect existing installation
const detected = await tool.detect();
if (detected) {
  tool.updateVersion({
    version: detected.version,
    path: detected.path,
    installationSource: detected.installationSource,
  });
}

// Create a GitHub CLI installer for compose
const installer = github.getCliInstaller({
  owner: 'docker',
  repo: 'compose',
  resolveAssetName: (version, os, arch) => {
    const mappedOs = os === 'win32' ? 'windows' : os;
    const mappedArch = arch === 'x64' ? 'x86_64' : arch === 'arm64' ? 'aarch64' : arch;
    const suffix = os === 'win32' ? '.exe' : '';
    return `docker-compose-${mappedOs}-${mappedArch}${suffix}`;
  },
});

let selectedRelease: GitHubRelease;

tool.registerInstaller({
  selectVersion: async () => {
    const releases = await installer.listVersions();
    const selected = await extensionApi.window.showQuickPick(releases, {
      placeHolder: 'Select Compose version',
    });
    if (!selected) throw new Error('No version selected');
    selectedRelease = selected;
    return selected.tag.slice(1);
  },
  doInstall: async _logger => {
    const suffix = extensionApi.env.isWindows ? '.exe' : '';
    const destPath = path.join(ctx.storagePath, 'bin', `docker-compose${suffix}`);
    const binaryPath = await installer.installToStorage(selectedRelease, destPath);
    const systemPath = await tool.installSystemWide(binaryPath);
    tool.updateVersion({
      version: selectedRelease.tag.slice(1),
      path: systemPath,
      installationSource: 'extension',
    });
  },
  doUninstall: async _logger => {
    const suffix = extensionApi.env.isWindows ? '.exe' : '';
    const storageBinary = path.join(ctx.storagePath, 'bin', `docker-compose${suffix}`);
    await tool.uninstall(storageBinary);
    // installSystemWide destination is determined internally; detect to find it
    const detected = await tool.detect();
    if (detected) await tool.uninstall(detected.path);
  },
});
```

### Example 2: kubectl — GitHub for versions, own download logic

```typescript
import type { GitHubExtensionApi } from '@podman-desktop/extension-github-api';

const githubExtension = extensionApi.extensions.getExtension<GitHubExtensionApi>('podman-desktop.github');
if (!githubExtension) throw new Error('GitHub extension not found');
const github = githubExtension.exports;

const tool = extensionApi.cli.createCliTool({
  name: 'kubectl',
  displayName: 'kubectl',
  markdownDescription: '...',
  images: { icon: '...' },
  versionArgs: ['version', '--client', '-o', 'json'],
  parseVersion: stdout => JSON.parse(stdout).clientVersion.gitVersion.replace('v', ''),
});

// Use GitHub extension just for listing versions (kubectl downloads from CDN, not GH assets)
const installer = github.getCliInstaller({
  owner: 'kubernetes',
  repo: 'kubernetes',
  resolveAssetName: () => '', // not used — kubectl downloads from CDN
});
const releases = await installer.listVersions({ count: 10 });

// kubectl keeps its own CDN download (only tool with this pattern)
async function downloadKubectl(version: string, destPath: string): Promise<void> {
  const os = process.platform === 'win32' ? 'windows' : process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;
  const suffix = extensionApi.env.isWindows ? '.exe' : '';
  const url = `https://dl.k8s.io/release/${version}/bin/${os}/${arch}/kubectl${suffix}`;
  const resp = await fetch(url);
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(destPath, Buffer.from(await resp.arrayBuffer()));
  if (!extensionApi.env.isWindows) await fs.promises.chmod(destPath, 0o755);
}
```

### Example 3: grype — archive extraction (kept in extension)

```typescript
import type { GitHubExtensionApi } from '@podman-desktop/extension-github-api';

const githubExtension = extensionApi.extensions.getExtension<GitHubExtensionApi>('podman-desktop.github');
if (!githubExtension) throw new Error('GitHub extension not found');
const github = githubExtension.exports;

const installer = github.getCliInstaller({
  owner: 'anchore',
  repo: 'grype',
  resolveAssetName: (version, os, arch) => {
    const mappedOs = os === 'win32' ? 'windows' : os;
    const mappedArch = arch === 'x64' ? 'amd64' : arch;
    const ext = os === 'win32' ? 'zip' : 'tar.gz';
    return `grype_${version}_${mappedOs}_${mappedArch}.${ext}`;
  },
});

// download returns the raw archive; grype extracts it with its own logic
const archivePath = await installer.installToStorage(selectedRelease, path.join(ctx.storagePath, 'tmp', 'grype-archive'));
const binaryPath = await extractArchive(archivePath, ctx.storagePath); // grype's own logic
await tool.installSystemWide(binaryPath);
```

### Example 4: crc — detect only (no GitHub dependency)

```typescript
// crc doesn't need extension-github at all — detect only
const tool = extensionApi.cli.createCliTool({
  name: 'crc',
  displayName: 'CRC',
  markdownDescription: '...',
  images: { icon: '...' },
  versionArgs: ['version'],
  parseVersion: stdout => stdout.match(/CRC version:\s+(\S+)/)?.[1] ?? '',
});

const detected = await tool.detect();
// No installer registration — crc is assumed pre-installed
```

---

## Files deleted/simplified per extension after migration

### compose


| File                         | Action                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `os.ts`                      | **Delete entirely** (→ inline in `resolveAssetName`)          |
| `utils.ts`                   | **Delete entirely** (→ download handled by github ext)        |
| `compose-github-releases.ts` | **Delete entirely** (→ `github.getCliInstaller()`)            |
| `download.ts`                | **Delete entirely** (→ `installer.installToStorage()`)        |
| `cli-run.ts`                 | **Delete entirely** (→ `installSystemWide()`)                 |
| `detect.ts`                  | **Simplify** — keep Docker-socket-specific logic only         |
| `extension.ts`               | **Simplify** — remove `deleteFile`*, `octokitFactory`         |
| `package.json`               | **Remove** `@octokit/rest`; **add** dep on `github` extension |


### kubectl-cli


| File                         | Action                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `os.ts`                      | **Delete entirely**                                           |
| `utils.ts`                   | **Delete entirely**                                           |
| `kubectl-github-releases.ts` | **Delete entirely** (→ `github.listReleases()`)               |
| `download.ts`                | **Delete entirely**                                           |
| `cli-run.ts`                 | **Delete entirely** (→ `installSystemWide()`)                 |
| `detect.ts`                  | **Delete entirely** (→ `detect()`)                            |
| `extension.ts`               | **Simplify** — keep CDN download function only                |
| `package.json`               | **Remove** `@octokit/rest`; **add** dep on `github` extension |


### kind


| File                | Action                                                        |
| ------------------- | ------------------------------------------------------------- |
| `kind-installer.ts` | **Simplify** — remove download/release/asset logic            |
| `util.ts`           | **Simplify** — remove install/detect helpers                  |
| `extension.ts`      | **Simplify** — remove `deleteFile`*, `octokitFactory`         |
| `package.json`      | **Remove** `@octokit/rest`; **add** dep on `github` extension |


### extension-minikube


| File               | Action                                                        |
| ------------------ | ------------------------------------------------------------- |
| `src/download.ts`  | **Delete entirely** (→ `github.getCliInstaller()`)            |
| `src/util.ts`      | **Simplify** — remove install/detect/delete helpers           |
| `src/extension.ts` | **Simplify** — remove Octokit instantiation                   |
| `package.json`     | **Remove** `@octokit/rest`; **add** dep on `github` extension |


### extension-grype


| File                     | Action                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `anchore-cli-service.ts` | **Major simplification** — remove release/download/install helpers; keep extract, cancel, UI |
| `octokit-disposable.ts`  | **Delete entirely**                                                                          |
| `package.json`           | **Remove** `@octokit/rest`; **keep** `adm-zip`, `tar`; **add** dep on `github` extension     |


### minc-extension


| File                              | Action                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| `src/helper/github-helper.ts`     | **Delete entirely** (208 lines)                               |
| `src/manager/cli-tool-manager.ts` | **Simplify** — remove Octokit wiring                          |
| `package.json`                    | **Remove** `@octokit/rest`; **add** dep on `github` extension |


### crc-extension


| File             | Action                                                            |
| ---------------- | ----------------------------------------------------------------- |
| `src/crc-cli.ts` | **Simplify** — replace manual `which`/`where.exe` with `detect()` |


---

## Rollout plan

### Phase 0 — Prerequisites (can be parallelized)


| Task                                    | Description                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bundle extension-github**             | Make extension-github a pre-installed (bundled) extension in Podman Desktop                                                                |
| **Add API package to extension-github** | Create `packages/api` in the extension-github repo, publish as `@podman-desktop/extension-github-api` with types and interface definitions |
| **Extension dependency support**        | Ensure `extensionDependencies` mechanism works reliably for bundled extensions (may already work — verify)                                 |


### Phase 1 — Core CliTool methods

Each item is one or two PRs: implement in `packages/main`, declare in `packages/extension-api`.

1. `**CliTool.detect()` method** — implement PATH lookup, version parsing; add `versionArgs` and `parseVersion` to `CliToolOptions`
2. `**CliTool.installSystemWide()` method** — implement platform-specific copy with admin prompt
3. `**CliTool.uninstall()` method** — implement delete with admin fallback

### Phase 2 — Extension-github API implementation

Implement the API surface in extension-github:

1. `**listReleases()**` — Octokit wrapper with auth session
2. `**downloadAsset()**` — asset download + chmod
3. `**platform` property** — OS/arch mapping helpers
4. `**getCliInstaller()**` — high-level helper combining the above

### Phase 3 — Built-in extension adoption

Migrate compose, kubectl-cli, and kind to use both core `CliTool` methods and extension-github API. This is where the bulk of code deletion happens.

1. **compose** — full migration (biggest win: ~6 files deleted)
2. **kubectl-cli** — partial (uses `listReleases()` for versions, keeps CDN download)
3. **kind** — full migration

### Phase 4 — External extension adoption

One issue per external repo, filed once the APIs ship:

- **podman-desktop/extension-kind** — same as built-in kind
- **podman-desktop/extension-minikube** — full migration
- **podman-desktop/extension-grype** — partial (keeps archive extraction)
- **minc-org/minc-extension** — full migration (deletes 208-line github-helper.ts)
- **crc-org/crc-extension** — detect-only (no github dependency needed)

### Phase 5 — Related upstream issues

- Unblocks **helm CLI tool extension** ([podman-desktop#13561](https://github.com/podman-desktop/podman-desktop/issues/13561)) — becomes ~30 lines of config
- Helps fix **CLI provider state sync bug** ([podman-desktop#17000](https://github.com/podman-desktop/podman-desktop/issues/17000)) — consistent state handling

---

## Future evolution (out of scope)

When a second provider (GitLab, etc.) is needed:

1. Introduce a `DownloadProvider` registry in core extension API
2. extension-github registers itself as a provider
3. A future extension-gitlab registers as another provider
4. Consumer extensions request downloads generically by provider ID

This is explicitly **not** part of this epic. We avoid premature abstraction — GitHub-specific code in extension-github is correct until proven otherwise.
