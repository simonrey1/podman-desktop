# epic(extension-api): CLI binary lifecycle helpers

## Problem

7+ extensions reimplement the same CLI tool patterns (detect, download, install, uninstall) — thousands of lines of copy-pasted code.

---

## Scope

### Extensions that will benefit (full lifecycle)

| Extension          | Repo                                | CLI tool         | Download source                                              |
| ------------------ | ----------------------------------- | ---------------- | ------------------------------------------------------------ |
| compose            | built-in (`extensions/compose`)     | `docker-compose` | GitHub Assets (`docker/compose`)                             |
| kubectl-cli        | built-in (`extensions/kubectl-cli`) | `kubectl`        | CDN (`dl.k8s.io`) — lists versions from GH (`kubernetes/kubernetes`) |
| kind               | built-in (`extensions/kind`)        | `kind`           | GitHub Assets (`kubernetes-sigs/kind`)                       |
| extension-kind     | `podman-desktop/extension-kind`     | `kind`           | GitHub Assets                                                |
| extension-minikube | `podman-desktop/extension-minikube` | `minikube`       | GitHub Assets (`kubernetes/minikube`)                        |
| extension-grype    | `podman-desktop/extension-grype`    | `grype`, `syft`  | GitHub Assets (`anchore/*`) — archived (`.tar.gz`/`.zip`)    |
| minc-extension     | `minc-org/minc-extension`           | `minc`           | GitHub Assets                                                |

### Extensions that benefit partially (detect only)

| Extension     | Repo                    | CLI tool | Notes                                   |
| ------------- | ----------------------- | -------- | --------------------------------------- |
| crc-extension | `crc-org/crc-extension` | `crc`    | Assumes pre-installed, PATH search only |

### Extensions NOT affected (confirmed by code review)

**Built-in**: docker, lima, kube-context, registries, podman-docker-context — no CLI tool management.

**External**: ai-lab (`containers/`), bootc (`containers/`), Headlamp (`podman-desktop/extension-headlamp`), layers-explorer, quadlet, kreate, kubernetes-dashboard, kubernetes-contexts, postgresql, apple-container (build-time only), macadam (`crc-org/`), redhat-account-ext, redhat-lightspeed-ext, redhat-sandbox-ext, redhat-pack-ext, openshift-image-checker-ext, hummingbird-ext — these don't manage CLI binaries at runtime.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Core (packages/extension-api + packages/main)                       │
│                                                                      │
│  CliTool                                                             │
│    ├── detect(options?)                                              │
│    │     → which/where.exe + fallback dirs + version parse           │
│    │     → returns { path, version, installationSource }             │
│    ├── installSystemWide(sourcePath)                                 │
│    │     → chmod + admin copy to /usr/local/bin (or WinApps)         │
│    │     → returns destination path                                  │
│    └── uninstall(binaryPath)                                         │
│          → rm, retries with admin on EACCES                          │
│                                                                      │
│  env (unchanged)                                                     │
│    └── isWindows / isMac / isLinux                                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  extension-github (bundled, pre-installed)                            │
│                                                                      │
│  Exported API (@podman-desktop/extension-github-api)                  │
│    └── getCliInstaller(config)                                       │
│          config: { owner, repo, resolveAssetName(v, os, arch) }      │
│          returns CliInstaller:                                        │
│            ├── listVersions(options?)                                 │
│            │     → Octokit listReleases, filter, sort                │
│            └── installToStorage(release, destPath)                    │
│                  → find asset by name, download, chmod                │
│                  → returns path to ready-to-use binary                │
│                                                                      │
│  Internals: Octokit + github-authentication session                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Consumer extensions (compose, kind, kubectl-cli, etc.)              │
│                                                                      │
│  package.json: extensionDependencies: ["podman-desktop.github"]      │
│  Gets API via extensions.getExtension<GitHubExtensionApi>()          │
│  Calls CliInstaller for releases & downloads                         │
│  Calls core CliTool for detect / install / uninstall                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Design principles

1. **No GitHub in core** — zero `@octokit/rest` dependency in podman-desktop. All GitHub logic lives in extension-github.
2. **extension-github is bundled** — ships pre-installed, CLI extensions depend on it.
3. **Consumer-oriented** — API exposes what consumers need, not implementation details (no `systemPath` property, no arch mappings).
4. **No platform helpers** — `resolveAssetName` receives raw `os`/`arch`; each extension does its own 1-2 line mapping inline.
5. **Nothing GitHub-related in `extension-api.d.ts`** — core only gains `detect()`, `installSystemWide()`, `uninstall()`.
6. **Extensible later** — download provider registry when GitLab is needed. Not now.

