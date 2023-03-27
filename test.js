const { SpeedSensor } = require('incyclist-ant-plus');
const { AntDevice } = require('incyclist-ant-plus/lib/bindings')
let cr= {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"]
  }
const io = require('socket.io')(cr);
const port = process.env.PORT || 4321;


let socket;

const ant = new AntDevice({ startupTimeout: 2000 })
const msg_limit=1000;
let lastPrintSpeedTime = Date.now();
let lastPrintCadenceTime = Date.now();

function initSocket(){
    console.log('SOCKET OK');
    io.listen(port);
    io.on('connection', (sock)=>{
        socket=sock;
        console.log(`New user connected ${socket.id}`)
        socket.on("message", (data) => {
            let event = JSON.parse(data)
            console.log('EVENT',event)
        })
    });
}

function send(msg){
    if(socket){
        socket.emit('data',msg);
    }
        
}

async function initAnt(deviceID = -1) {
    initSocket();
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
        channel.startScanner()
        channel.attach(speedSensor)
    }
    else {  // device ID known
        console.log(`Connecting with id=${deviceID}`)
        const speedSensor = new SpeedSensor(deviceID)
        speedSensor.setWheelCircumference(4.818);
        channel.startSensor(speedSensor)
    }
}

function onData(profile, deviceID, data) {
    const currentTime=Date.now();
    if(currentTime-lastPrintSpeedTime>=msg_limit){
        console.log(`id: ANT+${profile} ${deviceID}, speed: ${data.CalculatedSpeed}, distance: ${data.CalculatedDistance}, TotalRevolutions:${data.CumulativeSpeedRevolutionCount},Motion:${data.Motion}`);
        send({ts:new Date(),speed:data.CalculatedSpeed,distance:data.CalculatedDistance})
        lastPrintSpeedTime=currentTime;
    }

}

async function onAppExit() {
    if(socket)
        socket.close();
    console.log("Closing ant")
    await ant.close();
    return 0;
}

process.on('SIGINT', async () => await onAppExit());  // CTRL+C
process.on('SIGQUIT', async () => await onAppExit()); // Keyboard quit
process.on('SIGTERM', async () => await onAppExit()); // `kill` command


const args = process.argv.slice(2);
const deviceID = args.length > 0 ? args[0] : undefined;

initAnt(deviceID);
