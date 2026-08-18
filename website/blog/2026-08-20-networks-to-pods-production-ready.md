---
title: 'From networks to pods: getting containers production-ready'
description: When a Docker-style network is better off as a Podman pod, how to run it with kube play, and why rootless is worth checking before you deploy.
slug: networks-to-pods-production-ready
authors: [simonrey1]
tags: [podman-desktop, podman, docker, rootless, pods, kubernetes]
hide_table_of_contents: false
---

import ThemedImage from '@theme/ThemedImage';

[Podman Desktop](https://podman-desktop.io/docs/installation)'s `podman` CLI mirrors `docker` almost command for command, so networks you already use to let containers find each other by name keep working unchanged. But Podman can also group those containers into a pod, and run that pod straight from a Kubernetes YAML file with `kube play`, close enough to a real Kubernetes Pod to validate it against cluster policies before it leaves your laptop. One policy worth checking: running as root, which Podman avoids by default. This post covers what stays the same, when to use a pod instead of a network, how to test against production rules locally, and why rootless works the way it does.

<!--truncate-->

## 1. The CLI already feels familiar

Only the binary name changes for most day-to-day commands:

```shell-session
$ podman pull quay.io/hummingbird/postgresql:18
$ podman images
$ podman volume create pgdata
$ podman run -d -v pgdata:/var/lib/postgresql/data quay.io/hummingbird/postgresql:18
```

The real differences show up in how containers are grouped, and how "root" behaves once a container runs.

## 2. Networks: the habit you already have

Creating a network works exactly like in Docker. In Podman Desktop:

1. Go to **Networks > Create Network** and create a network named `myapp`.

<ThemedImage
alt="Podman Desktop Networks > Create Network dialog"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/network-create-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/network-create-dark.png').default,
  }}
/>

2. Go to **Containers > Create**, select **Existing image**, and pick `quay.io/hummingbird/postgresql:18`.

<ThemedImage
alt="Podman Desktop run existing image hummingbird postgresql"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/run-existing-image-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/run-existing-image-dark.png').default,
  }}
/>

3. In the **Networking** tab, select **Container networking**, choose **User-defined network**, then pick `myapp`. Name the container `db`.

<ThemedImage
alt="Podman Desktop run container dialog with network selection"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/run-container-network-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/run-container-network-dark.png').default,
  }}
/>

4. Run a second container the same way, same image and network, named `web`, with command `sh -c 'while true; do pg_isready -h db && echo "web: connected to db"; sleep 2; done'`. This checks every couple of seconds that `db` is reachable by name.

<ThemedImage
alt="Podman Desktop run container dialog with pg_isready loop command and myapp network selected"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/run-web-container-config-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/run-web-container-config-dark.png').default,
  }}
/>

Or via CLI:

```shell-session
$ podman network create myapp
$ podman run -d --network myapp --name db -e POSTGRES_PASSWORD=secret quay.io/hummingbird/postgresql:18
$ podman run -d --network myapp --name web quay.io/hummingbird/postgresql:18 \
    sh -c 'while true; do pg_isready -h db && echo "web: connected to db"; sleep 2; done'
```

Both containers should show as running on the **Containers** page. `web`'s **Logs** tab should keep printing `accepting connections` and `web: connected to db`, confirming it reached `db` over the network:

<ThemedImage
alt="Podman Desktop web container logs showing the pg_isready loop connecting to db"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/container-terminal-pgisready-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/container-terminal-pgisready-dark.png').default,
  }}
/>

Cleanup: select `db` and `web` in the Containers list and delete them, then delete the `myapp` network from the Networks list.

<ThemedImage
alt="Podman Desktop Containers list with db and web selected for deletion"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/delete-containers-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/delete-containers-dark.png').default,
  }}
/>

Or via CLI:

```shell-session
$ podman rm -f db web
$ podman network rm myapp
```

