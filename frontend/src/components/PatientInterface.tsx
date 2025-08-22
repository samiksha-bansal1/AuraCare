import { useState, useEffect } from "react";
import VideoStream from './VideoStream';
import { useAuth } from '../contexts/AuthContext';

export default function AuraCareDashboard() {
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [vitals, setVitals] = useState({
    heartRate: 76,
    oxygen: 90,
    painLevel: 3,
  });
  const [lighting, setLighting] = useState("Normal");
  const [mood, setMood] = useState("Calm");
  const [photoIdx, setPhotoIdx] = useState(0);

  // Family photo (real family image)
  const familyPhotos = [
    {
      url: "https://images.pexels.com/photos/52553/pexels-photo-52553.jpeg?auto=compress&w=800&q=80",
      label: "Family Together",
    },
    {
      url: "https://images.pexels.com/photos/457235/pexels-photo-457235.jpeg?auto=compress&w=800&q=80",
      label: "Family Smiling",
    },
    {
      url: "https://images.pexels.com/photos/1682497/pexels-photo-1682497.jpeg?auto=compress&w=800&q=80",
      label: "Family Picnic",
    },
  ];

  // Calming nature video
  const familyVideos = [
    {
      url: "https://cdn.pixabay.com/video/2023/03/14/156661-816753646_large.mp4",
      label: "Flowing River",
    },
  ];

  // Calming nature audio (birds chirping)
  const familyAudios = [
    {
      url: "https://cdn.pixabay.com/audio/2022/10/16/audio_12b6c1b7c7.mp3",
      label: "Calming Nature: Birds Chirping",
    },
  ];

  // Carousel for photos
  useEffect(() => {
    const photoTimer = setInterval(() => {
      setPhotoIdx((idx) => (idx + 1) % familyPhotos.length);
    }, 5000);
    return () => clearInterval(photoTimer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVitals((prev) => ({
        heartRate: Math.max(60, Math.min(100, prev.heartRate + (Math.random() * 4 - 2))),
        oxygen: Math.max(85, Math.min(100, prev.oxygen + (Math.random() * 2 - 1))),
        painLevel: Math.max(0, Math.min(10, prev.painLevel + (Math.random() * 1 - 0.5))),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLightingChange = (moodType: string) => {
    setMood(moodType);
    setLighting(moodType === "Calm" ? "Soft White" : moodType === "Alert" ? "Bright White" : "Normal");
  };

  const handleQuickAction = (message: string): void => {
    const log = `${new Date().toLocaleTimeString()} - ${message}`;
    setLogs((prev: string[]) => [...prev, log]);
  };

  // Compute and persist active signaling room for nurse auto-join
  const computedRoomId: string | null = (() => {
    if (user?.type === 'patient' && (user as any)?.roomNumber) {
      return `room_${(user as any).roomNumber}`;
    }
    if (user?.type === 'patient' && user.patientId) {
      return `patient_${user.patientId}`;
    }
    return null;
  })();

  useEffect(() => {
    const key = 'auracare_active_room';
    try {
      if (computedRoomId) {
        localStorage.setItem(key, computedRoomId);
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
  }, [computedRoomId]);

  return (
    <div className="min-h-screen h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">AuraCare Ventilated Patient Dashboard</h1>
          <p className="text-indigo-700">Welcome, {user?.name || 'Patient'}</p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Sign Out
        </button>
      </header>

      <div className="flex flex-1 h-full overflow-hidden">
        {/* Left Side: Family Media & Lighting */}
        <div className="w-1/2 h-full bg-white p-6 rounded-2xl shadow flex flex-col justify-between overflow-hidden">
          <h2 className="text-xl font-bold mb-2">Family Media</h2>
          {/* Photos Section - Carousel */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Photos</h3>
            <div className="flex flex-col items-center">
              <img
                src={familyPhotos[photoIdx].url}
                alt={familyPhotos[photoIdx].label}
                className="rounded-lg w-40 h-40 object-cover shadow"
                style={{ objectFit: "cover" }}
              />
              <div className="text-center text-xs text-gray-700 mt-1 font-medium">{familyPhotos[photoIdx].label}</div>
            </div>
          </div>
          {/* Videos Section */}
          <div>
            <h3 className="text-lg font-semibold mb-2 mt-2">Videos</h3>
            <div className="flex flex-col items-center">
              <video
                src={familyVideos[0].url}
                controls
                className="rounded-lg w-full max-h-40 object-cover shadow"
                style={{ objectFit: "cover" }}
              />
              <div className="text-center text-xs text-gray-700 mt-1 font-medium">{familyVideos[0].label}</div>
            </div>
          </div>
          {/* Audio Section */}
          <div>
            <h3 className="text-lg font-semibold mb-2 mt-2">Voice Messages</h3>
            <div className="flex flex-col items-center">
              <audio src={familyAudios[0].url} controls autoPlay className="w-full" />
              <div className="text-center text-xs text-gray-700 mt-1 font-medium">{familyAudios[0].label}</div>
            </div>
          </div>
          {/* Lighting Control */}
          <div className="mt-2">
            <h2 className="text-lg font-semibold mb-2">Lighting Control</h2>
            <div className="flex gap-2 mb-2">
              {["Calm", "Alert", "Normal"].map((moodType) => (
                <button
                  key={moodType}
                  onClick={() => handleLightingChange(moodType)}
                  className={`px-3 py-1 rounded ${mood === moodType
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                    }`}
                >
                  {moodType}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Current Lighting: <span className="font-bold">{lighting}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Alerts, Quick Communication, Webcam, Vitals */}
        <div className="w-1/2 h-full flex flex-col justify-between p-6 overflow-hidden">
          {/* Top: Alerts & History */}
          <div className="bg-white p-4 rounded-2xl shadow mb-2" style={{ minHeight: "140px" }}>
            <h2 className="text-lg font-semibold mb-2 flex justify-between">
              Alerts & History
              <button
                onClick={() => setShowLogs(true)}
                className="text-blue-500 underline text-sm"
              >
                View Logs
              </button>
            </h2>
            <div className="flex flex-col gap-2">
              <div className="bg-red-50 p-2 rounded">
                <p><strong>CRITICAL:</strong> Low oxygen saturation: {Math.round(vitals.oxygen)}%</p>
                <small>{new Date().toLocaleString()}</small>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <p>Doctor completed rounds - all good</p>
                <small>{new Date().toLocaleString()}</small>
              </div>
            </div>
          </div>

          {/* Middle: Quick Communication */}
          <div className="bg-white p-4 rounded-2xl shadow mb-2" style={{ minHeight: "120px" }}>
            <h2 className="text-lg font-semibold mb-2">Quick Communication</h2>
            <div className="grid grid-cols-2 gap-2">
              {["I'm in pain", "I need water", "I need a nurse", "Time for medication"].map(
                (msg, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(msg)}
                    className="bg-gray-100 hover:bg-gray-200 p-2 rounded font-medium"
                  >
                    {msg}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Bottom: Live Publisher & Vitals */}
          <div className="flex gap-6 items-end" style={{ minHeight: "160px" }}>
            <div className="bg-white p-4 rounded-2xl shadow flex flex-col items-center w-1/2 h-full justify-center">
              {computedRoomId ? (
                <VideoStream role="publisher" roomId={computedRoomId} className="w-full" />
              ) : (
                <div className="rounded-lg border mb-2 w-full h-[180px] flex items-center justify-center text-sm text-gray-600">
                  Live stream requires patient login
                </div>
              )}
              <span className="text-sm text-gray-600 mt-2">Live Stream (Room-based)</span>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow flex flex-col justify-center min-w-[180px] w-1/2 h-full">
              <h2 className="text-lg font-semibold mb-2">Vitals</h2>
              <div className="flex flex-col gap-2">
                <div className="bg-red-100 p-2 rounded flex items-center gap-2">
                  <span role="img" aria-label="heart">❤️</span>
                  <span>{Math.round(vitals.heartRate)} BPM</span>
                </div>
                <div className="bg-blue-100 p-2 rounded flex items-center gap-2">
                  <span role="img" aria-label="oxygen">O₂</span>
                  <span>{Math.round(vitals.oxygen)}%</span>
                </div>
                <div className="bg-yellow-100 p-2 rounded flex items-center gap-2">
                  <span role="img" aria-label="pain">Pain:</span>
                  <span>{Math.round(vitals.painLevel)}/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-4">Logs</h2>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {logs.map((log, idx) => (
                <li key={idx} className="text-sm">{log}</li>
              ))}
            </ul>
            <button
              onClick={() => setShowLogs(false)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}