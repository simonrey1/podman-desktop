---
title: 'From Docker Compose to Kubernetes with Podman Kube Play'
description: Use podman kube generate and podman kube play to turn your running containers into Kubernetes manifests — test them locally without a cluster, then deploy to production.
slug: from-compose-to-kubernetes-with-podman-kube-play
authors: [simonrey1]
tags: [podman-desktop, kubernetes, podman, kube-play, compose, migrating]
hide_table_of_contents: false
---

If you use Docker Compose for local development but deploy to Kubernetes in production, you know the pain: you maintain two completely different configuration formats for the same application. Podman offers a built-in alternative that eliminates this gap.

With `podman kube generate` and `podman kube play`, you can develop locally using Podman pods, export standard Kubernetes YAML, test it on your laptop without a cluster, and deploy the same file to production with `kubectl apply`.

This tutorial walks through the full workflow with a concrete example.

<!--truncate-->

## The problem with two config formats

A typical Docker Compose workflow looks like this:

1. Write a `docker-compose.yml` for local development.
2. Manually translate it into Kubernetes Deployments, Services, ConfigMaps, and PersistentVolumeClaims for production.
3. Keep both in sync as the application evolves.

This duplication is tedious and error-prone. Changes in one format are easily forgotten in the other.

## How Podman solves this

Podman has two built-in commands that bridge the gap:

| Command | What it does |
|---|---|
| `podman kube generate` | Exports running containers or pods as Kubernetes YAML |
| `podman kube play` | Creates containers and pods from a Kubernetes YAML file |

Together, they let you use **Kubernetes YAML as your single source of truth** — for both local development and production deployment.

## What you need

- **Podman** installed — Comes with [Podman Desktop](https://podman-desktop.io/downloads), or install the CLI directly.
- **A running Podman machine** (macOS / Windows only) — Created automatically by Podman Desktop on first launch. Not needed on Linux.
- **kubectl** (optional) — Only needed if you want to deploy to a real cluster at the end. Podman Desktop can install it for you via the built-in kubectl CLI extension.

## Step 1 — Create a pod with multiple containers

Let's build a simple web application with an Nginx frontend and a PostgreSQL database, grouped in a single Podman pod.

A pod in Podman works like a pod in Kubernetes: containers inside it share the same network namespace and can reach each other on `localhost`.

```bash
# Create a pod with published ports
podman pod create --name myapp -p 8080:80 -p 5432:5432

# Add an Nginx frontend
podman run -d --pod myapp --name web nginx:alpine

# Add a PostgreSQL database
podman run -d --pod myapp --name db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -v myapp-db-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

Verify everything is running:

```bash
podman pod ps
```

```
POD ID        NAME    STATUS   CREATED        INFRA ID      # OF CONTAINERS
a1b2c3d4e5f6  myapp   Running  5 seconds ago  f6e5d4c3b2a1  3
```

Test it:

```bash
curl http://localhost:8080
```

You should see the default Nginx welcome page.

## Step 2 — Generate Kubernetes YAML

Now export the running pod as a Kubernetes manifest:

```bash
podman kube generate myapp > myapp.yaml
```

Open `myapp.yaml` — you'll see a standard Kubernetes Pod spec with both containers, their environment variables, ports, and the volume definition. This is real Kubernetes YAML that `kubectl` understands.

You can also generate different resource types:

```bash
# As a Deployment (with replicas)
podman kube generate --type deployment --replicas 3 myapp > myapp-deployment.yaml

# Include a Kubernetes Service definition
podman kube generate -s myapp > myapp-with-service.yaml
```

## Step 3 — Test the YAML locally (no cluster needed)

Here's where it gets interesting. Tear down the original pod and recreate it purely from the YAML file:

```bash
# Remove the original pod
podman pod rm -f myapp

# Recreate from YAML
podman kube play myapp.yaml
```

Verify it works exactly as before:

```bash
curl http://localhost:8080
```

Same Nginx welcome page. The pod was rebuilt from the YAML — proving the manifest is correct.

To tear it down:

```bash
podman kube down myapp.yaml
```

## Step 4 — Refine for production

The generated YAML is a solid starting point, but production clusters typically require a few additions. Open `myapp.yaml` and consider adding:

**Resource limits** — Prevent containers from consuming too many resources:

```yaml
resources:
  limits:
    memory: "256Mi"
    cpu: "500m"
  requests:
    memory: "128Mi"
    cpu: "250m"
```

**Health probes** — Let Kubernetes know when your container is ready:

```yaml
readinessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 10
```

**Registry paths** — Replace local image references with your container registry:

```bash
sed -i 's|docker.io/library/nginx:alpine|registry.example.com/myapp/web:v1|g' myapp.yaml
```

## Step 5 — Deploy to a Kubernetes cluster

When you're satisfied with the manifest, deploy it:

```bash
kubectl apply -f myapp.yaml
```

The same YAML that worked locally with `podman kube play` now runs on your cluster.

## Bonus — Debug production issues locally

One of the most powerful features of this workflow: you can pull a pod definition from a live cluster and run it locally on your laptop.

```bash
# Export a pod from the cluster
kubectl get pod myapp-xyz -o yaml > debug.yaml

# Run it locally with Podman
podman kube play debug.yaml
```

No need to reproduce the issue in a development environment — you're running the exact same pod definition that's failing in production.

## Migrating from an existing Docker Compose file

If you already have a `docker-compose.yml`, here's how to transition:

```bash
# Start your existing Compose services
podman compose up -d

# List running containers
podman ps --format '{{.Names}}'

# Generate Kubernetes YAML per container
podman kube generate web > web.yaml
podman kube generate db > db.yaml

# Or recreate as a Podman pod for a combined manifest
podman compose down
podman pod create --name myapp -p 8080:80
podman run -d --pod myapp --name web nginx:alpine
podman run -d --pod myapp --name db postgres:16-alpine
podman kube generate myapp > myapp.yaml
```

## Comparison at a glance

| | Docker Compose | Podman Kube Play |
|---|---|---|
| Config format | `docker-compose.yml` | Standard Kubernetes YAML |
| Deploy to Kubernetes | Requires conversion (Kompose, manual rewrite) | Same file — `kubectl apply -f` |
| Test locally without a cluster | Yes | Yes — `podman kube play` |
| Debug production pods locally | No native path | Yes — pull YAML, run with `podman kube play` |
| Generate with replicas | `deploy.replicas` (Swarm only) | `--type deployment --replicas N` |
| Ecosystem | Docker-specific | Kubernetes-standard, portable to any distro |

## Limitations to be aware of

- **Generated YAML is a starting point** — Add resource limits, health probes, and proper PersistentVolumeClaims before deploying to production.
- **Not a full Kubernetes controller** — `podman kube play` runs pods locally, but doesn't provide auto-healing, rolling updates, or replica management. For that, deploy to a real cluster.
- **Complex Compose features need manual work** — Multi-network setups, Docker secrets, and advanced healthcheck conditions don't have direct equivalents in the generated YAML.

## What's next?

This is part of a series about migrating from Docker Desktop to Podman Desktop:

- **[See your Docker containers inside Podman Desktop](/blog/see-docker-containers-in-podman-desktop)** — The zero-commitment first step.
- **Common migration gotchas** (coming soon) — Rootless permissions, privileged ports, and networking differences.

Questions or feedback? Start a [discussion on GitHub](https://github.com/podman-desktop/podman-desktop/discussions) or check the [podman kube play documentation](https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html).
