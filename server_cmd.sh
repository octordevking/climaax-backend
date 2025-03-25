#!/bin/bash

# Perform an infinite loop
while true
do
    # Check if the server process is running
    ps aux | grep -q [s]erver_process_name

    # Store the exit code of the previous command
    result=$?

    # If the server process is not running (exit code is not 0)
    if [ $result != 0 ]
    then
        echo "Server Restarting..."

        # Replace the following line with the actual command to start your server
        nodemon server.js

        # Optional: Add a delay between restart attempts
        sleep 2
    fi
    
    # Optional: Add an exit condition if needed, e.g., after a certain number of restart attempts
    # break

done