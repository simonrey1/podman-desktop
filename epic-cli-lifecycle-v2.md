# epic(extension-api): Add CLI binary lifecycle helpers to `CliTool`

## Problem

Seven or more Podman Desktop extensions manage CLI tool binaries (detect, download, install system-wide, uninstall). Each one reimplements the same patterns independently — resulting in thousands of lines of copy-pasted code with minor variations.

This epic adds **optional** helper methods to the existing `CliTool` object and a platform constant to the `cli` namespace, so extensions can delegate common operations instead of reimplementing them. All additions are opt-in — **zero breaking changes** for existing extensions.

All changes are to `packages/extension-api/src/extension-api.d.ts`.

---

## Scope

### Extensions that will benefit (full CLI lifecycle: detect, download, install, update, uninstall)

| Extension          | Repo                                | CLI tool         | Download source                                                                     |
| ------------------ | ----------------------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| compose            | built-in (`extensions/compose`)     | `docker-compose` | GitHub Assets (`docker/compose`)                                                    |
| kubectl-cli        | built-in (`extensions/kubectl-cli`) | `kubectl`        | Direct URL (`dl.k8s.io`) — but lists versions from GitHub (`kubernetes/kubernetes`) |
| kind               | built-in (`extensions/kind`)        | `kind`           | GitHub Assets (`kubernetes-sigs/kind`)                                              |
| extension-kind     | `podman-desktop/extension-kind`     | `kind`           | GitHub Assets                                                                       |
| extension-minikube | `podman-desktop/extension-minikube` | `minikube`       | GitHub Assets (`kubernetes/minikube`)                                               |
| extension-grype    | `podman-desktop/extension-grype`    | `grype`, `syft`  | GitHub Assets (`anchore/*`) — **archived** (`.tar.gz`/`.zip`)                       |
| minc-extension     | `minc-org/minc-extension`           | `minc`           | GitHub Assets                                                                       |

### Extensions that benefit partially (detect only, no download)

| Extension     | Repo                    | CLI tool | Notes                                   |
| ------------- | ----------------------- | -------- | --------------------------------------- |
| crc-extension | `crc-org/crc-extension` | `crc`    | Assumes pre-installed, PATH search only |

### Extensions NOT affected (confirmed by code review)

**Built-in (podman-desktop repository)**: docker, lima, kube-context, registries, podman-docker-context — no CLI tool management.

**External**: ai-lab (`containers/`), bootc (`containers/`), Headlamp (`podman-desktop/extension-headlamp`), layers-explorer, quadlet, kreate, kubernetes-dashboard, kubernetes-contexts, postgresql, apple-container (downloads a binary at build time only, not runtime CLI management), macadam (`crc-org/`), redhat-account-ext (runs `podman machine ssh` commands, not managing a CLI binary), redhat-lightspeed-ext, redhat-sandbox-ext, redhat-pack-ext, openshift-image-checker-ext (Go CLI tool itself, not a PD extension managing CLI binaries), hummingbird-ext — these either don't manage CLI binaries, use JS libraries, or wrap services via APIs.

---

## Duplication & proposed solutions

Each subsection shows what is duplicated today, where it lives, and the new API that replaces it.

---

### 1. OS/architecture mapping → `cli.platform` constant + `CliPlatformInfo` type

#### What is duplicated

Every extension manually maps `os.platform()` and `os.arch()` to the naming convention used in GitHub release asset filenames. Two conventions exist:

**Go-style** (`x64` → `amd64`, `arm64` stays `arm64`) — used by kubectl, kind, minikube, grype, minc:

```typescript
if (arch === 'x64') arch = 'amd64';
if (operatingSystem === 'win32') {
  operatingSystem = 'windows';
  extension = '.exe';
}
```

