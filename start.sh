#!/bin/bash
git pull
npm update
npm install
if [ -z "$1" ]
then
	xvfb-run -a node .
else
	nohup xvfb-run -a node . &
fi
