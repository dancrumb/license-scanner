# license-scanner
Scan project licenses

# Components

## Parsers
Parsers have a static method, `parse` that takes a string of text and
an optional string to indicate the source of the text.

`parse` returns an object with a `raw` and `corrected` SPDX id, if it can
figure them out. Otherwise, it throws a `NoLicenseError`.

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
