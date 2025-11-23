
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Video, X, Zap, ScanLine, RotateCcw, Image as ImageIcon, RefreshCcw, Circle, Disc } from 'lucide-react';
import { getLiveTrafficAnalysis } from '../services/geminiService';

interface CameraCaptureProps {
  onCapture: (data: string | string[], type: 'image' | 'video') => void;
  isProcessing: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<'initial' | 'camera' | 'preview'>('initial');
  const [captureType, setCaptureType] = useState<'image' | 'video'>('image');
  const [previewMedia, setPreviewMedia] = useState<string | null>(null); // For image
  const [videoFrames, setVideoFrames] = useState<string[]>([]); // For video
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  // Real-time AI Overlay State
  const [liveAiEnabled, setLiveAiEnabled] = useState(false);
  const [liveOverlayText, setLiveOverlayText] = useState<string>("");

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      setStream(mediaStream);
      setMode('camera');
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setLiveAiEnabled(false);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Restart camera if facing mode changes while active
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    }
  }, [facingMode]);

  useEffect(() => {
    if (mode === 'camera' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
       // Cleanup handled by stopCamera or unmount
    };
  }, [mode, stream]);

  // Live AI Loop
  useEffect(() => {
    let interval: any;
    if (liveAiEnabled && mode === 'camera') {
      interval = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          // Capture small frame for analysis
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL('image/jpeg', 0.5);
            // Call fast AI
            const analysis = await getLiveTrafficAnalysis(frame);
            setLiveOverlayText(analysis);
          }
        }
      }, 2000); // Check every 2 seconds
    } else {
      setLiveOverlayText("");
    }
    return () => clearInterval(interval);
  }, [liveAiEnabled, mode]);

  // Capture Photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg');
        setPreviewMedia(imageSrc);
        setMode('preview');
        stopCamera();
      }
    }
  };

  // Record Video (Simulated by capturing frames every 500ms)
  const toggleRecording = () => {
    if (isRecording) {
      // Stop Recording
      setIsRecording(false);
      setMode('preview');
      stopCamera();
    } else {
      // Start Recording
      setIsRecording(true);
      setLiveAiEnabled(false); // Disable live AI while recording
      setVideoFrames([]);
      const interval = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const frame = canvas.toDataURL('image/jpeg', 0.5); // Low quality for performance
            setVideoFrames(prev => [...prev, frame]);
          }
        }
      }, 500); // Capture 2fps

      // Stop automatically after 5 seconds
      setTimeout(() => {
        clearInterval(interval);
        if (isRecording) { // Only stop if still recording
            setIsRecording(false);
            setMode('preview');
            stopCamera();
        }
      }, 5000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setCaptureType('image');
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewMedia(reader.result as string);
          setMode('preview');
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        setCaptureType('video');
        alert("For video analysis, please use the live recording feature for best results in this demo.");
      }
    }
  };

  const handleConfirm = () => {
    if (captureType === 'image' && previewMedia) {
      onCapture(previewMedia, 'image');
    } else if (captureType === 'video' && videoFrames.length > 0) {
      onCapture(videoFrames, 'video');
    }
  };

  const handleRetake = () => {
    setPreviewMedia(null);
    setVideoFrames([]);
    setMode('initial');
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {captureType === 'image' ? <Camera className="w-6 h-6 text-police-600" /> : <Video className="w-6 h-6 text-police-600" />}
          {captureType === 'image' ? 'Photo Capture' : 'Video Analysis'}
        </h2>
        
        {/* Only show top toggle if NOT in camera mode (as we have in-camera controls) */}
        {mode !== 'camera' && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => { setCaptureType('image'); setMode('initial'); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${captureType === 'image' ? 'bg-white shadow text-police-600' : 'text-gray-500'}`}
            >
              Photo
            </button>
            <button 
              onClick={() => { setCaptureType('video'); setMode('initial'); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${captureType === 'video' ? 'bg-white shadow text-police-600' : 'text-gray-500'}`}
            >
              Video
            </button>
          </div>
        )}
      </div>

      <div className="relative min-h-[400px] bg-gray-100 rounded-lg overflow-hidden flex flex-col items-center justify-center">
        {mode === 'initial' && (
          <div className="flex flex-col gap-4 text-center">
             <div className="mb-2 text-gray-500 max-w-xs mx-auto text-sm">
               {captureType === 'image' 
                 ? "Capture a clear photo of the vehicle and license plate." 
                 : "Record a short 5-second video clip to analyze driver behavior."}
             </div>
            <button 
              onClick={startCamera}
              className="flex items-center gap-2 bg-police-600 text-white px-6 py-3 rounded-lg hover:bg-police-800 transition shadow-lg font-medium mx-auto"
            >
              <Camera className="w-5 h-5" />
              Start Camera
            </button>
            <label className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition cursor-pointer font-medium mx-auto">
              <Upload className="w-5 h-5" />
              Upload {captureType === 'image' ? 'Image' : 'File'}
              <input type="file" accept={captureType === 'image' ? "image/*" : "video/*"} className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {mode === 'camera' && (
          <div className="relative w-full h-[500px] bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            {/* Live AI Overlay HUD */}
            {liveAiEnabled && (
               <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-[30px] border-black/20 m-4 rounded-xl flex items-center justify-center">
                     <div className="w-full h-0.5 bg-green-500/50 absolute top-1/2 animate-pulse"></div>
                     <div className="h-full w-0.5 bg-green-500/50 absolute left-1/2 animate-pulse"></div>
                  </div>
                  <div className="absolute top-8 left-8 bg-black/70 backdrop-blur-md text-green-400 p-3 rounded-lg border border-green-500/30 max-w-xs transition-all duration-300">
                     <div className="flex items-center gap-2 mb-1">
                        <ScanLine className="w-4 h-4 animate-spin-slow" />
                        <span className="text-xs font-bold tracking-widest uppercase">Live AI Analysis</span>
                     </div>
                     <p className="font-mono text-sm leading-tight">
                        {liveOverlayText || "Initializing sensor..."}
                     </p>
                  </div>
               </div>
            )}

            {/* TOP CONTROLS */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
               <button onClick={() => setMode('initial')} className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-sm">
                  <X className="w-5 h-5" />
               </button>
               <button 
                  onClick={() => setLiveAiEnabled(!liveAiEnabled)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border transition ${
                     liveAiEnabled 
                     ? 'bg-green-500/20 border-green-400 text-green-300' 
                     : 'bg-black/40 border-white/20 text-white/70 hover:bg-black/60'
                  }`}
               >
                  <Zap className={`w-5 h-5 ${liveAiEnabled ? 'fill-green-300' : ''}`} />
               </button>
            </div>

            {/* BOTTOM CONTROLS BAR */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col items-center gap-4">
               
               {/* Mode Switcher */}
               <div className="flex gap-6 text-sm font-bold mb-2">
                  <button 
                     onClick={() => setCaptureType('image')} 
                     className={`${captureType === 'image' ? 'text-yellow-400 border-b-2 border-yellow-400 pb-1' : 'text-white/60 hover:text-white'} transition`}
                  >
                     PHOTO
                  </button>
                  <button 
                     onClick={() => setCaptureType('video')} 
                     className={`${captureType === 'video' ? 'text-yellow-400 border-b-2 border-yellow-400 pb-1' : 'text-white/60 hover:text-white'} transition`}
                  >
                     VIDEO
                  </button>
               </div>

               {/* Action Buttons */}
               <div className="flex items-center justify-between w-full max-w-xs">
                  {/* Flip Camera */}
                  <button 
                     onClick={switchCamera}
                     className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition"
                  >
                     <RefreshCcw className="w-6 h-6" />
                  </button>

                  {/* Shutter Button */}
                  {captureType === 'image' ? (
                     <button 
                        onClick={capturePhoto}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-95 transition bg-transparent"
                     >
                        <div className="w-16 h-16 bg-white rounded-full"></div>
                     </button>
                  ) : (
                     <button 
                        onClick={toggleRecording}
                        className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-500' : 'border-white'} flex items-center justify-center hover:scale-95 transition bg-transparent`}
                     >
                        <div className={`w-16 h-16 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-600 scale-50 rounded-md' : 'bg-red-600'}`}></div>
                     </button>
                  )}

                  {/* Gallery / Upload Placeholder */}
                  <label className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition cursor-pointer">
                     <ImageIcon className="w-6 h-6" />
                     <input type="file" accept={captureType === 'image' ? "image/*" : "video/*"} className="hidden" onChange={handleFileUpload} />
                  </label>
               </div>

               {isRecording && (
                 <div className="absolute bottom-28 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-mono animate-pulse">
                   REC 00:0{Math.min(5, Math.floor(videoFrames.length / 2))}
                 </div>
               )}
            </div>
          </div>
        )}

        {mode === 'preview' && (
          <div className="relative w-full h-full min-h-[400px] flex items-center justify-center bg-black">
            {captureType === 'image' && previewMedia && (
              <img src={previewMedia} alt="Preview" className="max-w-full max-h-[400px] object-contain" />
            )}
            {captureType === 'video' && videoFrames.length > 0 && (
              <div className="text-white text-center">
                <Video className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-xl font-bold">{videoFrames.length} Frames Captured</p>
                <p className="text-sm text-gray-400 mt-2">Ready for Gemini Video Analysis</p>
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 p-4">
              {isProcessing ? (
                <div className="flex flex-col items-center text-white">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-lg">Analyzing Evidence...</p>
                  <p className="text-sm text-gray-300">Checking RTO Database & Visual Violations</p>
                </div>
              ) : (
                <>
                  <button onClick={handleRetake} className="bg-white/10 backdrop-blur text-white border border-white/30 px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition">
                    Discard
                  </button>
                  <button onClick={handleConfirm} className="bg-police-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-police-600/30 hover:bg-police-700 hover:scale-105 transition flex items-center gap-2">
                    <ScanLine className="w-5 h-5" />
                    Run Forensics
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraCapture;
