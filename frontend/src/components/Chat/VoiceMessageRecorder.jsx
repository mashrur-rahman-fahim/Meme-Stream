import React, { useState, useRef, useEffect } from "react";

const VoiceMessageRecorder = ({ onRecordingComplete, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Animate audio levels
      const updateAudioLevel = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average / 255 * 100);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const playRecording = () => {
    if (recordedBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = URL.createObjectURL(recordedBlob);
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const sendRecording = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob, recordingTime);
      onClose();
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setPlaybackTime(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder-modal">
      <style jsx>{`
        .voice-recorder-modal {
          width: 400px;
          background: linear-gradient(135deg, var(--chat-surface) 0%, rgba(var(--chat-surface), 0.95) 100%);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }

        .recorder-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 24px;
        }

        .recorder-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--chat-text);
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .close-button {
          background: none;
          border: none;
          color: rgba(var(--chat-text), 0.7);
          cursor: pointer;
          font-size: 24px;
          padding: 4px;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          color: var(--chat-text);
          transform: scale(1.1);
        }

        .recorder-content {
          text-align: center;
        }

        .recording-status {
          margin-bottom: 32px;
        }

        .status-text {
          font-size: 16px;
          color: var(--chat-text);
          margin-bottom: 8px;
          font-weight: 500;
        }

        .recording-time {
          font-size: 32px;
          font-weight: 700;
          color: ${isRecording ? '#EF4444' : 'var(--chat-primary)'};
          font-family: 'Courier New', monospace;
          margin-bottom: 16px;
          text-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }

        .audio-visualizer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          height: 60px;
          margin-bottom: 32px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 30px;
          padding: 0 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .visualizer-bar {
          width: 4px;
          background: linear-gradient(180deg, var(--chat-primary), var(--chat-secondary));
          border-radius: 2px;
          transition: height 0.1s ease;
          height: ${isRecording ? Math.max(8, audioLevel / 2) : 8}px;
          animation: ${isRecording ? 'pulse 1s ease-in-out infinite' : 'none'};
        }

        .visualizer-bar:nth-child(1) { animation-delay: 0s; }
        .visualizer-bar:nth-child(2) { animation-delay: 0.1s; }
        .visualizer-bar:nth-child(3) { animation-delay: 0.2s; }
        .visualizer-bar:nth-child(4) { animation-delay: 0.3s; }
        .visualizer-bar:nth-child(5) { animation-delay: 0.4s; }
        .visualizer-bar:nth-child(6) { animation-delay: 0.5s; }
        .visualizer-bar:nth-child(7) { animation-delay: 0.6s; }
        .visualizer-bar:nth-child(8) { animation-delay: 0.7s; }
        .visualizer-bar:nth-child(9) { animation-delay: 0.8s; }
        .visualizer-bar:nth-child(10) { animation-delay: 0.9s; }

        @keyframes pulse {
          0%, 100% {
            height: 8px;
            background: linear-gradient(180deg, var(--chat-primary), var(--chat-secondary));
          }
          50% {
            height: 40px;
            background: linear-gradient(180deg, #EF4444, #F97316);
          }
        }

        .main-control {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          background: ${isRecording ?
            'linear-gradient(135deg, #EF4444, #DC2626)' :
            'linear-gradient(135deg, var(--chat-primary), var(--chat-secondary))'
          };
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 0 auto 24px;
          box-shadow: 0 8px 32px rgba(var(--chat-primary), 0.3);
          position: relative;
          overflow: hidden;
        }

        .main-control:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(var(--chat-primary), 0.4);
        }

        .main-control:active {
          transform: scale(0.95);
        }

        .main-control.recording {
          animation: recordingPulse 2s ease-in-out infinite;
        }

        @keyframes recordingPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6), 0 0 0 20px rgba(239, 68, 68, 0.1);
          }
        }

        .control-icon {
          font-size: 32px;
          transition: all 0.2s ease;
        }

        .control-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
        }

        .action-button {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-button:hover {
          transform: translateY(-2px);
        }

        .action-button:active {
          transform: translateY(0);
        }

        .action-button.primary {
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          color: white;
          box-shadow: 0 4px 16px rgba(var(--chat-primary), 0.3);
        }

        .action-button.primary:hover {
          box-shadow: 0 8px 24px rgba(var(--chat-primary), 0.4);
        }

        .action-button.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: var(--chat-text);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .action-button.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .action-button.danger {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }

        .action-button.danger:hover {
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        }

        .playback-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin: 16px 0;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .play-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .play-button:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 16px rgba(var(--chat-primary), 0.3);
        }

        .waveform-display {
          flex: 1;
          height: 32px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 0 12px;
        }

        .waveform-bar-static {
          width: 3px;
          height: 16px;
          background: rgba(var(--chat-primary), 0.3);
          border-radius: 2px;
        }

        .waveform-bar-static:nth-child(odd) {
          height: 24px;
          background: rgba(var(--chat-primary), 0.5);
        }

        .duration-display {
          font-size: 12px;
          color: rgba(var(--chat-text), 0.7);
          font-family: 'Courier New', monospace;
          font-weight: 500;
        }

        .permission-message {
          text-align: center;
          padding: 32px;
          color: rgba(var(--chat-text), 0.7);
        }

        .permission-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .permission-text {
          font-size: 16px;
          margin-bottom: 24px;
        }

        .background-animation {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 40%, rgba(var(--chat-primary), 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(var(--chat-secondary), 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 40% 80%, rgba(var(--chat-accent), 0.1) 0%, transparent 50%);
          animation: backgroundFlow 10s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes backgroundFlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10px, -10px) scale(1.05); }
        }
      `}</style>

      <div className="background-animation"></div>

      <div className="recorder-header">
        <h3 className="recorder-title">Voice Message</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="recorder-content">
        {!recordedBlob ? (
          <>
            <div className="recording-status">
              <div className="status-text">
                {isRecording ? 'Recording...' : 'Ready to record'}
              </div>
              <div className="recording-time">{formatTime(recordingTime)}</div>
            </div>

            <div className="audio-visualizer">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="visualizer-bar"></div>
              ))}
            </div>

            <button
              className={`main-control ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              <span className="control-icon">
                {isRecording ? '⏹️' : '🎤'}
              </span>
            </button>

            {isRecording && (
              <div className="control-actions">
                <button className="action-button danger" onClick={stopRecording}>
                  <span>⏹️</span>
                  Stop
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="recording-status">
              <div className="status-text">Recording Complete</div>
              <div className="recording-time">{formatTime(recordingTime)}</div>
            </div>

            <div className="playback-controls">
              <button className="play-button" onClick={playRecording}>
                {isPlaying ? '⏸️' : '▶️'}
              </button>

              <div className="waveform-display">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="waveform-bar-static"></div>
                ))}
              </div>

              <div className="duration-display">
                {formatTime(Math.floor(playbackTime))}/{formatTime(recordingTime)}
              </div>
            </div>

            <div className="control-actions">
              <button className="action-button secondary" onClick={discardRecording}>
                <span>🗑️</span>
                Delete
              </button>
              <button className="action-button secondary" onClick={() => {
                discardRecording();
                startRecording();
              }}>
                <span>🔄</span>
                Re-record
              </button>
              <button className="action-button primary" onClick={sendRecording}>
                <span>📤</span>
                Send
              </button>
            </div>
          </>
        )}
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setPlaybackTime(e.target.currentTime)}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default VoiceMessageRecorder;