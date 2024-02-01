# Cloudflare page deploy

A simple for deploy Cloudflare page with custom data in `.env` file

## ⚠️ Note

I'm not cloudflared developer. I use code reference from repo [workers-sdk](https://github.com/cloudflare/workers-sdk).

# Install

```
npm i -g cfpage
```

## How to use

1. Goto https://dash.cloudflare.com
2. Goto "Account" -> "My profile" -> "API Tokens"
3. Find "API Keys" and copy "Global API Key"
5. Goto your current project
5. Add `.env` variable this

```
CF_EMAIL="<YOUR_CLOUDFLARE_EMAIL>"
CF_TOKEN="<YOUR_CLOUDFLARE_TOKEN>"
CF_PROJECT_NAME="<CLOUDFLARE_PAGE_PROJECT_NAME>"
```

## Structure .env
### CF_EMAIL (**REQUIRED**)
For authenticate headers
### CF_TOKEN (**REQUIRED**)
For authenticate headers
### CF_PROJECT_NAME (**REQUIRED**)
Cloudflare page project name site
### CF_BRANCH
Cloudflare page branch

## Enjoy!

![IMG](https://media1.tenor.com/m/-DdP7PTL6r8AAAAC/furina-focalors.gif)
