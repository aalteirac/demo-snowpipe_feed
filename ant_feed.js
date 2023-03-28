const { SpeedSensor, CadenceSensor } = require('incyclist-ant-plus');
const { AntDevice } = require('incyclist-ant-plus/lib/bindings')
const express = require("express")
const socketIO = require('socket.io');
const http = require('http')
const port = process.env.SOCKET_PORT || 4321;
var debug = process.env.DEBUG || false;
const wheelCircumference = process.env.WHEEL_SIZE || 2.118;
const frequence = process.env.FREQ_SENSOR || 1000;

let server = http.createServer(express()) 
let cr= {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"]
  }
let io = socketIO(server,{cors:cr}) 

let socket;

const ant = new AntDevice({ startupTimeout: 2000 })

let lastPrintSpeedTime = Date.now();
let lastPrintCadenceTime = Date.now();

function initSocket(){
    server.listen(port)
    console.log('SOCKET OK')
    io.on('connection', (sock)=>{
        socket=sock;
        if(debug==true )console.log(`New user connected ${socket.id}`)
        socket.on("message", (data) => {
            let event = JSON.parse(data)
            if(debug==true )console.log('EVENT',event)
        })
    });
}

function send(msg){
    if(socket){
        socket.emit('data',msg);
    }
        
}

async function startAll(deviceID = -1) {
    debug = (debug === 'true' || debug === 'True');
    console.log('ENV FREQ_SENSOR:',frequence);
    console.log('ENV WHEEL_SIZE:',wheelCircumference);
    console.log('ENV PORT:',port);
    console.log('ENV DEBUG:',debug);
    initSocket();
    const opened = await ant.open()
    if (!opened) {
        console.log('could not open Ant Stick')
        return;
    }

    const channel= ant.getChannel();
    if (!channel) {
        console.log('could not open channel')
        return;
    }

    channel.on('data', onData);

    if (deviceID === -1) { 
        console.log('Scanning for sensor(s)')
        const speedSensor = new SpeedSensor()
        speedSensor.setWheelCircumference(wheelCircumference);
        const cadenceSensor=new CadenceSensor();
        channel.attach(cadenceSensor)
        channel.attach(speedSensor)
        console.log('Sensors Attached')
        channel.startScanner()
    }
    else {
        console.log(`Connecting with id=${deviceID}`)
        const speedSensor = new SpeedSensor(deviceID)
        channel.startSensor(speedSensor)
    }
}

function onData(profile, deviceID, data) {
    const currentTime=Date.now();
    if(profile=="SPD"){
        if(currentTime-lastPrintSpeedTime>=frequence){
            if(debug==true )console.log(`id: ANT+${profile} ${deviceID}, speed: ${data.CalculatedSpeed}, distance: ${data.CalculatedDistance}, TotalRevolutions:${data.CumulativeSpeedRevolutionCount},Motion:${data.Motion}`);
            send({ts:new Date(),move:!data.Motion,speed:data.CalculatedSpeed,distance:data.CalculatedDistance,total_revoltion:data.CumulativeSpeedRevolutionCount})
            lastPrintSpeedTime=currentTime
        }
    }
    else{
        if(currentTime-lastPrintCadenceTime>=frequence){
            if(debug==true )console.log(`id: ANT+${profile} ${deviceID}, cadence: ${data.CalculatedCadence}`);
            send({ts:new Date(),cadence:data.CalculatedCadence,lastevent:data.CadenceEventTime})
            lastPrintCadenceTime=currentTime
        }
    }

}

async function onAppExit() {
    if(socket)
        socket.close();
        if(debug==true ) console.log("Closing Socket...")
        if(debug==true ) console.log("Closing Ant...")
    await ant.close();
    return 0;
}

process.on('SIGINT', async () => await onAppExit()); 
process.on('SIGQUIT', async () => await onAppExit()); 
process.on('SIGTERM', async () => await onAppExit()); 


const args = process.argv.slice(2);
const deviceID = args.length > 0 ? args[0] : undefined;

startAll(deviceID);
