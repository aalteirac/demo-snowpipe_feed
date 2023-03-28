const { SpeedSensor, CadenceSensor } = require('incyclist-ant-plus');
const { AntDevice } = require('incyclist-ant-plus/lib/bindings')
const express = require("express");
const req= require("request");
const socketIO = require('socket.io');
const http = require('http');
const port = process.env.SOCKET_PORT || 4321;
const urlStreaming = process.env.URL_STREAMING || 'http://localhost:8100/test';
var debug = process.env.DEBUG || false;
var ingest = process.env.INGEST_ENABLE || true;
const wheelCircumference = process.env.WHEEL_SIZE || 2.118;
const frequence = process.env.FREQ_SENSOR || 800;

let server = http.createServer(express()) 
let cr= {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"]
  }
let io = socketIO(server,{cors:cr}) 

let socket;
let lastSpeedCheck=-1;
let lastCadenceCheck=-1;
let lastCadenceEvent=-1;

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
            if(debug==true)console.log('EVENT',event)
        })
    });
}

function send(msg){
    if(socket){
        if(ingest==true){
            req.post({
                url:urlStreaming,
                json:msg
            }, (err,resp,body)=>{
                if(err)console.log(err)
                if(debug==true )console.log(body);
            }
            )
        }
        socket.emit('data',msg);
    }
        
}

async function startAll(deviceID = -1) {
    debug = (debug === 'true' || debug === 'True' || debug==true);
    ingest = (ingest === 'true' || ingest === 'True' || ingest==true);
    console.log('ENV FREQ_SENSOR:',frequence);
    console.log('ENV WHEEL_SIZE:',wheelCircumference);
    console.log('ENV PORT:',port);
    console.log('ENV INGEST_ENABLE:',ingest);
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
            if(debug==true )
                console.log(`id: ANT+${profile} ${deviceID}, speed: ${data.CalculatedSpeed}, distance: ${data.CalculatedDistance}, TotalRevolutions:${data.CumulativeSpeedRevolutionCount},Motion:${data.Motion}`);
            if(data.Motion==false){
                send({ts:new Date(),move:!data.Motion,speed:data.CalculatedSpeed,distance:data.CalculatedDistance,total_revolution:data.CumulativeSpeedRevolutionCount,cadence:lastCadenceCheck})
                lastSpeedCheck=data.CalculatedSpeed;
            }
            else{
                if(lastSpeedCheck!=0){
                    send({ts:new Date(),move:!data.Motion,speed:0,distance:0,total_revoltion:data.CumulativeSpeedRevolutionCount,cadence:0})
                }
                lastSpeedCheck=0;    
            }
            lastPrintSpeedTime=currentTime
        }
    }
    else{
        if(currentTime-lastPrintCadenceTime>=frequence){
            if(debug==true)
                console.log(`id: ANT+${profile} ${deviceID}, cadence: ${data.CalculatedCadence}`);
            if(lastCadenceEvent!=data.CadenceEventTime){ 
                lastCadenceCheck=data.CalculatedCadence; 
                lastCadenceEvent=data.CadenceEventTime;  
            }
            else{
                lastCadenceCheck=0;
            }
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
