#!/bin/sh

git add .
git reset --hard
git pull
npm i
npm run build
pm2 restart mml-b2b-frontend
pm2 logs mml-b2b-frontend