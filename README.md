# license-scanner
Scan project licenses

# Testing

Create a `.env` file:

```
GITHUB_USER=<your github username>
GITHUB_AUTH=<a personal access token from https://github.com/settings/tokens>
```
Load these into your environment:
```
set -a
. ./.env
set +a
```

Create a `targets.json` file.

Run
```
babel-node check.js
```
