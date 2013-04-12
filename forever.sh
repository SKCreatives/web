#!/usr/bin/env bash

# To start at @reboot, run crontab -e and append this:
# @reboot ~/webapps/APP/forever.sh >> ~/webapps/APP/logs/cron.log 2>&1

# start from console:
# ./forever.sh

# Webapp
WEBAPP=sidekickcreatives_com
APPORT=11690
APPDIR=$HOME/webapps/$WEBAPP
NODE_ENV=production

# Check if we aren't already running
#			`forever list` or…
#     `ps ux -G theworkers` for non-Forever processes
if [ $(forever list | grep -P -- '(--?p(ort)?\s+'${APPORT}')|('${WEBAPP}')' | grep -v grep | wc -l | tr -s "\n") -gt 0 ]; then
	echo "${WEBAPP} is already running"
	echo "Node.js is $(which node)"
	exit 99
fi

cd $APPDIR

forever start \
	-l ${WEBAPP}.log \
	-o logs/forever-out.log \
	-e logs/forever-err.log \
	--append \
	--sourceDir $APPDIR \
	app.js \
		--ptitle "sidekick-live" \
		--port   "11690"

# If forever exits with error
if [ "$?" == "0" ]
	then
	echo "Starting Forever for ${WEBAPP}"
	echo "Node.js is $(which node)"
fi

# Clear variables just in case…
unset WEBAPP
unset APPORT
unset APPDIR
unset NODE_ENV