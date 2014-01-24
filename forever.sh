#!/usr/bin/env bash
source ~/.path

# To start at @reboot, run crontab -e and append this:
# @reboot /home/USERNAME/webapps/WEBAPP/forever.sh >> /home/USERNAME/webapps/WEBAPP/logs/cron.log 2>&1

# start from console:
# ./forever.sh

# Use absolute paths beacuse cron doesn't have the user environment

# Webapp
USERNAME=sidekick
WEBAPP=sidekickcreatives_com
APPDIR=/home/$USERNAME/webapps/$WEBAPP
APPFILE=index.js
NODE_ENV=production

# Check if we aren't already running
#			`forever list` or…
#     `ps ux -G theworkers` for non-Forever processes
if [ $(forever list | grep -P -- '('${WEBAPP}')' | grep -v grep | wc -l | tr -s "\n") -gt 0 ]; then
	echo "${WEBAPP} is already running"
	echo "Node.js is $(which node)"
	echo "NODE_ENV is ${NODE_ENV}"
	exit 99
fi

cd $APPDIR

forever start \
	-l ${WEBAPP}.log \
	-o logs/forever-out.log \
	-e logs/forever-err.log \
	--append \
	--sourceDir $APPDIR \
	$APPFILE

# If forever exits with error
if [ "$?" == "0" ]
	then
	echo "Starting Forever for ${WEBAPP}"
	echo "Node.js is $(which node)"
	echo "NODE_ENV is ${NODE_ENV}"
fi

# Clear variables just in case…
unset USERNAME
unset WEBAPP
unset APPDIR
unset APPFILE
unset NODE_ENV