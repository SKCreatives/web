#!/bin/sh

# cron it:
# * * * * * /home/nordic/webapps/nordicarch_com/forever.sh >> cron.log 2>&1

# if [ `ps -u USERNAME | grep -i PROCESS | wc -l` -lt 1 ]
# then
#     echo "Starting <PROCESS>."
#     <enter the command to start your process here>
# else
#     echo "<PROCESS> is running."
# fi

# to start form console use nohup ./forever.sh

PWD=`pwd`

if [ $(ps aux | grep nordic | grep sidekick-live | grep -v grep | wc -l | tr -s "\n") -eq 0 ]
then
    export NODE_ENV=production
    export PATH=$HOME/bin:$PATH
    forever $HOME/bin/nodemon \
    --exitcrash $PWD/app.js \
    --ptitle    "sidekick-live" \
    --port      "15197" \
    >> $PWD/logs/forever.log
    echo "----- Starting Forever for sidekick-live" >> $PWD/logs/forever.log
    date >> $PWD/logs/forever.log
fi