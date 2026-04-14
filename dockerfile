# Use Ubuntu
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    musescore3 \
    xvfb \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (official NodeSource method)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && node -v \
    && npm -v

# Set working directory
WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy app
COPY src ./src
COPY input ./input
COPY server.js ./
COPY tmp ./tmp

# Create tmp folder
RUN mkdir -p /app/tmp

# Install Audiveris
WORKDIR /tmp
RUN wget https://github.com/Audiveris/audiveris/releases/download/5.10.1/Audiveris-5.10.1-ubuntu22.04-x86_64.deb -O audiveris.deb \
    && mkdir -p /opt/audiveris \
    && dpkg-deb -x audiveris.deb /opt/audiveris \
    && rm audiveris.deb


# Back to app
WORKDIR /app

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]