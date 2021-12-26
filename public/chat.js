console.log('connected');
//Establishing the connection with websocket server
// const socket = io('http://127.0.0.1:3000');
const socket = io('/');

//Getting the DOM elements
const $videoChatLobby = document.getElementById('video-chat-lobby');
const $roomInput = document.getElementById('room-name');
const $joinButton = document.getElementById('join');
const $videoChatRoom = document.getElementById('video-chat-room');
const $localVideo = document.getElementById('local-video');
const $remoteVideo = document.getElementById('remote-video');
const $videoChatLocalControlButtons = document.getElementById('video-chat-local-control-buttons');
const $videoChatRemoteControlButtons = document.getElementById('video-chat-remote-control-buttons'); 
const $toggleAudioButton = document.getElementById('toggleAudiobutton');
const $toggleVideoButton = document.getElementById('toggleVideoButton');
const $togglePeerAudioButton = document.getElementById('togglePeerAudioButton');
const $togglePeerVideoButton = document.getElementById('togglePeerVideoButton');
const $participantRole = document.getElementById('participant-role');
const $localScreen = document.getElementById('local-screen');
const $remoteScreen = document.getElementById('remote-screen');
const $toggleScreenShareButton = document.getElementById('toggleScreenShareButton');
const $videoPlayer = document.getElementById('video-player');



//Global variables
var isHost = false;
var isAllowedByHost = false;
var localStream;
var localAudioTrack;
var localVideoTrack;
var remoteStream;
var remoteAudioTrack;
var remoteVideoTrack;
var localScreenStream;
var localScreenVideoTrack;
var remoteScreenStream;
var remoteScreenVideoTrack;
var roomName = $roomInput.value;
var mergedStreamOne;
var mergedStreamTwo;
var mergedStreamThree;
var count=1;

//ICE candidates configuration
const config = {
    "iceServers":[{"urls": "stun:stun.1.google.com:19302"}]
};


//Making new peerConnection global variable
peerConnection= new RTCPeerConnection(config);

//On pressing join button getting the user media 
$joinButton.addEventListener('click',function(){
    if($roomInput.value==''){
        return alert('Please enter room name');
    }
    //Joining the room
    socket.emit('join',roomName); 
});

socket.on('created',()=>{
    console.log('room is created!');
    isHost = true;

    //Telling particpant its role
    $participantRole.textContent = 'Host';

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||navigator.mozGetUserMedia;
    if(navigator.getUserMedia){
        //getting the stream and set to video element
        navigator.getUserMedia({audio:true,video:true},function(stream){
            $localVideo.srcObject = stream;
            //giving refernce of stream to global localStream variable
            localStream = stream;
            //Retrieving audio and video tracks from local stream 
            var tracks = stream.getTracks();
            localAudioTrack = tracks[0];
            localVideoTrack = tracks[1];
            $localVideo.onloadedmetadata = function(e){
                $videoChatLobby.style='display:none';
                $localVideo.play();
            }


            //EventBinding for VideoChatControl Buttons
            bindEvents();


        },function(err){
            console.log("The following error occurred: " + err.name);
        });
    }else{
        console.log("getUserMedia not supported");
    }
});

socket.on('joined',()=>{
    console.log('room has been joined!');

    //Telling participant its role
    $participantRole.textContent = 'participant';
    
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||navigator.mozGetUserMedia;
    if(navigator.getUserMedia){

    
        //getting the stream and set to video element
        navigator.getUserMedia({audio:true,video:true},function(stream){
            //$localVideo.srcObject = stream;
            //Giving refernce of stream to global variable localStream
            localStream = stream;
            //Retrieving audio and video tracks from local stream 
            var tracks = stream.getTracks();
            localAudioTrack = tracks[0];
            localVideoTrack = tracks[1];
            $videoChatLobby.style='display:none';
            //EventBinding for VideoChatControl Buttons
            bindEvents();

            //Informing the host that peer is ready for peer connection
            socket.emit('ready',roomName);
        },function(err){
            console.log("The following error occurred: " + err.name);
        });
    }else{
        console.log("getUserMedia not supported");
    }
})