Two things worth knowing. Since Podman 6 / [Netavark 2.0](https://github.com/containers/netavark/releases/tag/v2.0.0), bridge networks default to [`isolate=strict`](https://docs.podman.io/en/latest/markdown/podman-network-create.1.html), so containers on different networks can no longer reach each other by default. And Podman supports Docker's `host.docker.internal` for reaching services on your host, plus its own `host.containers.internal`, so Docker scripts and Compose files keep working.

A network is as far as Docker takes you: containers stay separate processes that resolve each other's names, which is not how they will actually be grouped once they land on Kubernetes or OpenShift. Podman has a concept Docker does not: the pod.

## 3. The alternative to a network: a pod

The name "Podman" comes from "Pod Manager". A [pod](https://docs.podman.io/en/latest/markdown/podman-pod.1.html) groups containers so they share one network namespace, close to a [Kubernetes Pod](https://kubernetes.io/docs/concepts/workloads/pods/). There is no Docker equivalent, no `docker pod` command. Containers in a pod talk to each other over `localhost` instead of a network hostname, the same way they will once deployed. See Podman Desktop's [guide to creating a pod](https://podman-desktop.io/docs/containers/creating-a-pod) for more detail.

In Podman Desktop, run both containers first:

**`db` container**: image `quay.io/hummingbird/postgresql:18`, environment variable `POSTGRES_PASSWORD=secret`.

<ThemedImage
alt="Podman Desktop run db container with POSTGRES_PASSWORD env variable"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/run-db-container-config-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/run-db-container-config-dark.png').default,
  }}
/>

**`web` container**: same image, command `sh -c 'while true; do pg_isready -h localhost && echo "web: connected to db"; sleep 2; done'`.

<ThemedImage
alt="Podman Desktop run web container with pg_isready loop command"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/run-web-container-config-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/run-web-container-config-dark.png').default,
  }}
/>

Select both containers in the Containers list and click **Create Pod**.

<ThemedImage
alt="Podman Desktop select containers and Create Pod"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/create-pod-from-containers-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/create-pod-from-containers-dark.png').default,
  }}
/>

<ThemedImage
alt="Podman Desktop Create Pod form"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/create-pod-from-containers-form-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/create-pod-from-containers-form-dark.png').default,
  }}
/>

Or via CLI:

```shell-session
$ podman pod create --name myapp -p 5432:5432
$ podman run -d --pod myapp --name db -e POSTGRES_PASSWORD=secret quay.io/hummingbird/postgresql:18
$ podman run -d --pod myapp --name web quay.io/hummingbird/postgresql:18 \
    sh -c 'while true; do pg_isready -h localhost && echo "web: connected to db"; sleep 2; done'
```

Check `web`'s logs and you'll see it reaching `db` over `localhost`, not a network hostname:

<ThemedImage
alt="Podman Desktop web container logs showing localhost connectivity to db"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/pod-terminal-psql-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/pod-terminal-psql-dark.png').default,
  }}
/>

```shell-session
$ podman logs web
# localhost:5432 - accepting connections
# web: connected to db
```

Cleanup: open the **Pods** page and delete the `myapp` pod. This removes the pod, `db`, `web`, and the infra container in one go.

<ThemedImage
alt="Podman Desktop Pods page with the myapp pod selected for deletion"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/delete-pod-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/delete-pod-dark.png').default,
  }}
/>

Or via CLI:

```shell-session
$ podman pod rm -f myapp
```

### Remark: this same pod can come from a Kubernetes YAML file

A pod is already shaped like a Kubernetes Pod, so Podman can run one straight from a Kubernetes YAML file, no cluster needed. This is also how you'd [deploy a pod to Kubernetes](https://podman-desktop.io/docs/kubernetes/deploying-a-pod-to-kubernetes) or [apply a YAML manifest](https://podman-desktop.io/docs/kubernetes/applying-a-yaml-manifest) from Podman Desktop later:

```shell-session
$ cat <<'EOF' > myapp-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: web
      image: quay.io/hummingbird/postgresql:18
      command:
        - sh
        - -c
        - 'while true; do pg_isready -h localhost && echo "web: connected to db"; sleep 2; done'
    - name: db
      image: quay.io/hummingbird/postgresql:18
      env:
        - name: POSTGRES_PASSWORD
          value: secret
EOF
$ podman kube play myapp-pod.yaml
```

`web` reuses the same connectivity loop from the pod example, just from a YAML file instead of two `podman run` commands.

You can also paste that YAML into Podman Desktop under **Pods > Play Kubernetes YAML**:

<ThemedImage
alt="Podman Desktop Play Kubernetes YAML dialog"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/kube-play-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/kube-play-dark.png').default,
  }}
/>

Verify `db` came up: go to **Containers**, open `myapp-web` (grouped under the `myapp` pod), and check its **Logs** tab. It should print `accepting connections` and `web: connected to db`, same as before:

{/* TODO: take screenshot */}
<ThemedImage
alt="Podman Desktop myapp-web container logs showing the pg_isready loop connecting to db"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/kube-play-web-logs-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/kube-play-web-logs-dark.png').default,
  }}