---

## Current duplication (with links)

### Binary detection (PATH lookup + version parse)

Each extension duplicates `which`/`where.exe` + fallback dirs + version output parsing:

- [compose/detect.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/detect.ts)
- [kubectl/detect.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/detect.ts)
- [kind/util.ts L48-122](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/util.ts#L48-L122)
- [minikube/util.ts L135-167](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L135-L167)
- [grype/anchore-cli-service.ts L212-249](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L212-L249)

→ Replaced by **`CliTool.detect()`**

### OS/architecture mapping for asset filenames

Every extension manually maps `os.platform()` and `os.arch()` to asset naming conventions:

- [compose/os.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/os.ts) (identical to kubectl's)
- [kubectl/os.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/os.ts)
- [kubectl-cli/kubectl-github-releases.ts L76-82](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/kubectl-github-releases.ts#L76-L82)
- [kind/kind-installer.ts L135-144](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L135-L144)
- [compose/compose-github-releases.ts L79-88](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/compose-github-releases.ts#L79-L88)
- [minikube/download.ts L175-201](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L175-L201)
- [grype/anchore-cli-service.ts L412-453](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L412-L453)
- [minc/github-helper.ts L134-155](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L134-L155)

→ **Not changed by this epic.** Each extension keeps its own mapping logic inside the `resolveAssetName` callback it provides to `getCliInstaller()`.

### GitHub release listing (Octokit + auth)

Every extension creates an Octokit instance and lists releases identically:

- [compose/compose-github-releases.ts L48-69](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/compose-github-releases.ts#L48-L69)
- [kubectl/kubectl-github-releases.ts L49-68](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/kubectl-github-releases.ts#L49-L68)
- [kind/kind-installer.ts L88-107](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L88-L107)
- [minikube/download.ts L46-64](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L46-L64)
- [grype/anchore-cli-service.ts L316-336](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L316-L336)
- [minc/github-helper.ts L89-113](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L89-L113)

→ Replaced by **`CliInstaller.listVersions()`** (from extension-github)

### Binary download from GitHub + chmod

Find asset → download via Octokit → write to disk → chmod 0o755:

- [compose/compose-github-releases.ts L75-128](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/compose-github-releases.ts#L75-L128)
- [kind/kind-installer.ts L128-199](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L128-L199)
- [minikube/download.ts L145-163](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L145-L163) + [L203-215](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/download.ts#L203-L215)
- [grype/anchore-cli-service.ts L361-387](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L361-L387)
- [minc/github-helper.ts L166-189](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L166-L189)

`makeExecutable`/`chmod 0o755` duplicated in: [compose/utils.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/utils.ts), [kubectl/utils.ts](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/utils.ts), [kind/kind-installer.ts L188-191](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/kind-installer.ts#L188-L191), [minc/github-helper.ts L181-184](https://github.com/minc-org/minc-extension/blob/aef2656d/src/helper/github-helper.ts#L181-L184), [grype/anchore-cli-service.ts L404-407](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L404-L407)

→ Replaced by **`CliInstaller.installToStorage()`** (from extension-github)

### System-wide install (admin copy)

chmod → copy to system dir with admin privileges:

- [compose/cli-run.ts L41-103](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/cli-run.ts#L41-L103)
- [kubectl/cli-run.ts L52-103](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/cli-run.ts#L52-L103)
- [kind/util.ts L125-158](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/util.ts#L125-L158)
- [minikube/util.ts L93-133](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L93-L133)
- [grype/anchore-cli-service.ts L91-120](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L91-L120)

→ Replaced by **`CliTool.installSystemWide()`**

### Uninstall (admin delete)

`deleteFile` + `deleteFileAsAdmin` — **character-for-character identical** in 3 built-in extensions:

- [compose/extension.ts L480-521](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/compose/src/extension.ts#L480-L521)
- [kubectl/extension.ts L499-540](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kubectl-cli/src/extension.ts#L499-L540)
- [kind/extension.ts L680-721](https://github.com/podman-desktop/podman-desktop/blob/083a61d7/extensions/kind/src/extension.ts#L680-L721)
- [minikube/util.ts L169-199](https://github.com/podman-desktop/extension-minikube/blob/9b71cb61/src/util.ts#L169-L199)
- [grype/anchore-cli-service.ts L280-300](https://github.com/podman-desktop/extension-grype/blob/6f0082a3/packages/backend/src/services/anchore-cli-service.ts#L280-L300)

→ Replaced by **`CliTool.uninstall()`**

---

## Core extension API additions

### `CliToolOptions` — new optional fields

```typescript
interface CliToolOptions {
  // ... existing fields ...
  versionArgs?: string[];                    // default: ['--version']
  parseVersion?: (stdout: string) => string; // default: semver heuristic
}
```

### `CliTool.detect()`

```typescript
detect(options?: { additionalDirs?: string[] }): Promise<CliToolDetectResult | undefined>;
```

**Search order:** PATH → extension storage → macOS dirs → `additionalDirs`.

**Side-effect-free:** does NOT update CliTool state.

```typescript
interface CliToolDetectResult {
  path: string;
  version: string;
  installationSource: 'extension' | 'external';
}
```

### `CliTool.installSystemWide()`

```typescript
installSystemWide(sourcePath: string): Promise<string>;
```

- macOS/Linux: copies to `/usr/local/bin/<name>` with admin prompt
- Windows: copies to `%LOCALAPPDATA%\Microsoft\WindowsApps\<name>.exe`
- Always chmod first, returns destination path

### `CliTool.uninstall()`

```typescript
uninstall(binaryPath: string): Promise<void>;
```

- Tries `unlink()`, on EACCES retries with admin. No-ops on ENOENT.

---

## Extension-github API

Types published as `@podman-desktop/extension-github-api`:

```typescript
export interface GitHubRelease {
  label: string; // QuickPickItem-compatible display name
  tag: string;   // e.g. 'v2.29.1'
  id: number;    // GitHub release ID
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

---

## Examples

### compose — full lifecycle

```typescript
import * as extensionApi from '@podman-desktop/api';
import type { GitHubExtensionApi, GitHubRelease } from '@podman-desktop/extension-github-api';

export async function activate(ctx: extensionApi.ExtensionContext): Promise<void> {
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

  // GitHub installer for compose
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
      return selected.tag.slice(1); // 'v2.29.1' → '2.29.1'
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
      const detected = await tool.detect();
      if (detected) await tool.uninstall(detected.path);
    },
  });
}
```

### kind — full lifecycle (Go-style arch)

```typescript
import type { GitHubExtensionApi, GitHubRelease } from '@podman-desktop/extension-github-api';

const github = extensionApi.extensions.getExtension<GitHubExtensionApi>('podman-desktop.github')!.exports;

const tool = extensionApi.cli.createCliTool({
  name: 'kind',
  displayName: 'Kind',
  markdownDescription: '...',
  images: { icon: '...' },
  versionArgs: ['--version'],
  parseVersion: stdout => stdout.replace('kind ', '').trim(),
});

const installer = github.getCliInstaller({
  owner: 'kubernetes-sigs',
  repo: 'kind',
  resolveAssetName: (version, os, arch) => {
    const mappedOs = os === 'win32' ? 'windows' : os;
    const mappedArch = arch === 'x64' ? 'amd64' : arch;
    return `kind-${mappedOs}-${mappedArch}`;
  },
});

let selectedRelease: GitHubRelease;

tool.registerInstaller({
  selectVersion: async () => {
    const releases = await installer.listVersions();
    const selected = await extensionApi.window.showQuickPick(releases);
    if (!selected) throw new Error('No version selected');
    selectedRelease = selected;
    return selected.tag.slice(1);
  },
  doInstall: async _logger => {
    const suffix = extensionApi.env.isWindows ? '.exe' : '';
    const destPath = path.join(ctx.storagePath, 'bin', `kind${suffix}`);
    const binaryPath = await installer.installToStorage(selectedRelease, destPath);
    await tool.installSystemWide(binaryPath);
  },
  doUninstall: async _logger => {
    const suffix = extensionApi.env.isWindows ? '.exe' : '';
    await tool.uninstall(path.join(ctx.storagePath, 'bin', `kind${suffix}`));
    const detected = await tool.detect();
    if (detected) await tool.uninstall(detected.path);
  },
});
```

### kubectl — GitHub for versions, CDN for download

```typescript
import type { GitHubExtensionApi } from '@podman-desktop/extension-github-api';

const github = extensionApi.extensions.getExtension<GitHubExtensionApi>('podman-desktop.github')!.exports;

const tool = extensionApi.cli.createCliTool({
  name: 'kubectl',
  displayName: 'kubectl',
  markdownDescription: '...',
  images: { icon: '...' },
  versionArgs: ['version', '--client', '-o', 'json'],
  parseVersion: stdout => JSON.parse(stdout).clientVersion.gitVersion.replace('v', ''),
});

// Only uses listVersions() — kubectl downloads from CDN, not GitHub assets
const installer = github.getCliInstaller({
  owner: 'kubernetes',
  repo: 'kubernetes',
  resolveAssetName: () => '', // unused
});

tool.registerInstaller({
  selectVersion: async () => {
    const releases = await installer.listVersions({ count: 10 });
    const selected = await extensionApi.window.showQuickPick(releases);
    if (!selected) throw new Error('No version selected');
    return selected.tag.slice(1);
  },
  doInstall: async (_logger, version) => {
    // kubectl's own CDN download (only tool with this pattern)
    const os = process.platform === 'win32' ? 'windows' : process.platform;
    const arch = process.arch === 'x64' ? 'amd64' : process.arch;
    const suffix = extensionApi.env.isWindows ? '.exe' : '';
    const url = `https://dl.k8s.io/release/v${version}/bin/${os}/${arch}/kubectl${suffix}`;

    const destPath = path.join(ctx.storagePath, 'bin', `kubectl${suffix}`);
    const resp = await fetch(url);
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.writeFile(destPath, Buffer.from(await resp.arrayBuffer()));
    if (!extensionApi.env.isWindows) await fs.promises.chmod(destPath, 0o755);

    await tool.installSystemWide(destPath);
  },
});
```

### grype — archive extraction (kept in extension)

```typescript
import type { GitHubExtensionApi } from '@podman-desktop/extension-github-api';

const github = extensionApi.extensions.getExtension<GitHubExtensionApi>('podman-desktop.github')!.exports;

const tool = extensionApi.cli.createCliTool({
  name: 'grype',
  displayName: 'Grype',
  markdownDescription: '...',
  images: { icon: '...' },
});

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

// installToStorage returns the raw archive; grype extracts it
const archivePath = await installer.installToStorage(selectedRelease, path.join(ctx.storagePath, 'tmp', 'archive'));
const binaryPath = await extractArchive(archivePath, ctx.storagePath); // grype's own logic
await tool.installSystemWide(binaryPath);
```

### crc — detect only (no GitHub dependency)

```typescript
const tool = extensionApi.cli.createCliTool({
  name: 'crc',
  displayName: 'CRC',
  markdownDescription: '...',
  images: { icon: '...' },
  versionArgs: ['version'],
  parseVersion: stdout => stdout.match(/CRC version:\s+(\S+)/)?.[1] ?? '',
});

const detected = await tool.detect();
if (detected) {
  tool.updateVersion({ version: detected.version, path: detected.path, installationSource: 'external' });
}
// No installer — crc is assumed pre-installed
```

---

## Rollout plan

### Phase 0 — Prerequisites (parallel)

| Task | Description |
| ---- | ----------- |
| Bundle extension-github | Make it a pre-installed extension |
| API package | Create `packages/api` in extension-github repo, publish as `@podman-desktop/extension-github-api` |
| Verify extensionDependencies | Ensure it works for bundled extensions |
| Add extensionDependencies | Add `"podman-desktop.github"` to `package.json` of compose, kubectl-cli, kind, and external extensions |

### Phase 1 — Core CliTool methods (sequential PRs)

1. `detect()` — PATH lookup + version parsing + `versionArgs`/`parseVersion` options
2. `installSystemWide()` — platform-specific copy with admin
3. `uninstall()` — delete with admin fallback

### Phase 2 — Extension-github `getCliInstaller()` implementation

Implement `listVersions()` and `installToStorage()` backed by Octokit + `github-authentication` session.

### Phase 3 — Built-in extension adoption

Migrate compose, kubectl-cli, kind. Bulk of code deletion:

- compose: ~6 files deleted, remove `@octokit/rest`
- kubectl-cli: ~6 files deleted, keep CDN download, remove `@octokit/rest`
- kind: ~3 files simplified, remove `@octokit/rest`

### Phase 4 — External extension adoption (one issue per repo)

- `podman-desktop/extension-kind` — same as built-in kind
- `podman-desktop/extension-minikube` — full migration
- `podman-desktop/extension-grype` — partial (keeps archive extraction)
- `minc-org/minc-extension` — full migration (deletes 208-line github-helper.ts)
- `crc-org/crc-extension` — detect-only

### Phase 5 — Unlocked

- Helm CLI tool extension ([#13561](https://github.com/podman-desktop/podman-desktop/issues/13561)) — ~30 lines of config
- CLI state sync fix ([#17000](https://github.com/podman-desktop/podman-desktop/issues/17000)) — uniform detect result shape

---

## Future (out of scope)

When GitLab or another provider is needed → introduce a `DownloadProvider` registry. Until then, GitHub-specific code in extension-github is correct.
