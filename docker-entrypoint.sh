#!/bin/bash
set -e

# Start the D-Bus system daemon (required by pipedald for NetworkManager/wifi)
mkdir -p /run/dbus
rm -f /run/dbus/pid
dbus-daemon --system --fork

# Create the pipedal runtime directory with correct group ownership
mkdir -p /run/pipedal
chown root:pipedal_d /run/pipedal
chmod 775 /run/pipedal

# # Pre-seed AudioConfig.json to skip the onboarding/setup page on first run
# mkdir -p /var/pipedal
# if [ ! -f /var/pipedal/AudioConfig.json ]; then
#     echo '{"isOnboarding": false}' > /var/pipedal/AudioConfig.json
# fi

# Start the admin service (creates /run/pipedal/pipedal_admin socket)
/usr/sbin/pipedaladmind &

# Wait until the admin socket is ready
for i in $(seq 1 20); do
    [ -S /run/pipedal/pipedal_admin ] && break
    sleep 0.5
done

exec "$@"
