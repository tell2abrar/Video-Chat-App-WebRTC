const express = require('express');
const socket = require('socket.io');
const app = express();

const port = process.env.PORT || 3000;
app.use(express.static('public'));

//WebServer is listening on port3000
const server = app.listen(port,()=>{
    console.log('server is listening on port',port);
});

//Upgrading the server to websocket server
const io = socket(server);
io.on('connection',(socket)=>{
    console.log('websocket connection is established');

    //Listening for joining room event
    socket.on('join',(roomName)=>{

        //getting info about rooms on server
        const rooms = io.sockets.adapter.rooms;

        //Getting info about particular room on server
        const room = rooms.get(roomName);
        
        
        if(room==undefined){
            socket.join(roomName);
            socket.emit('created');
        }else if(room.size==1){
            socket.join(roomName);
            socket.emit('joined');
        }else{
            socket.emit('full');
        }
    });

    socket.on('ready',(roomName)=>{
        socket.broadcast.to(roomName).emit('ready');
    });

    socket.on('candidate',({candidate,roomName})=>{
        socket.broadcast.to(roomName).emit('candidate',candidate);
    });

    socket.on('offer',({offer,roomName})=>{
        socket.broadcast.to(roomName).emit('offer',offer);
    });

    socket.on('answer',({answer,roomName})=>{
        socket.broadcast.to(roomName).emit('answer',answer);
    });

    socket.on('stop participant video',(roomName)=>{
        socket.broadcast.to(roomName).emit('stop participant video');
    });

    socket.on('start participant video',(roomName)=>{
        socket.broadcast.to(roomName).emit('start participant video');
    });

    socket.on('mute participant audio',(roomName)=>{
        socket.broadcast.to(roomName).emit('mute participant audio');
    });

    socket.on('unmute participant audio',(roomName)=>{
        socket.broadcast.to(roomName).emit('unmute participant audio');
    });
});