socket.on('ready',()=>{
    console.log('peer is ready for rtc connection');
    peerConnection.onicecandidate = function(event){
        if(event.candidate){
            const candidate = event.candidate;
            socket.emit('candidate',{candidate,roomName});
        }
    }
    //Add add tracks to peerConnection Object
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track,localStream);
    });

    peerConnection.ontrack = function(event){

        $remoteVideo.srcObject = event.streams[0];
        //Giving refernce of remote stream to global remote stream varaible
        remoteStream = event.streams[0];
        //Retrieving audio and video tracks from remote stream 
        var tracks = remoteStream.getTracks();
        remoteAudioTrack = tracks[0];
        remoteVideoTrack = tracks[1];
        $remoteVideo.onloadedmetadata = (e)=>{
            $remoteVideo.play();
        }
    }

    //Creating offer ,setting it as localDescription and sending to other peer
    peerConnection.createOffer().then(offer=>{
        peerConnection.setLocalDescription(offer);
        socket.emit('offer',{offer,roomName});
        console.log('offer created and sent to peer');
    }).catch(e=>{
        console.log(e);
    });


    //onnegotiationneeded method is calledback whenever a new track is added to peer connection
    peerConnection.onnegotiationneeded = (e)=>{
        if(remoteStream){
            console.log("negotiation is needed event fired");
            peerConnection.createOffer().then(offer=>{
            peerConnection.setLocalDescription(offer);
                socket.emit('offer',{offer,roomName});
                console.log('offer created and sent to peer');
            }).catch(e=>{
                console.log(e);
            });
        }
    }
});

//Upon receiving new ICE candidate,add candidate to connection
socket.on('candidate',(iceCandidate)=>{
    var candidate = new RTCIceCandidate(iceCandidate);
    console.log('New ice candidate',candidate);
    peerConnection.addIceCandidate(candidate);
});

//Host is offering 
socket.on('offer',(offer)=>{
    console.log("this is offer from host:");
    const offerObject = new RTCSessionDescription(offer);
    console.log(offer);
    if(!isHost){
        // peerConnection = new RTCPeerConnection(config);
        peerConnection.onicecandidate = function(event){
            if(event.candidate){
                const candidate = event.candidate;
                socket.emit('candidate',{candidate,roomName});
            }
        }
        //Add add tracks to peerConnection Object
        if(count==1){
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track,localStream);
            });
            ++count;
        }
    
        peerConnection.ontrack = function(event){
            console.log("from on track function")
            //Giving refernce of remote stream to global remote stream variable
            remoteStream = event.streams[0];
            //Retrieving audio and video tracks from remote stream 
            var tracks = remoteStream.getTracks();
            remoteAudioTrack = tracks[0];
            remoteVideoTrack = tracks[1];

            //make new Stream object for screensharing
            if(tracks.length>=3){
                remoteScreenVideoTrack = tracks[tracks.length-1];
                const tempScreenSharingStream = new MediaStream();
                tempScreenSharingStream.addTrack(remoteScreenVideoTrack);
                remoteScreenStream = tempScreenSharingStream;
                console.log("Screen Share stream",remoteScreenStream);
                // $remoteScreen.srcObject = tempScreenSharingStream;
                // $remoteScreen.onloadedmetadata = (e)=>{
                //     $remoteVideo.play();
                // }
                mergeThreeStreamsAndDisplay();  
                return;
            }

            //Displaying remote stream to remoteVideo

            // $remoteVideo.srcObject = remoteStream;
            // $remoteVideo.onloadedmetadata = (e)=>{
            //     $remoteVideo.play();
            // }

            /* 
            -------------------------Experiment-----------------------

            Merging streams into one stream and display in video Player
            Merging streams approach has three cases
            1 -> Show Both local stream and remote stream
            2 -> Show Both local stream and remote plus screenSharing Screen

            */

            mergeTwoStreamsAndDisplay();
        }

        peerConnection.setRemoteDescription(offer);
        peerConnection.createAnswer().then(answer=>{
            peerConnection.setLocalDescription(answer);
            socket.emit('answer',{answer,roomName});
            console.log('answer is created and sent to peer');
        });
    }
});

//Participant is asnwering
socket.on('answer',(answer)=>{
    console.log("Answer received!");
    peerConnection.setRemoteDescription(answer);
    console.log("Peer Connection object of Host",peerConnection);
    
});

socket.on('full',()=>{
    alert('room is full');
});

//Host is stoping participant's video,Only host has this previlige
socket.on('stop participant video',()=>{
    localVideoTrack.enabled = false;
    $toggleVideoButton.textContent ='start video';
});

//Host is starting participant's vieo,Only host has this previlige
socket.on('start participant video',()=>{
    localVideoTrack.enabled = true;
    $toggleVideoButton.textContent ='stop video';
});

