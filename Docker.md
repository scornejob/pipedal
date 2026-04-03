# Running PiPedal with Docker

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) installed on your host.
- Git submodules initialized (see below).

## 1. Initialize submodules on the host

The Docker image build does **not** run `git submodule update` inside the container. You must do this once on the host before building the image:

```bash
git submodule update --init --recursive
```

This is required because the `.git` directory is excluded from the Docker build context (via `.dockerignore`), so git is not available to resolve submodules inside the container.

## 2. Build and run

```bash
docker compose up --build
```

The first build will take several minutes as it installs system packages, Node.js 24, npm dependencies, and compiles the project with CMake.

The web interface will be available at [http://localhost:8080](http://localhost:8080).

## 3. Stopping the container

```bash
docker compose down
```

## Build context and `.dockerignore`

The following paths are excluded from the Docker build context to reduce image size and avoid issues:

| Excluded path | Reason |
|---|---|
| `.git/` | Avoids git ownership/path issues inside the container |
| `build/` | Prevents stale host build artifacts from leaking into the container build |
| `vite/node_modules/` | Reinstalled inside the container by `./react-config` |
| `vite/dist/` | Rebuilt inside the container |

## Audio device access

The `docker-compose.yml` forwards `/dev/snd` into the container and adds the container process to the `audio` group, which is required for PiPedal to access ALSA audio hardware. If you are running without a sound card (e.g. for testing), remove the `devices` and `group_add` entries from `docker-compose.yml`.

## Real-time audio capabilities

`docker-compose.yml` grants two Linux capabilities required for real-time audio performance:

| Capability | Purpose |
|---|---|
| `SYS_NICE` | Allows `pipedald` to set real-time thread priorities (needed by PipeWire/JACK) |
| `IPC_LOCK` | Allows memory locking (`mlockall`) to prevent audio buffers from being swapped |

The `/sys/devices/system/cpu` path is also bind-mounted read-only so that `pipedald` can read CPU topology information.

## Entrypoint (`docker-entrypoint.sh`)

The container uses a custom entrypoint that performs several initialization steps before starting `pipedald`:

1. **Starts the D-Bus system daemon** — `pipedald` uses D-Bus to communicate with NetworkManager for Wi-Fi configuration. The daemon is started with `dbus-daemon --system --fork`.
2. **Creates `/run/pipedal`** — The runtime socket directory is created and owned by the `pipedal_d` group so that both `pipedald` and `pipedaladmind` can share it.
3. **Pre-seeds `AudioConfig.json`** — On first run, `/var/pipedal/AudioConfig.json` is written with `{"isOnboarding": false}` to skip the interactive audio setup page.
4. **Starts `pipedaladmind`** — The privileged admin service is launched in the background and the entrypoint waits until its Unix socket (`/run/pipedal/pipedal_admin`) is ready before handing off to `pipedald`.

## System user: `pipedal_d`

The `Dockerfile` creates a `pipedal_d` system user and group (no login, no home directory). `pipedald` drops privileges to this user at runtime, matching the behaviour of a normal package installation.

## Known issues

### `libxrandr2` copyright error during package generation

CPack's `CPACK_DEBIAN_PACKAGE_SHLIBDEPS` scans binaries for shared library dependencies and requires `/usr/share/doc/<pkg>/copyright` to be present for every linked library. `libxrandr2` is a transitive dependency (via `libpipewire`) and is installed explicitly in the `Dockerfile` to satisfy this requirement.
