const Ant = require('aai-ant-plus');
const stick = new Ant.GarminStick3;
const cadenceSensor = new Ant.CadenceSensor(stick);
const speedSensor = new Ant.SpeedSensor(stick);
const express = require("express")
const socketIO = require('socket.io');
const http = require('http')
const port = process.env.PORT || 4321;

let server = http.createServer(express()) 
let cr= {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"]
  }
let io = socketIO(server,{cors:cr}) 
let socket;

var checkOldval=-1;
let lastPrintSpeedTime = Date.now();
let lastPrintCadenceTime = Date.now();

function initSocket(){
    server.listen(port)
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
async function initANT(){
    initSocket();
    speedSensor.setWheelCircumference(4.818);
    speedSensor.on('speedData', async data => {
        if(checkOldval!=data.CalculatedSpeed){
            const currentTime = Date.now();
            if (currentTime - lastPrintSpeedTime >= 400) { 
              console.log('SPEED  ', new Date(), data.CalculatedSpeed, data.CalculatedDistance);
              send({ts:new Date(),speed:data.CalculatedSpeed,distance:data.CalculatedDistance})
              lastPrintSpeedTime = currentTime;
            }
            checkOldval=data.CalculatedSpeed;
        }
    });

    cadenceSensor.on('cadenceData', data => {
        if(true){
            const currentTime = Date.now();
            if (currentTime - lastPrintCadenceTime >= 400) { 
                console.log('CADENCE',new Date(),data.CalculatedCadence);
                send({ts:new Date(),cadence:data.CalculatedCadence})
                lastPrintCadenceTime = currentTime;
            }
        }   
    });

    stick.on('startup', function () {
        console.log('startup');
        speedSensor.attach(0, 0)
        console.log('SPEED SENSOR ATTACHED')
        setTimeout(()=>{
            cadenceSensor.attach(1, 0);
            console.log('CADENCE SENSOR ATTACHED')
        },2000)
    });

    if (!stick.open()) {
        console.log('Stick not found!');
    }
}

function randomTS(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
    return (Math.random() * (max - min + 1) + min).toFixed(2);
}

async function simulateSensor(){
}
initANT()
module.exports = { initANT }