See: [kubectl-cli/kubectl-github-releases.ts L76-82](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/kubectl-github-releases.ts#L76-L82), [kind/kind-installer.ts L135-144](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L135-L144)

**GNU-style** (`x64` → `x86_64`, `arm64` → `aarch64`) — used by compose:

```typescript
if (arch === 'x64') arch = 'x86_64';
if (arch === 'arm64') arch = 'aarch64';
```

See: [compose/compose-github-releases.ts L79-88](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/compose-github-releases.ts#L79-L88)

**`OS` helper class** — character-for-character identical in two extensions: [compose/os.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/os.ts), [kubectl/os.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/os.ts)

External: [minikube/download.ts L175-201](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L175-L201) (`getReleaseAssetId` OS mapping), [grype/anchore-cli-service.ts L412-453](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L412-L453) (`getAssetName`), [minc/github-helper.ts L134-155](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L134-L155) (`getReleaseAssetId`)

#### Solution

A new constant `cli.platform` of type `CliPlatformInfo`, pre-computed once at startup, providing both conventions:

```typescript
export const platform: CliPlatformInfo;
```

| Field              | Type      | Description                                                 | Example on macOS arm64 |
| ------------------ | --------- | ----------------------------------------------------------- | ---------------------- |
| `os`               | `string`  | Raw Node.js `os.platform()`                                 | `'darwin'`             |
| `arch`             | `string`  | Raw Node.js `os.arch()`                                     | `'arm64'`              |
| `osForAsset`       | `string`  | Mapped for GitHub assets (`win32` → `windows`)              | `'darwin'`             |
| `archGoStyle`      | `string`  | Go convention (`x64` → `amd64`)                             | `'arm64'`              |
| `archGnuStyle`     | `string`  | GNU convention (`x64` → `x86_64`, `arm64` → `aarch64`)      | `'aarch64'`            |
| `executableSuffix` | `string`  | `'.exe'` on Windows, `''` otherwise                         | `''`                   |
| `isWindows`        | `boolean` | Convenience shortcut (same as `extensionApi.env.isWindows`) | `false`                |
| `isMac`            | `boolean` | Convenience shortcut (same as `extensionApi.env.isMac`)     | `true`                 |
| `isLinux`          | `boolean` | Convenience shortcut (same as `extensionApi.env.isLinux`)   | `false`                |

All fields are `readonly`. Extensions use it in their `resolveAssetName` callback or anywhere they need platform info.

---

### 2. System binary path → `CliTool.systemPath` property

#### What is duplicated

`getSystemBinaryPath()` returns `/usr/local/bin/<name>` on macOS/Linux or `%LOCALAPPDATA%\Microsoft\WindowsApps\<name>.exe` on Windows. Three identical copies in built-in extensions:

See: [compose/cli-run.ts L28-38](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/cli-run.ts#L28-L38), [kubectl/cli-run.ts L32-49](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/cli-run.ts#L32-L49), [kind/util.ts L29-45](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/util.ts#L29-L45)

External: [minikube/util.ts L79-85](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L79-L85), [grype/anchore-cli-service.ts L74-89](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L74-L89). minc does not have a system-wide install path.

#### Solution

```typescript
readonly systemPath: string;
```

A new read-only property on `CliTool`, computed from the tool's `name`. Extensions use it as the target for `installSystemWide()`, to determine `installationSource` in `detect()`, and to clean up in `uninstall()`.

---

### 3. Binary detection → `CliTool.detect()` method

#### What is duplicated

Each extension searches for its binary using `which`/`where.exe`, checks extension storage, optionally checks macOS-specific directories (`/opt/homebrew/bin`, etc.), then runs the binary with version flags and parses the output. The structure is the same but each tool has:

- **Different version flags**: `--version`, `version --client -o json`, `--version --format=json`
- **Different output formats**: plain text, JSON with nested keys
- **Same PATH lookup logic**: duplicated `which`/`where.exe` + fallback dirs

See: [compose/detect.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/detect.ts), [kubectl/detect.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/detect.ts), [kind/util.ts L48-122](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/util.ts#L48-L122)

External: [minikube/util.ts L135-167](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L135-L167) (`getMinikubeVersion` + `whereBinary`), [grype/anchore-cli-service.ts L212-249](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L212-L249) (`where` + `getInstalledInfo`)

#### Solution

```typescript
detect(options?: { additionalDirs?: string[] }): Promise<CliToolDetectResult | undefined>;
```

A new method on `CliTool`. The common PATH lookup logic moves into the API. Tool-specific parts are configured via two new optional fields on `CliToolOptions`:

- **`versionArgs`** (`string[]`, default `['--version']`) — arguments to get version output. Examples: compose uses `['--version', '--format=json']`, kubectl uses `['version', '--client', '-o', 'json']`.
- **`parseVersion`** (`(stdout: string) => string`, default heuristic) — parses raw stdout into a clean version string. Examples: compose uses `(s) => JSON.parse(s).version`, kubectl uses `(s) => JSON.parse(s).clientVersion.gitVersion.replace('v', '')`.

**Search order:** 1) System PATH via `which`/`where.exe`, 2) Extension storage `<storagePath>/bin/<name>[.exe]`, 3) macOS extra dirs (`/usr/local/bin`, `/opt/homebrew/bin`, `/opt/podman/bin`), 4) `options.additionalDirs`.

