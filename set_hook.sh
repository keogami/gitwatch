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

URL="https://$NAME.netlify.app/telegram"
if test -n "$DEV"; then
  URL="https://$NAME-$DEV.netlify.live/telegram"
fi

curl -F url="$URL" "https://api.telegram.org/bot$TOKEN/setWebhook"