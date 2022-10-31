#!/bin/sh

GIT=$(git remote -v | grep 'fetch' | awk '{ print $2 }')
REPO=${GIT%.git}

QUERY=$(printf 'map(select(.build_settings.repo_url == "%s")) | .[0].name' $REPO)

NAME=$(netlify sites:list --json | jq "$QUERY" | tr -d \")

echo $NAME