**installationSource logic:** Found at `systemPath` or extension storage → `'extension'`. Found elsewhere (e.g. `/opt/homebrew/bin`) → `'external'`.

**Side-effect-free:** Does NOT update the CliTool's state. The caller decides whether to call `updateVersion()`. This is intentional — some extensions need extra checks first (e.g. compose checks Docker socket).

Returns `CliToolDetectResult`:

| Field                | Type                        | Description                                 |
| -------------------- | --------------------------- | ------------------------------------------- |
| `path`               | `string`                    | Absolute path to the found binary           |
| `version`            | `string`                    | Parsed version string (without leading `v`) |
| `installationSource` | `CliToolInstallationSource` | `'extension'` or `'external'`               |

---

### 4. GitHub release listing → `CliTool.listGitHubReleases()` method

#### What is duplicated

Every extension creates an Octokit instance the same way and lists releases with the same filter:

```typescript
const octokitFactory = async (): Promise<Octokit> => {
  const auth = await extensionApi.authentication.getSession('github-authentication', []);
  return new Octokit({ auth: auth?.accessToken });
};
// Then: octokit.repos.listReleases({ owner, repo }), filter !prerelease, slice(0, 5)
```

See: [compose/extension.ts L73-77](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/extension.ts#L73-L77), [compose/compose-github-releases.ts L48-69](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/compose-github-releases.ts#L48-L69), [kubectl/kubectl-github-releases.ts L49-68](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/kubectl-github-releases.ts#L49-L68), [kind/kind-installer.ts L88-107](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L88-L107)

External: [minikube/download.ts L46-64](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L46-L64) (`grabLatestsReleasesMetadata`), [grype/anchore-cli-service.ts L316-336](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L316-L336) (`listReleases`), [minc/github-helper.ts L89-113](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L89-L113) (`grabLatestsReleasesMetadata`)

This means every extension declares `@octokit/rest` as a dependency.

#### Solution

```typescript
listGitHubReleases(options?: { count?: number; includePrerelease?: boolean }): Promise<GitHubRelease[]>;
```

A new method on `CliTool`. Requires a new optional `github` field on `CliToolOptions` of type `CliToolGitHubConfig`:

- **`owner`** (`string`, required) — GitHub repository owner. Example: `'docker'`.
- **`repo`** (`string`, required) — GitHub repository name. Example: `'compose'`.

Uses the built-in `github-authentication` session for Octokit internally — **extensions no longer need `@octokit/rest` as a dependency**.

Returns up to 5 releases (configurable), sorted newest-first, excluding pre-releases by default.

Returns `GitHubRelease[]` (extends `QuickPickItem`, so directly compatible with `window.showQuickPick()`):

| Field   | Type     | Description                                                  |
| ------- | -------- | ------------------------------------------------------------ |
| `label` | `string` | Human-readable release name (inherited from `QuickPickItem`) |
| `tag`   | `string` | Release tag, e.g. `'v2.29.1'`                                |
| `id`    | `number` | GitHub numeric release ID (needed by `downloadFromGitHub()`) |

---

### 5. Binary download → `CliTool.downloadFromGitHub()` method

#### What is duplicated

**GitHub Assets API** (compose, kind, minikube, grype, minc): find asset by name → download via `octokit.repos.getReleaseAsset()` with `accept: 'application/octet-stream'` → write to disk → chmod.

See: [compose/compose-github-releases.ts L75-128](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/compose-github-releases.ts#L75-L128), [kind/kind-installer.ts L128-199](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L128-L199)

External: [minikube/download.ts L145-163](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L145-L163) (`download`) + [L203-215](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L203-L215) (`downloadReleaseAsset`), [grype/anchore-cli-service.ts L361-387](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L361-L387) (`download`), [minc/github-helper.ts L166-189](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L166-L189) (`download` + `downloadReleaseAsset`)

**`makeExecutable` / `chmod 0o755`** — duplicated in every extension: [compose/utils.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/utils.ts), [kubectl/utils.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/utils.ts), [kind/kind-installer.ts L188-191](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L188-L191), [minc/github-helper.ts L181-184](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L181-L184), [grype/anchore-cli-service.ts L404-407](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L404-L407)

**Archive extraction** (grype/syft only): `.zip` via AdmZip, `.tar.gz` via tar: [grype/anchore-cli-service.ts L389-410](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L389-L410)

#### Solution

```typescript
downloadFromGitHub(release: GitHubRelease): Promise<string>;
```

A new method on `CliTool`. Requires `github.resolveAssetName` to be set in `CliToolOptions` — a function that builds the expected asset filename:

- **`resolveAssetName`** (`(version: string, platform: CliPlatformInfo) => string`) — Examples:
  - compose: `(v, p) => \`docker-compose-${p.osForAsset}-${p.archGnuStyle}${p.executableSuffix}\``
  - kind: `(v, p) => \`kind-${p.osForAsset}-${p.archGoStyle}\``
    **Post-download steps:** mkdir, chmod 0o755 on Unix.

**Default destination:** `<extensionContext.storagePath>/bin/<name>[.exe]`

**Side-effect-free:** Does NOT update the CliTool's state. The caller must call `updateVersion()`.

> **Note on kubectl:** kubectl downloads from a CDN (`dl.k8s.io`), not GitHub release assets. Since it's the only tool with this pattern, it keeps its own ~15-line `fetch()` + `writeFile` + `chmod` download logic rather than adding a separate API method for a single consumer. kubectl still benefits from all other new methods.

> **Note on grype/syft:** These tools ship archived binaries (`.tar.gz`/`.zip`). Since grype is the only extension needing archive extraction, it keeps its own extraction logic after calling `downloadFromGitHub()` (which downloads the raw archive). The extension API should only contain code common to multiple extensions.

---

### 6. System-wide installation → `CliTool.installSystemWide()` method

#### What is duplicated

All extensions do: chmod source binary → copy to system dir with admin privileges. Three slightly divergent copies:

- **compose**: returns `string | undefined`, Windows uses `fs.copyFile` (no admin), warns if not in PATH
- **kubectl**: returns `void`, Windows uses `copy` command with admin (unnecessarily elevated)
- **kind**: returns `string`, simpler, no `/usr/local/bin` mkdir check

See: [compose/cli-run.ts L41-103](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/cli-run.ts#L41-L103), [kubectl/cli-run.ts L52-103](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/cli-run.ts#L52-L103), [kind/util.ts L125-158](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/util.ts#L125-L158)

External: [minikube/util.ts L93-133](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L93-L133) (`installBinaryToSystem`), [grype/anchore-cli-service.ts L91-120](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L91-L120) (`installSystemWide`)

#### Solution

```typescript
installSystemWide(sourcePath: string): Promise<string>;
```

A new method on `CliTool`. Unified behavior:

- **macOS/Linux**: `/usr/local/bin/<name>` — creates dir if needed, copies with admin prompt
- **Windows**: `%LOCALAPPDATA%\Microsoft\WindowsApps\<name>.exe` — `fs.copyFile`, no admin needed (user-writable)

Always ensures source is executable first (`chmod +x` on Unix). Always returns the destination path. Always creates dirs if needed.

---

### 7. Uninstall helpers → `CliTool.uninstall()` method

#### What is duplicated

`deleteFile` + `deleteFileAsAdmin` + `deleteExecutableAsAdmin` — three functions that are **character-for-character identical** in three built-in extensions:

See: [compose/extension.ts L480-521](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/extension.ts#L480-L521), [kubectl/extension.ts L499-540](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/extension.ts#L499-L540), [kind/extension.ts L680-721](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/extension.ts#L680-L721)

External: [minikube/util.ts L169-199](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L169-L199) (`deleteFile` + `deleteFileAsAdmin`), [grype/anchore-cli-service.ts L280-300](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L280-L300) (`doUninstall` with admin delete)

#### Solution

```typescript
uninstall(binaryPath: string): Promise<void>;
```

A new method on `CliTool`. Tries `fs.promises.unlink()`, on EACCES/EPERM retries with admin (`rm` on Unix, `del` on Windows). No-ops on ENOENT.

Typical usage — called twice during a full uninstall:

```typescript
await tool.uninstall(storageBinaryPath); // extension-managed copy in storage
await tool.uninstall(tool.systemPath); // system-wide copy in /usr/local/bin
```

---

## What extensions still own (NOT moved to the API)

- **Asset name format** — each tool names its release assets differently; extensions provide this via `github.resolveAssetName`
- **Version picker UI** — extensions call `listGitHubReleases()` then `window.showQuickPick()` themselves; the API does not bundle UI
- **Tool-specific detection quirks** — compose checks Docker socket and looks for `podman-compose`; kind auto-installs on cluster create
- **kubectl CDN download** — only one tool uses direct URL download, so it keeps its own ~15-line fetch logic
- **`createCliTool` + `registerInstaller`/`registerUpdate` wiring** — existing API unchanged; the new methods simplify what goes inside the callbacks

---

## Usage examples

### Example 1: compose — full lifecycle

```typescript
const tool = extensionApi.cli.createCliTool({
  name: 'docker-compose',
  displayName: 'Compose',
  markdownDescription: '...',
  images: { icon: '...' },
  github: {
    owner: 'docker',
    repo: 'compose',
    resolveAssetName: (version, p) => `docker-compose-${p.osForAsset}-${p.archGnuStyle}${p.executableSuffix}`,
  },
  versionArgs: ['--version', '--format=json'],
  parseVersion: stdout => JSON.parse(stdout).version,
});

const detected = await tool.detect();
if (detected) {
  tool.updateVersion({
    version: detected.version,
    path: detected.path,
    installationSource: detected.installationSource,
  });
}

tool.registerInstaller({
  selectVersion: async () => {
    const releases = await tool.listGitHubReleases();
    const selected = await extensionApi.window.showQuickPick(releases, {
      placeHolder: 'Select Compose version',
    });
    if (!selected) throw new Error('No version selected');
    selectedRelease = selected;
    return selected.tag.slice(1);
  },
  doInstall: async logger => {
    const binaryPath = await tool.downloadFromGitHub(selectedRelease);
    const systemPath = await tool.installSystemWide(binaryPath);
    tool.updateVersion({
      version: selectedRelease.tag.slice(1),
      path: systemPath,
      installationSource: 'extension',
    });
  },
  doUninstall: async logger => {
    const storageBinary = path.join(
      ctx.storagePath,
      'bin',
      `docker-compose${extensionApi.cli.platform.executableSuffix}`,
    );
    await tool.uninstall(storageBinary);
    await tool.uninstall(tool.systemPath);
  },
});
```

### Example 2: kubectl — GitHub for versions, own download logic

```typescript
const tool = extensionApi.cli.createCliTool({
  name: 'kubectl',
  displayName: 'kubectl',
  markdownDescription: '...',
  images: { icon: '...' },
  github: { owner: 'kubernetes', repo: 'kubernetes' },
  versionArgs: ['version', '--client', '-o', 'json'],
  parseVersion: stdout => JSON.parse(stdout).clientVersion.gitVersion.replace('v', ''),
});

// kubectl keeps its own download (~15 lines, only tool using direct URL)
async function downloadKubectl(version: string, destPath: string): Promise<void> {
  const p = extensionApi.cli.platform;
  const url = `https://dl.k8s.io/release/${version}/bin/${p.osForAsset}/${p.archGoStyle}/kubectl${p.executableSuffix}`;
  const resp = await fetch(url);
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(destPath, Buffer.from(await resp.arrayBuffer()));
  if (!p.isWindows) await fs.promises.chmod(destPath, 0o755);
}
```

### Example 3: grype — archive extraction (kept in extension)

```typescript
const tool = extensionApi.cli.createCliTool({
  name: 'grype',
  displayName: 'Grype',
  markdownDescription: '...',
  images: { icon: '...' },
  github: {
    owner: 'anchore',
    repo: 'grype',
    resolveAssetName: (version, p) =>
      `grype_${version}_${p.osForAsset}_${p.archGoStyle}.${p.isWindows ? 'zip' : 'tar.gz'}`,
  },
});

// downloadFromGitHub() returns the raw archive path; grype extracts it itself
const archivePath = await tool.downloadFromGitHub(selectedRelease);
const binaryPath = await extractArchive(archivePath, ctx.storagePath); // grype's own logic
```

---

## Files deleted/simplified per extension after migration

### compose

| File                         | Action                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| `os.ts`                      | **Delete entirely** (→ `cli.platform`)                                  |
| `utils.ts`                   | **Delete entirely** (→ `downloadFromGitHub()` internal chmod)           |
| `compose-github-releases.ts` | **Delete entirely** (→ `listGitHubReleases()` + `downloadFromGitHub()`) |
| `download.ts`                | **Delete entirely** (→ `downloadFromGitHub()`)                          |
| `cli-run.ts`                 | **Delete entirely** (→ `systemPath` + `installSystemWide()`)            |
| `detect.ts`                  | **Simplify** — keep Docker-socket-specific logic only                   |
| `extension.ts`               | **Simplify** — remove `deleteFile*`, `octokitFactory`                   |
| `package.json`               | **Remove** `@octokit/rest`                                              |

### kubectl-cli

| File                         | Action                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `os.ts`                      | **Delete entirely**                                                                              |
| `utils.ts`                   | **Delete entirely**                                                                              |
| `kubectl-github-releases.ts` | **Delete entirely**                                                                              |
| `download.ts`                | **Delete entirely**                                                                              |
| `cli-run.ts`                 | **Delete entirely**                                                                              |
| `detect.ts`                  | **Delete entirely** (→ `detect()`)                                                               |
| `extension.ts`               | **Simplify** — remove `deleteFile*`, `octokitFactory`, `findKubeCtl`; keep CDN download function |
| `package.json`               | **Remove** `@octokit/rest`                                                                       |

### kind

| File                | Action                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `kind-installer.ts` | **Simplify** — remove download/release/asset logic                                                       |
| `util.ts`           | **Simplify** — remove `getSystemBinaryPath`, `installBinaryToSystem`, `whereBinary`, `getKindBinaryInfo` |
| `extension.ts`      | **Simplify** — remove `deleteFile*`, `octokitFactory`                                                    |
| `package.json`      | **Remove** `@octokit/rest`                                                                               |

### extension-minikube (`podman-desktop/extension-minikube`)

| File               | Action                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/download.ts`  | **Delete entirely** (→ `listGitHubReleases()` + `downloadFromGitHub()`)                                                                                     |
| `src/util.ts`      | **Simplify** — remove `getBinarySystemPath`, `installBinaryToSystem`, `whereBinary`, `getMinikubeVersion`, `deleteFile*`; keep tool-specific config helpers |
| `src/extension.ts` | **Simplify** — remove Octokit instantiation, `findMinikube`                                                                                                 |
| `package.json`     | **Remove** `@octokit/rest`                                                                                                                                  |

### extension-grype (`podman-desktop/extension-grype`)

| File                     | Action                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anchore-cli-service.ts` | **Major simplification** — remove `getSystemBinaryPath`, `installSystemWide`, `where`, `getInstalledInfo`, `listReleases`, `download`, `getAssetName`; keep `extract`, `cancelAll`, tool identity abstracts, UI logic |
| `octokit-disposable.ts`  | **Delete entirely**                                                                                                                                                                                                   |
| `package.json`           | **Remove** `@octokit/rest`; **keep** `adm-zip`, `tar` (archive extraction stays in extension)                                                                                                                         |

### minc-extension (`minc-org/minc-extension`)

| File                              | Action                               |
| --------------------------------- | ------------------------------------ |
| `src/helper/github-helper.ts`     | **Delete entirely** (208 lines)      |
| `src/manager/cli-tool-manager.ts` | **Simplify** — remove Octokit wiring |
| `package.json`                    | **Remove** `@octokit/rest`           |

### extension-kind (`podman-desktop/extension-kind`)

Same changes as the built-in kind extension: remove download/release logic, `installBinaryToSystem`, `whereBinary`, delete helpers, `@octokit/rest`.

### crc-extension (`crc-org/crc-extension`)

| File             | Action                                                                          |
| ---------------- | ------------------------------------------------------------------------------- |
| `src/crc-cli.ts` | **Simplify** — replace manual `which`/`where.exe` with `detect()` (detect-only) |

---

## Rollout plan

### Implementation notes

- `listGitHubReleases()` and `downloadFromGitHub()` require `@octokit/rest` in `packages/main`. Extensions can then **remove** it from their own `package.json`.
- Archive extraction (`adm-zip`, `tar`) stays in grype's own code — it's the only extension that needs it. The extension API only contains patterns common to multiple extensions.
- All new methods are implemented in the `CliTool` implementation class in `packages/main` (e.g. `cli-tool-impl.ts`). The extension context's `storagePath` is available internally since the main process tracks which extension created each `CliTool`.

### Phase 0 — Guidelines

Update CODE-GUIDELINES.md with guidance on what belongs in the extension API vs. extension code.

### Phase 1 — API methods + immediate built-in extension adoption

Each item below is one or two PRs: implement the API method in `packages/main`, declare it in `packages/extension-api`, then immediately adopt it in compose, kubectl-cli, and kind in the same or next PR.

1. **`cli.platform` constant** → delete `os.ts` from compose and kubectl, replace inline arch mapping in kind
2. **`CliTool.systemPath` property** → delete `getSystemBinaryPath` from compose, kubectl, kind
3. **`CliTool.detect()` method** → delete `Detect` classes (compose, kubectl), `whereBinary`/`getKindBinaryInfo` (kind)
4. **`CliTool.listGitHubReleases()` method** → delete `*GitHubReleases` classes, `octokitFactory`, remove `@octokit/rest` dependency from all three
5. **`CliTool.downloadFromGitHub()` method** → delete `*Download` classes, `makeExecutable`, download helpers from compose and kind; kubectl keeps its own CDN download but deletes `os.ts` and `makeExecutable`
6. **`CliTool.installSystemWide()` method** → delete `installBinaryToSystem` from all three
7. **`CliTool.uninstall()` method** → delete `deleteFile`/`deleteFileAsAdmin`/`deleteExecutableAsAdmin` from all three

### Phase 2 — External extension adoption

One issue per external repo, filed once the API ships. Extension maintainers decide how to split the migration (single PR or incremental PRs per method). Minimum Podman Desktop engine version bump is required once they start using any new method:

- **podman-desktop/extension-kind** — remove `KindInstaller` download/release logic, `installBinaryToSystem`, `whereBinary`, delete helpers, `@octokit/rest`
- **podman-desktop/extension-minikube** — remove `MinikubeDownload` class, `installBinaryToSystem`, `whereBinary`, delete helpers, `@octokit/rest`
- **podman-desktop/extension-grype** — simplify `AnchoreCliService` abstract class (remove `listReleases`, `download`, `extract`, `where`, `getInstalledInfo`, `installSystemWide`, `getSystemBinaryPath`; keep `cancelAll`, `toolId`, `displayName`)
- **minc-org/minc-extension** — remove `github-helper.ts` (208 lines of duplicated download logic), `@octokit/rest`
- **crc-org/crc-extension** — replace manual `which`/`where.exe` PATH lookup in `crc-cli.ts` with `detect()` (detect-only, no download changes)

### Phase 3 — Related upstream issues

- Unblocks **helm CLI tool extension** ([podman-desktop#13561](https://github.com/podman-desktop/podman-desktop/issues/13561)) — becomes ~30 lines of config instead of ~300 lines of plumbing
- Helps fix **CLI provider state sync bug** ([podman-desktop#17000](https://github.com/podman-desktop/podman-desktop/issues/17000)) — consistent state handling across all CLI extensions when `detect()` provides uniform result shape
