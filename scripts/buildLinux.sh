#!/bin/sh
BINARY_TYPE="linux"
DIRECTORY="bin"
FILE_BINARY="$DIRECTORY/cfpage-$BINARY_TYPE"

node --experimental-sea-config ./sea-config.json 

# Check folder "bin" exist
if [ ! -d "$DIRECTORY" ]; then
  mkdir $DIRECTORY
fi
# Copy it
cp $(command -v node) "$FILE_BINARY"
# Un-sign binary
codesign --remove-signature "$FILE_BINARY"
# Inject it
echo "Building..."
npx postject "$FILE_BINARY" NODE_SEA_BLOB ./sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
# Sign
echo "Build done."
codesign --sign - "$FILE_BINARY"
# Copy content in dist
echo "Copy webassembly."
cp ./dist/blake3*.wasm "$DIRECTORY"
# Try run script
echo "Trying run script..."
$FILE_BINARY -h
echo "All done."