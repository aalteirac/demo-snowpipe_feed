const { SpeedSensor } = require('incyclist-ant-plus');
const { AntDevice } = require('incyclist-ant-plus/lib/bindings')

const ant = new AntDevice({ startupTimeout: 2000 })
const msg_limit=1000;
var lastMsgTS= Date.now();

async function main(deviceID = -1) {
    const opened = await ant.open()
    if (!opened) {
        console.log('could not open Ant Stick')
        return;
    }

    const channel = ant.getChannel();
    if (!channel) {
        console.log('could not open channel')
        return;
    }
    console.log(`Channel ${channel.getChannelNo()}`)

    channel.on('data', onData)

    if (deviceID === -1) { // scanning for device
        console.log('Scanning for sensor(s)')
        const speedSensor = new SpeedSensor()
        speedSensor.
        channel.startScanner()
        channel.attach(speedSensor)
    }
    else {  // device ID known
        console.log(`Connecting with id=${deviceID}`)
        const speedSensor = new SpeedSensor(deviceID)
        channel.startSensor(speedSensor)
    }
}

function onData(profile, deviceID, data) {
    const currentTime=Date.now();
    if(currentTime-lastMsgTS>=msg_limit){
        console.log(`id: ANT+${profile} ${deviceID}, speed: ${data.CalculatedSpeed}, distance: ${data.CalculatedDistance}`);
        lastMsgTS=currentTime;
    }

}

async function onAppExit() {
    await ant.close();
    return 0;
}

process.on('SIGINT', async () => await onAppExit());  // CTRL+C
process.on('SIGQUIT', async () => await onAppExit()); // Keyboard quit
process.on('SIGTERM', async () => await onAppExit()); // `kill` command


const args = process.argv.slice(2);
const deviceID = args.length > 0 ? args[0] : undefined;

main(deviceID);
