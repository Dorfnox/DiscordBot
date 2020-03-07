#!/bin/bash
git pull
sudo npm install
sudo nohup xvfb-run -a --server-args="-screen 0 720x480x12" node . &
