# Mortgage Calculator (Trimmed Standalone)

This repository contains only the files required to run the VeeCasa mortgage calculator as a static site.

## Included
- Calculator page: `site/themes/veecasa/assets/mortgage-calculator.html`
- Calculator styles: `site/themes/veecasa/assets/css/mortgage-calculator.css`
- Runtime JS modules: `site/themes/veecasa/assets/js/mortgage-calculator/`
- Docker runtime: `Dockerfile.mortgage-calculator` and `docker-compose.mortgage-calculator.yml`
- Convenience start scripts: `start-mortgage-ui.sh`, `start-mortgage-ui.ps1`

## Run With Docker
```bash
docker compose -f docker-compose.mortgage-calculator.yml up --build -d
```

### One-command launch scripts (with orphan cleanup)

Windows PowerShell:

```powershell
.\start-mortgage-docker.ps1 -Rebuild
```

macOS/Linux:

```bash
./start-mortgage-docker.sh --rebuild
```

Optional full cleanup (remove compose volumes too):

```powershell
.\start-mortgage-docker.ps1 -Rebuild -Clean
```

```bash
./start-mortgage-docker.sh --rebuild --clean
```

Open:

```text
http://localhost:8080
```

Root redirects to:

```text
http://localhost:8080/mortgage-calculator.html
```

## Notes
- The app is fully static (HTML/CSS/JS), served by nginx.
- No backend service or Node runtime is required for production use.
