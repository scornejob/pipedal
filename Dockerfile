FROM ubuntu:24.04


RUN apt-get update && apt-get install -y \
    curl git sudo gcc-12 g++-12 libnm-dev \
    liblilv-dev libboost-dev libjack-jackd2-dev \
    libnl-3-dev libnl-genl-3-dev libsystemd-dev catch \
    libasound2-dev libwebsocketpp-dev authbind \
    libsdbus-c++-dev libsdbus-c++-bin \
    libavahi-client-dev libzip-dev libicu-dev \
    libpipewire-0.3-dev librsvg2-dev cmake ninja-build \
    google-perftools libgoogle-perftools-dev \
    libxrandr2

# Download and run the NodeSource setup script for Node.js 24
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -

# Install Node.js
RUN sudo apt-get install -y nodejs

RUN npm view npm get version of @babel/plugin-proposal-private-property-in-object version command

# Submodules must be initialized on the host before building:
#   git submodule update --init --recursive
ADD . /workspaces/pipedal
WORKDIR /workspaces/pipedal

RUN ./react-config

RUN ./init.sh
RUN ./mk.sh


CMD ["./build/src/pipedald", "/etc/pipedal/config", "./vite/dist", "-port", "0.0.0.0:8080", "-log-level", "debug"]