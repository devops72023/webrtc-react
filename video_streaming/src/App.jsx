import { useEffect, useRef, useState } from 'react'
import { Manager } from 'socket.io-client';
import './App.css';
const manager = new Manager('http://localhost:8080');

function App() {

  const socket = manager.socket('/')
  manager.open((err) => {
    if (err) {
      // an error has occurred
      console.log(err);
    } else {
      // the connection was successfully established
      console.log('connection established');
      console.log(socket)
    }
  });


  const local = useRef();
  const remote = useRef();
  const peer = useRef();
  const dataChan = useRef();
  const [ id, setId ] = useState('id');
  const [offerVisible, setOffreVisible] = useState(true);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [status, setStatus] = useState("Make a call now");
  

  useEffect(() => {
    
    socket.on('connection-success', socket => {
      setId(socket.socketId)
    })

    socket.on('sdp', data => {
      console.log(data);
      peer.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if(data.sdp.type === 'offer'){
        setOffreVisible(false)
        setAnswerVisible(true);
        setStatus(`${data.id} is calling...`);
      }else{
        setStatus('Call Established');
      }
    })

    socket.on('candidate', candidate => {
      peer.current.addIceCandidate(new RTCIceCandidate(candidate));
    })

    socket.on('closed', () => {
      setAnswerVisible(false);
      setOffreVisible(true)
      setStatus('Make a call')
      remote.current.srcObject = null;
    })

    const constraints = {
      video: true,
      audio: true,
    }
    try{
      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          local.current.srcObject = stream;

          stream.getTracks().forEach(track => {
            _pc.addTrack(track, stream);
          })
        })
      }
    catch(err){
      console.log(err)
    }

    const _pc = new RTCPeerConnection(null);
    _pc.onicecandidate = (e) => {
      if (e.candidate){
        sendToPeer('candidate', e.candidate)
      }
    }   
    _pc.onconnectionstatechange = (e) => {
      // Possible value for this are :
      //  1. Connected
      //  2. Disconnected
      //  3. Failed
      //  4. Closed
      console.log(e)
    }   
    _pc.ontrack = e => {
      // when the remote stream available
      remote.current.srcObject =  e.streams[0];
    }
    const dataChannel = _pc.createDataChannel('room1');
    dataChannel.onclose = () => {
      console.log('connection closed')
      socket.emit('closed');
    }

    dataChan.current = dataChannel
    peer.current = _pc
  }, []);

  const sendToPeer = (eventType, payload) => {
    socket.emit(eventType, payload)
  }
  
  const prcessSDP = (sdp) => {
    peer.current.setLocalDescription(sdp)
    // Sending the sdp to the server
    sendToPeer('sdp', { 'sdp':sdp, 'id':id });
  }
  const createOffer = ()=>{
    peer.current.createOffer({
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1,
    }).then(sdp => {
      prcessSDP(sdp, id)
      setOffreVisible(false);
      setStatus("Calling...");
    }).catch(err => console.log(err))
  }
  const createAnswer = ()=>{
    peer.current.createAnswer({
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1,
    }).then(sdp => {
      prcessSDP(sdp)
      setAnswerVisible(false);
      setStatus("Call established");
    }).catch(err => console.log(err))
  }

  const showHideButtons = ()=>{
    if(offerVisible){
      return (
        <div className="row">
          <div className="col gap">
            <button onClick={createOffer}>Create Offer</button>
          </div>
        </div>
      )
    }
    else if(answerVisible){
      return (
        <div className="row">
          <div className="col gap">
            <button onClick={createAnswer}>Answer Call</button>
          </div>
        </div>
      )
    }
    if(!offerVisible && !answerVisible){
      return (
        <div className="row">
          <div className="col gap">
            <button onClick={()=>{peer.current.close()}}>End call</button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className='container'>
      <div className="row">{ status }</div>
      <div className="row">
        <div className='col'>
            <h1>Local</h1>
            <video ref={local} controls autoPlay></video> 
        </div>
        <div className='col'>
          <h1>Remote</h1>
          <video ref={remote} controls autoPlay></video> 
        </div>
      </div>
      { showHideButtons() }
      {/* <div className="row">
        <div className="col gap">
          <button onClick={createOffer}>Create Offer</button>
          <button onClick={createAnswer}>Answer Offer</button>
        </div>
      </div> */}
    </div>
  )
}

export default App
