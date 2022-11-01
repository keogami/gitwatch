#!/bin/sh

ARGS=$(getopt -a -n opt.sh -o d: --long dev: -- "$@")
eval set -- "$ARGS"
while :
do
  case "$1" in
  -d | --dev) DEV=$2; shift 2 ;;
  --) shift; break ;;
  esac
done

NAME=$(cat SITE_NAME)
TOKEN=$(cat TELEGRAM_TOKEN)

HOST="$NAME.netlify.app"
if test -n "$DEV"; then
  HOST="$NAME-$DEV.netlify.live"
  curl --header "Content-Type: application/json" --request POST  --data "{\"HOST_NAME\": \"$HOST\"}" "https://$HOST/setDevelopmentVar"
fi

curl -F url="https://$HOST/telegram" "https://api.telegram.org/bot$TOKEN/setWebhook"