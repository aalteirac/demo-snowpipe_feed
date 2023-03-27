FROM node:10

COPY ant-usb-m.rules /etc/udev/rules.d

WORKDIR /app

COPY . /app

RUN apt-get update && \
    apt-get install -y build-essential libudev-dev && \
    rm -rf /var/lib/apt/lists/* 

RUN npm install


# Run app.js when the container launches
CMD ["node", "ant_feed.js"]