#!/bin/sh
set -eu
trap 'exit 2' EXIT

case "${1:-}" in
  doc) filter="MS Word 97"; output="docx:Office Open XML Text"; suffix=docx; required="WordDocument" ;;
  ppt) filter="MS PowerPoint 97"; output="pptx:Impress MS PowerPoint 2007 XML"; suffix=pptx; required="PowerPoint Document" ;;
  *) exit 2 ;;
esac
input="/scratch/input.$1"
head -c 20000001 > "$input"
[ "$(wc -c < "$input")" -le 20000000 ]
gsf list "$input" > /scratch/streams
grep -Eq "^f[[:space:]]+[0-9]+[[:space:]]+${required}$" /scratch/streams
if grep -Ei '(^|/|[[:space:]])(VBA|Macros|PROJECT|PROJECTwm|_VBA_PROJECT[^/ ]*|ObjectPool|MBD[0-9A-F]+|Ole10Native)(/|$)' /scratch/streams >/dev/null; then
  exit 2
fi
case "$1" in
  doc) grep -Eq '^f[[:space:]]+[0-9]+[[:space:]]+[01]Table$' /scratch/streams ;;
  ppt) grep -Eq '^f[[:space:]]+[0-9]+[[:space:]]+Current User$' /scratch/streams ;;
esac
mkdir -p /scratch/profile/user /scratch/out
printf '%s\n' '<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>' > /scratch/profile/user/registrymodifications.xcu
soffice -env:UserInstallation=file:///scratch/profile --headless --nologo --nodefault --norestore \
  --infilter="$filter" --convert-to "$output" --outdir /scratch/out "$input" >/dev/null 2>&1
[ "$(wc -c < "/scratch/out/input.$suffix")" -le 20000000 ]
trap - EXIT
cat "/scratch/out/input.$suffix"
