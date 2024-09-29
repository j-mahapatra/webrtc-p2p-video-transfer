import { useEffect, useRef, useState } from 'react';

export default function Receiver() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    const webSocket = new WebSocket(import.meta.env.VITE_BACKEND_URL);
    webSocket.onopen = () => {
      webSocket.send(JSON.stringify({ type: 'receiver' }));
    };
    setWs(webSocket);

    const peerConnection = new RTCPeerConnection();
    setPc(peerConnection);

    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        webSocket.send(
          JSON.stringify({ type: 'ice-candidate', data: event.candidate })
        );
      }
    };

    const remoteStream = new MediaStream();

    peerConnection.ontrack = (event: RTCTrackEvent) => {
      remoteStream.addTrack(event.track);
      if (videoRef.current) {
        videoRef.current.srcObject = remoteStream;
      }
    };

    webSocket.onmessage = async (event: MessageEvent) => {
      const payload = JSON.parse(event.data);

      if (payload.type === 'offer') {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(payload.data)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        webSocket.send(
          JSON.stringify({
            type: 'answer',
            data: peerConnection.localDescription,
          })
        );
      } else if (payload.type === 'ice-candidate') {
        await peerConnection.addIceCandidate(new RTCIceCandidate(payload.data));
      }
    };

    return () => {
      webSocket.close();
    };
  }, []);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    }
  };

  return (
    <div className='container'>
      <video ref={videoRef} controls className='video' />
      <button onClick={handlePlayVideo} className='button'>
        Receive Video Connection
      </button>
    </div>
  );
}
