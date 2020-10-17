#!/bin/bash

set -e

# build plugin code
node ./scripts/build.js

# package plugin code
cd ../zotero-build
./xpi/build_xpi --source-dir=../jurism/build --channel=source --commit-hash=HEAD

# build standalone
cd ../zotero-standalone-build
./build.sh -p l -d /media/storage/src/JM/zotero-build/xpi/build/staging -s

# return code
cd ../jurism

# run program
../zotero-standalone-build/staging/Jurism_linux-x86_64/jurism --ProfileManager -jsconsole
# ../zotero-standalone-build/staging/Jurism_linux-x86_64/jurism --ProfileManager
echo ../zotero-standalone-build/staging/Jurism_linux-x86_64/jurism --ProfileManager -jsconsole -ZoteroDebug

#../zotero-standalone-build/staging/Zotero_linux-x86_64/zotero -jsconsole -d 1
#echo ../zotero-standalone-build/staging/Zotero_linux-x86_64/zotero --ProfileManager -jsconsole -d 1
