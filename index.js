const express = require("express")
const socketIO = require('socket.io');
const http = require('http')

let server = http.createServer(express()) 
let cr= {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"]
  }
let io = socketIO(server,{cors:cr}) 
let socket;


function initSocket(){
    server.listen(4321)
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

function init(){
    initSocket()
    setInterval(() => {
        send('Hey!')
    }, 2000);
}

init()

