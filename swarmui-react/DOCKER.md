# SwarmUI React - Docker & Deployment

## Running with Docker

### Build the React Frontend

```bash
cd swarmui-react
docker build -t swarmui-react .
```

### Run the Container

```bash
# Run React frontend (connects to SwarmUI on host)
docker run -d \
  --name swarmui-react \
  -p 3000:80 \
  --add-host=host.docker.internal:host-gateway \
  swarmui-react
```

Then access the React UI at: http://localhost:3000

**Note:** SwarmUI backend must be running on the host at `localhost:7801`

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  react-ui:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: swarmui-react
    ports:
      - "3000:80"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d --build
```

---

## Integrated Mode

Build React and serve directly from SwarmUI at `http://localhost:7801/react/`

```bash
npm run build:integrated
```

This copies the built React app to `../src/wwwroot/react/`

---

## Development Modes

| Mode | Command | URL |
|------|---------|-----|
| Vite Dev | `npm run dev` | http://localhost:5173 |
| Electron | `npm run electron:dev` | Desktop app |
| Preview | `npm run preview` | http://localhost:4173 |
| Docker | `docker-compose up` | http://localhost:3000 |
| Integrated | `npm run build:integrated` | http://localhost:7801/react/ |