//Host is muting participant's audio,Only host has this previlige
socket.on('mute participant audio',(roomName)=>{
    localAudioTrack.enabled = false;
    $toggleAudioButton.textContent = 'unmute audio';
});

//Host is unmuting participant's audio,Only host has this previlige
socket.on('unmute participant audio',(roomName)=>{
    localAudioTrack.enabled = true;
    $toggleAudioButton.textContent = 'mute audio';
});


//Binding events for various video-chat-control buttons
function bindEvents(){
    $videoChatLocalControlButtons.style.display = 'block';

        //Click listener for Audio button
        $toggleAudioButton.addEventListener('click',(e)=>{
            if(!localAudioTrack){
                return ;
            }
            if(localAudioTrack.enabled){
                localAudioTrack.enabled = false;
                $toggleAudioButton.textContent = 'unmute audio';
            }else{
                localAudioTrack.enabled = true;
                $toggleAudioButton.textContent = 'mute audio';

            }
        });

    //Click listener for Video button
    $toggleVideoButton.addEventListener('click',(e)=>{
        if(!localVideoTrack){
            return ;
        }
        if(localVideoTrack.enabled){
            localVideoTrack.enabled = false;
            $toggleVideoButton.textContent = 'start video';
        }else{
            localVideoTrack.enabled = true;
            $toggleVideoButton.textContent = 'stop Video';

        }
    });
        if(isHost){
            $videoChatRemoteControlButtons.style.display = 'block';
            $togglePeerVideoButton.addEventListener('click',(e)=>{
                if($togglePeerVideoButton.textContent=='stop peer video'){
                    $togglePeerVideoButton.textContent = 'start peer video';
                    socket.emit('stop participant video',roomName);
                }else{
                    $togglePeerVideoButton.textContent ='stop peer video';
                    socket.emit('start participant video',roomName);
                }
            });

            $togglePeerAudioButton.addEventListener('click',e=>{
                if($togglePeerAudioButton.textContent=='mute peer audio'){
                    $togglePeerAudioButton.textContent = 'unmute peer audio';
                    socket.emit('mute participant audio',roomName);
                }else{
                    $togglePeerAudioButton.textContent ='mute peer audio';
                    socket.emit('unmute participant audio',roomName);
                }
            });
        }

        $toggleScreenShareButton.addEventListener('click',async e=>{
                localScreenStream = await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
                $localScreen.srcObject = localScreenStream;
                localScreenStream.getTracks().forEach(track=>{
                    peerConnection.addTrack(track,localStream);
                    console.log("Screen Share Stream is added");
                });
        });

}


function mergeTwoStreamsAndDisplay(){

    var merger = new VideoStreamMerger();

    // Add the Remote Stream. Position it to fill the whole stream (the default)
    merger.addStream(remoteStream, {
        x: 0, // position of the topleft corner
        y: 0,
        width: merger.width,
        height: merger.height,
        mute: false // we don't want sound from the screen (if there is any)
    });

    // Add the local stream. Position it on the bottom left and resize it to 100x100.
    merger.addStream(localStream, {
        x: 0,
        y: merger.height - 100,
        width: 100,
        height: 100,
        mute: false
      });

      merger.start();
      mergedStreamTwo = merger.result;
      console.log("Merged stream object",mergedStreamTwo);
      $videoPlayer.srcObject = mergedStreamTwo;
}

function mergeThreeStreamsAndDisplay(){

    var merger = new VideoStreamMerger();

    // Add the Remote Screen Stream. Position it to fill the whole stream (the default)
    merger.addStream(remoteScreenStream, {
        x: 0, // position of the topleft corner
        y: 0,
        width: merger.width,
        height: merger.height,
        mute: true // we don't want sound from the screen (if there is any)
    });

    // Add the local stream. Position it on the bottom left and resize it to 100x100.
    merger.addStream(localStream, {
        x: 0,
        y: merger.height - 100,
        width: 100,
        height: 100,
        mute: false
      });

      // Add the remote stream. Position it on the bottom right and resize it to 100x100.
      merger.addStream(remoteStream, {
        x: merger.width-100,
        y: merger.height - 100,
        width: 100,
        height: 100,
        mute: false
      });

      merger.start();
      mergedStreamThree = merger.result;
      console.log("Merged stream object",mergedStreamThree);
      $videoPlayer.srcObject = null;
      $videoPlayer.srcObject = mergedStreamThree;
}