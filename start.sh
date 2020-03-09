#!/bin/bash
git pull

export NVM_DIR=$HOME/.nvm;
source $NVM_DIR/nvm.sh;

nvm install node
npm update
npm install
if [ -z "$1" ]
then
	xvfb-run -a node .
else
	nohup xvfb-run -a node . &
fi
