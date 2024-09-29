import { useEffect, useRef, useState } from 'react';

export default function Sender() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_BACKEND_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'sender' }));
    };
    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const startVideoConnection = async () => {
    if (socket) {
      const peerConnection = new RTCPeerConnection();

      peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate);
          socket.send(
            JSON.stringify({ type: 'ice-candidate', data: event.candidate })
          );
        }
      };

      peerConnection.onnegotiationneeded = async () => {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log('Sending offer:', offer);
          socket.send(
            JSON.stringify({
              type: 'offer',
              data: peerConnection.localDescription,
            })
          );
        } catch (error) {
          console.error('Error during negotiation:', error);
        }
      };

      socket.onmessage = async (event: MessageEvent) => {
        const payload = JSON.parse(event.data);
        console.log('Received message from signaling server:', payload);

        if (payload.type === 'answer') {
          console.log('Setting remote description for answer:', payload.data);
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(payload.data)
          );
        } else if (payload.type === 'ice-candidate') {
          console.log('Adding ICE candidate:', payload.data);
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(payload.data)
          );
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log('Local stream obtained:', stream);

        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        document.body.appendChild(video);

        stream.getTracks().forEach((track) => {
          console.log('Adding track:', track);
          peerConnection.addTrack(track, stream);
        });
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }

      setPc(peerConnection);
    }
  };

  return (
    <div className='container'>
      <video ref={videoRef} controls className='video' />
      <button className='button' onClick={startVideoConnection}>
        Send Video Connection
      </button>
    </div>
  );
}
