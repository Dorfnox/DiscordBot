#!/bin/bash
git pull
sudo npm install
sudo nohup xvfb-run -a node . &
