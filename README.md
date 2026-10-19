# cosmos-proposal-builder
Helps you build software upgrade proposals.

The app is a React single-page app that runs entirely in the browser. A small Fastify server only serves the built files.

The browser talks to two services directly:
* **GitHub's releases API**, for the release binaries. Their checksums come from the `digest` GitHub records for each file, which exists for files uploaded since mid-2025. Older releases can't be used. Unauthenticated requests are limited to 60 per hour per network.
* **The chain's RPC endpoint**, to estimate the upgrade height. It must allow cross-origin requests; public Cosmos RPCs generally do.

Nothing is stored in the browser: the form starts fresh on every page load.

## Usage

### Node.js

Requires Node.js 24 or later.

```
npm install
npm run dev
```

This serves the app with hot reload on http://localhost:3000.

To run the production build:

```
npm run build
npm start
```

This serves the app on http://localhost:3000.

### Docker

This serves the app on localhost:3000.
```
docker build -t proposal-builder .
docker run --rm -p 3000:3000 proposal-builder
```

### Development

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm test` | Unit and server tests |
| `npm run typecheck` | Type-check the frontend, server and tests |
| `npm run lint` | ESLint |
| `npm run build` | Build the frontend to `dist/web` and the server to `dist/node` |

The code lives in three folders:

* `src/shared`: the proposal, GitHub release and height-estimate logic
* `src/web`: the React frontend
* `src/server`: the Fastify server that serves the build

### Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Interface to listen on |
| `PORT` | `3000` | Port to listen on |

`/healthz` reports `{"status":"ok"}` for health checks.

The app has no authentication: the server holds no data and makes no outbound requests. To restrict who can open it, add `auth_basic` to the nginx `location` block in front of it.

## Remote deployment

The image is built on the remote host from a clone of this repository.

1. Clone the repository on the host:
   ```
   git clone https://github.com/hyphacoop/cosmos-proposal-builder.git
   cd cosmos-proposal-builder
   ```
2. Build and start the app:
   ```
   docker compose up -d --build
   ```
3. To update, pull the latest code and rebuild:
   ```
   git pull && docker compose up -d --build
   ```

Compose publishes the app only on the host's loopback interface, at `127.0.0.1:3000`, so nginx must handle TLS and forward requests to it. To use another host port, set `HOST_PORT` in the shell or in a `.env` file next to `docker-compose.yml`:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

To serve the app under a subpath such as `/proposal_builder`, strip the prefix with a trailing slash on `proxy_pass`. The app uses relative URLs, so no other configuration is needed:

```nginx
location = /proposal_builder {
    return 301 /proposal_builder/;
}

location /proposal_builder/ {
    proxy_pass http://127.0.0.1:3000/;
}
```
