# Mortgage Calculator (Standalone)

Standalone static mortgage calculator extracted from the original platform repository.

## Included
- Calculator UI: `site/themes/veecasa/assets/mortgage-calculator.html`
- Calculator CSS: `site/themes/veecasa/assets/css/mortgage-calculator.css`
- Calculator JS modules: `site/themes/veecasa/assets/js/mortgage-calculator/`
- Docker runtime: `Dockerfile.mortgage-calculator` and `docker-compose.mortgage-calculator.yml`
- Local start scripts: `start-mortgage-ui.sh` and `start-mortgage-ui.ps1`

## Run Locally
Use the helper script:

```bash
bash start-mortgage-ui.sh
```

Then open:

```text
http://localhost:8080/mortgage-calculator.html
```

## Run With Docker
Build and run with Docker Compose:

```bash
docker compose -f docker-compose.mortgage-calculator.yml up --build
```

Then open:

```text
http://localhost:8080/mortgage-calculator.html
```

## Run Formula Tests
The calculator logic includes a Node-based test file:

```bash
node site/themes/veecasa/assets/js/mortgage-calculator/mortgageCalculator.test.js
```