/>

Or open `myapp-web`'s **Terminal** tab for a one-off check:

```shell-session
$ pg_isready -h localhost
# localhost:5432 - accepting connections
```

Or tail the logs from your own terminal:

```shell-session
$ podman logs myapp-web
# localhost:5432 - accepting connections
# web: connected to db
```

Cleanup:

```shell-session
$ podman kube down myapp-pod.yaml
$ rm myapp-pod.yaml
```

The same file also works with `kubectl apply -f` on a real cluster: develop locally with `podman kube play`, deploy the file as is. Docker has no equivalent for this.

`kube play` covers a useful subset of the Kubernetes spec, not every controller, scheduler, or networking feature a real cluster provides. But for getting containers grouped and reachable the way they'll be in production, it's close enough to let you validate an important production rule before touching a real cluster.

## 4. One step closer to production: validate the pod in Kind with restricted security

[OpenShift SCC](https://docs.openshift.com/container-platform/latest/authentication/managing-security-context-constraints.html) and the [Kubernetes restricted policy](https://kubernetes.io/docs/concepts/security/pod-security-standards/) both reject pods that try to run as root. A container that works fine on your laptop can get rejected the moment it reaches a cluster with those policies enabled, so it's worth applying the same policy locally first.

Podman Desktop's [Kind extension](https://podman-desktop.io/docs/kind) lets you reproduce that check. One naming note: once a Kind cluster exists, Podman Desktop shows a second, separate **Pods** view under **Kubernetes**. That one lists pods running on the cluster (like `my-web` below), not local Podman pods (like `myapp` earlier) — keep the two apart.

1. Go to **Settings > Resources** and [create a Kind cluster](https://podman-desktop.io/docs/kind/creating-a-kind-cluster).

<ThemedImage
alt="Settings > Resources showing Kind cluster creation"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/kind-cluster-create-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/kind-cluster-create-dark.png').default,
  }}
/>

2. Apply the restricted policy on the default namespace:

```shell-session
$ kubectl config use-context kind-kind-cluster
$ kubectl label --overwrite ns default pod-security.kubernetes.io/enforce=restricted
```

3. Deploy without a `securityContext`. It's rejected before it even starts:

```shell-session
$ kubectl run my-web --image=quay.io/hummingbird/nginx:latest --port=8080
# Error from server (Forbidden): pods "my-web" is forbidden: violates PodSecurity "restricted:latest":
# allowPrivilegeEscalation != false, unrestricted capabilities, runAsNonRoot != true, seccompProfile
```

4. Add a `securityContext` and use an image built for non-root, like [Project Hummingbird](https://hummingbird-project.io/docs/using/overview/). You can apply the YAML from Podman Desktop too, under **Kubernetes > Pods > Apply YAML**:

<ThemedImage
alt="Podman Desktop Kubernetes > Pods > Apply YAML dialog"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/kubernetes-pods-apply-yaml-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/kubernetes-pods-apply-yaml-dark.png').default,
  }}
/>

Or via CLI:

```shell-session
$ cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: my-web
spec:
  containers:
    - name: web
      image: quay.io/hummingbird/nginx:latest
      ports:
        - containerPort: 8080
      securityContext:
        allowPrivilegeEscalation: false
        runAsNonRoot: true
        capabilities:
          drop: ["ALL"]
        seccompProfile:
          type: RuntimeDefault
EOF
```

This time it starts. Podman Desktop's **Kubernetes > Pods** view shows it running:

<ThemedImage
alt="Kubernetes > Pods view showing my-web pod running successfully"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/pod-my-web-running-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/pod-my-web-running-dark.png').default,
  }}
/>

```shell-session
$ kubectl wait --for=condition=Ready pod/my-web --timeout=60s
# pod/my-web condition met
$ kubectl delete pod my-web
```

5. Try the same `securityContext` with plain `image: nginx:latest`, which still runs as root internally. Admission passes since the fields look correct, but the pod fails at runtime:

```shell-session
$ kubectl get pod nginx-root
# NAME         READY   STATUS                       RESTARTS   AGE
# nginx-root   0/1     CreateContainerConfigError   0          5s
$ kubectl describe pod nginx-root | grep "Error"
# Error: container has runAsNonRoot and image will run as root
```

Same view, but now an error state:

<ThemedImage
alt="Kubernetes > Pods view showing nginx-root pod in CreateContainerConfigError state"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/pod-nginx-root-error-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/pod-nginx-root-error-dark.png').default,
  }}
/>

```shell-session
$ kubectl delete pod nginx-root
```

When done, [delete the Kind cluster](https://podman-desktop.io/docs/kind/deleting-your-kind-cluster) from **Settings > Resources**.

**Documentation**: [Project Hummingbird](https://hummingbird-project.io/docs/using/overview/) | [OpenShift SCC](https://docs.openshift.com/container-platform/latest/authentication/managing-security-context-constraints.html) | [K8s Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) | [Red Hat image guidelines](https://docs.openshift.com/container-platform/latest/openshift_images/create-images.html#use-uid_create-images)

## 5. Opening up: Podman aims to be rootless, everywhere

That check has nothing to do with Podman itself — the same policy would reject a root container built with Docker too. What's specific to Podman is how little work it takes to get a rootless container, even one that thinks it's root. Inside a Podman container, a process can still see itself as UID 0, but a [user namespace](https://docs.podman.io/en/latest/markdown/podman.1.html#rootless-mode) maps that back to your normal host user underneath. If something inside a container or in Podman itself goes wrong, the blast radius is your user account, not the machine.

Podman can offer that so cheaply because there's no daemon. Docker runs `dockerd`, a long-running root process managing every container, and anyone in the `docker` group can talk to it — Docker itself [warns](https://docs.docker.com/engine/security/#docker-daemon-attack-surface) this is close to root access, since the daemon can mount any host path and start privileged containers on request. Docker does ship a [rootless mode](https://docs.docker.com/engine/security/rootless/) since Engine 20.10, but it has to be turned on. Podman skips the daemon entirely: each `podman run` is a direct [fork/exec](https://developers.redhat.com/blog/2020/09/25/rootless-containers-with-podman-the-basics) under your own user account.

That's also why pods and `kube play` feel lightweight. `podman pod create` starts a small infra container that just owns a network namespace; every container added with `--pod` forks into that same namespace, the way any Linux process can join a namespace another process created. No daemon tracks "which containers belong to which pod" elsewhere — Podman reads that from local state on disk. A pod is a handful of ordinary processes sharing one namespace, not a new kind of object needing a service to manage it.

You can see that infra container yourself: open the `myapp` pod on the **Containers** page, and next to `db` and `web` there's a third one, usually `myapp-infra`, sitting quietly and holding the shared namespace open:

<ThemedImage
alt="Podman Desktop Containers page showing the myapp-infra container alongside db and web inside the pod"
sources={{
    light: require('./img/docker-to-podman-pods-socket-rootless/pod-infra-container-light.png').default,
    dark: require('./img/docker-to-podman-pods-socket-rootless/pod-infra-container-dark.png').default,
  }}
/>

If you need the container's user to match your host UID (say, for sane file ownership on a mounted volume), use [`--userns=keep-id`](https://docs.podman.io/en/latest/markdown/podman-run.1.html#userns-mode). It maps your host UID/GID into the container instead of remapping to UID 0.

|               | Docker                                  | Podman                                                |
| ------------- | ---------------------------------------- | ------------------------------------------------------ |
| Architecture  | Root daemon (`dockerd`)                  | No daemon, fork/exec into a user namespace              |
| Container UID | Root inside = root on host (via daemon)  | Root inside = your user on host (via user namespace)   |

### One side effect: no daemon means no socket

Docker's daemon listens on `/var/run/docker.sock`, and tools like Testcontainers, VS Code Dev Containers, and CI runners talk to it directly. Podman has no daemon, so that socket isn't there unless you ask for it.

```shell-session
# With Podman running but Docker Compatibility disabled:
$ docker info --format=json | jq -r .ServerVersion
# failed to connect to the docker API at unix:///var/run/docker.sock
```

Turn it on under **Settings > Preferences > Docker Compatibility**, then enable **Third-Party Docker Tool Compatibility**. This maps `/var/run/docker.sock` to the Podman socket.

```shell-session
$ docker info --format=json | jq -r .ServerVersion
# 6.0.2  (Podman responds with its own version)
```

With that toggle on, the `docker` CLI and most Docker-socket tools work without further changes.

Worth being precise here, since the name carries baggage from Docker Desktop. `/var/run/docker.sock` is the control interface of Docker's daemon, the always-running root process holding every container's state. Podman's `podman.sock` is different: a small listener that turns each API request into an ordinary `podman` command via the same fork/exec path, nothing sitting behind it between requests. Docker Compatibility just gives Docker-flavored tools a familiar address, not a second daemon in the background.

### Bonus: even the installer tries to be rootless

Podman Desktop pushes the same idea to installation, before you've even run a container.

On [Windows with WSL](https://podman-desktop.io/docs/installation/windows-install) enabled, the Podman v6 MSI installer defaults to a user-scoped install (`%LOCALAPPDATA%\Programs\Podman`), and `podman machine init`/`start` need no elevation. Podman Desktop installs with "Only for me", no admin required — the whole workflow can stay admin-free from install to runtime. See the [installation guide](https://podman-desktop.io/docs/installation) for macOS and Linux too.

A few spots still ask for elevated access, and it's worth knowing why:

- **macOS**: the installer asks for your password once, to set up `podman-mac-helper`, a LaunchDaemon that forwards `/var/run/docker.sock` to your Podman socket, since `/var/run` is owned by the system. Podman Desktop itself just installs by dragging it to Applications.
- **Windows with Hyper-V**: creating a Hyper-V VM needs administrator rights. WSL does not.
- **Docker-in-Docker style CI**: some pipelines expect a root daemon, and for those you can still create a rootful machine with `podman machine init --rootful`.
- **Podman Desktop's default**: in the ["Create a Podman machine"](https://podman-desktop.io/docs/podman/creating-a-podman-machine) dialog, "Machine with root privileges" is on by default. Turn it off for a fully rootless machine.

**Documentation**: [Rootless containers with Podman](https://developers.redhat.com/blog/2020/09/25/rootless-containers-with-podman-the-basics) | [Podman rootless mode](https://docs.podman.io/en/latest/markdown/podman.1.html#rootless-mode) | [Rootless tutorial](https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md) | [Windows installation](https://podman-desktop.io/docs/installation/windows-install)

## Putting it together

A network isn't wrong, it's just not the whole picture. It's worth replacing some of those networks with pods, and using `kube play` to run that grouping straight from a Kubernetes YAML file, so what you test locally is closer to what gets deployed. Rootless is the other half of the story: not something Podman invented, but something it makes easy to get right. Once a pod reaches OpenShift or a restricted-policy cluster, non-root stops being optional, and a configured Kind cluster lets you catch that locally first. No daemon is what makes this workflow lightweight, not the reason any of it's required — root is a production concern with or without Podman.

## Summary

| Area            | Docker                                                                            | Podman                                                     | Fix                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------| ------------------------------------------------------------| ------------------------------------------------------------------------------------------------------------------ |
| Networking      | User-defined networks (legacy `--link` deprecated)                                | Same networks, plus pods and `kube play` for K8s-ready setups | Prefer pods once you are aiming at production                                                                    |
| Architecture    | Root daemon (`dockerd`)                                                            | No daemon, fork/exec into a user namespace                   | Nothing to do, you are already rootless at runtime                                                                |
| Socket          | `/var/run/docker.sock` always available                                           | No socket by default                                          | Enable Docker Compatibility                                                                                       |
| Non-root images | Root images run locally with both, but get rejected on OpenShift/K8s restricted policies | Same                                                     | Add `USER 1001` in your Containerfile, or use images that default to a non-root user (ex: UID 65532) like [Hummingbird](https://hummingbird-project.io/docs/using/overview/) |
| Install         | Requires admin (daemon plus group membership)                                     | Admin-free on Windows/WSL, macOS needs a password for the helper | Improving with each release                                                                                    |

## Going further

- [Installing Podman Desktop](https://podman-desktop.io/docs/installation)
- [Migration documentation](https://podman-desktop.io/docs/migrating-from-docker)
- [Docker Compatibility settings](https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility)
- [Creating a pod](https://podman-desktop.io/docs/containers/creating-a-pod)
- [Deploying a pod to Kubernetes](https://podman-desktop.io/docs/kubernetes/deploying-a-pod-to-kubernetes)
- [Working with the Kind extension](https://podman-desktop.io/docs/kind)
- [Podman `podman run` volume options](https://docs.podman.io/en/latest/markdown/podman-run.1.html#volume-v-source-volume-host-dir-container-dir-options)
- [Creating images for OpenShift](https://docs.openshift.com/container-platform/latest/openshift_images/create-images.html#use-uid_create-images)

If you run into a case not covered here, open a [discussion on GitHub](https://github.com/podman-desktop/podman-desktop/discussions).
