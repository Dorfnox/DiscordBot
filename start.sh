#!/bin/bash
git pull
sudo npm install
if [ -z "$1" ]
then
	sudo xvfb-run -a node .
else
	sudo nohup xvfb-run -a node . &
fi
