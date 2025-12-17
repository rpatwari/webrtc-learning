const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream, pc;
const ws = new WebSocket('ws://localhost:8090');

ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === 'offer') handleOffer(msg.body);
  if (msg.type === 'answer') handleAnswer(msg.body);
  if (msg.type === 'ice') handleIce(msg.body);
};

async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
}

async function call() {
  pc = new RTCPeerConnection();

  pc.onicecandidate = e => {
    if (e.candidate) {
      ws.send(JSON.stringify({ type:'ice', body: { data:e.candidate, channel:'main', id:'peer1' } }));
    }
  };

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.send(JSON.stringify({ type: 'offer', body: { data:offer, channel:'main', id:'peer1' } }));
}

async function handleOffer(offer) {
  pc = new RTCPeerConnection();
  pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
  pc.onicecandidate = e => {
    if (e.candidate) {
      ws.send(JSON.stringify({ type:'ice', body: { data:e.candidate, channel:'main', id:'peer2' } }));
    }
  };

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  ws.send(JSON.stringify({ type:'answer', body: { data:answer, channel:'main', id:'peer2' } }));
}

function handleAnswer(answer) {
  pc.setRemoteDescription(answer);
}

function handleIce(candidate) {
  pc.addIceCandidate(candidate);
}

document.getElementById('startBtn').onclick = start;
document.getElementById('callBtn').onclick = call;
