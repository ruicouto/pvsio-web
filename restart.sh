#!/bin/bash
npm install
if [ ! -d "src/server/lib/glassfish4" ]; then
  cd src/server/lib/
  ./installNC.sh
  cd ../../..
fi
cd src/server
node pvssocketserver.js restart
