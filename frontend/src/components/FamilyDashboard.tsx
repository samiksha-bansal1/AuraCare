import React, { useState } from 'react';
import { LogOut, Upload, Image, Mic, Video, FileText, Activity, Heart, Thermometer, TrendingUp, Calendar, Play } from 'lucide-react';
import { User } from '../App';

interface FamilyDashboardProps {
  user: User;
  onLogout: () => void;
}

interface UploadedContent {
  id: string;
  type: 'photo' | 'voice' | 'video';
  title: string;
  uploadedAt: Date;
  size: string;
}

interface MedicalUpdate {
  id: string;
  type: 'medication' | 'progress' | 'report';
  title: string;
  description: string;
  timestamp: Date;
  author: string;
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ user, onLogout }) => {
  const [uploadedContent, setUploadedContent] = useState<UploadedContent[]>([
    { id: '1', type: 'photo', title: 'Family Vacation Photo', uploadedAt: new Date(Date.now() - 86400000), size: '2.3 MB' },
    { id: '2', type: 'voice', title: 'Good Morning Message', uploadedAt: new Date(Date.now() - 43200000), size: '1.2 MB' },
    { id: '3', type: 'video', title: 'Grandchildren Playing', uploadedAt: new Date(Date.now() - 21600000), size: '8.7 MB' },
  ]);

  const [newUpload, setNewUpload] = useState({ title: '', type: 'photo' as 'photo' | 'voice' | 'video' });

  // Simulated current vitals
  const currentVitals = {
    heartRate: 76,
    oxygenSaturation: 98,
    temperature: 98.6,
    bloodPressure: '120/80',
    status: 'Stable'
  };

  // Simulated medical updates
  const medicalUpdates: MedicalUpdate[] = [
    {
      id: '1',
      type: 'progress',
      title: 'Morning Assessment',
      description: 'Patient is responding well to treatment. Vital signs stable overnight.',
      timestamp: new Date(Date.now() - 10800000),
      author: 'Nurse Johnson'
    },
    {
      id: '2',
      type: 'medication',
      title: 'Medication Schedule Updated',
      description: 'Adjusted antibiotic dosage as per doctor\'s instructions.',
      timestamp: new Date(Date.now() - 14400000),
      author: 'Dr. Smith'
    },
    {
      id: '3',
      type: 'report',
      title: 'Lab Results Available',
      description: 'Blood work shows improvement in white cell count.',
      timestamp: new Date(Date.now() - 25200000),
      author: 'Lab Technician'
    }
  ];

  const handleFileUpload = () => {
    if (newUpload.title) {
      const newContent: UploadedContent = {
        id: Date.now().toString(),
        type: newUpload.type,
        title: newUpload.title,
        uploadedAt: new Date(),
        size: '2.1 MB'
      };
      setUploadedContent(prev => [newContent, ...prev]);
      setNewUpload({ title: '', type: 'photo' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Family Dashboard</h1>
            <p className="text-slate-600">{user.name} - Room {user.roomNumber}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Status Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Vitals */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-800">Current Status</h2>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">{currentVitals.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <Heart className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-1">Heart Rate</p>
                  <p className="text-xl font-bold text-slate-800">{currentVitals.heartRate}</p>
                  <p className="text-xs text-slate-500">BPM</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-1">O2 Saturation</p>
                  <p className="text-xl font-bold text-slate-800">{currentVitals.oxygenSaturation}</p>
                  <p className="text-xs text-slate-500">%</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <Thermometer className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-1">Temperature</p>
                  <p className="text-xl font-bold text-slate-800">{currentVitals.temperature}</p>
                  <p className="text-xs text-slate-500">°F</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-1">Blood Pressure</p>
                  <p className="text-xl font-bold text-slate-800">{currentVitals.bloodPressure}</p>
                  <p className="text-xs text-slate-500">mmHg</p>
                </div>
              </div>
            </div>

            {/* Medical Updates */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-6 h-6 text-slate-600" />
                <h2 className="text-xl font-semibold text-slate-800">Medical Updates</h2>
              </div>

              <div className="space-y-4">
                {medicalUpdates.map(update => (
                  <div key={update.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          update.type === 'progress' ? 'bg-green-500' :
                          update.type === 'medication' ? 'bg-blue-500' : 'bg-orange-500'
                        }`}></div>
                        <h3 className="font-semibold text-slate-800">{update.title}</h3>
                      </div>
                      <span className="text-xs text-slate-500">{update.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 mb-2">{update.description}</p>
                    <p className="text-sm text-slate-500">By: {update.author}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Upload Section */}
          <div className="space-y-6">
            {/* Upload New Content */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-slate-800">Share with Patient</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Content Title</label>
                  <input
                    type="text"
                    value={newUpload.title}
                    onChange={(e) => setNewUpload(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter a title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Content Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setNewUpload(prev => ({ ...prev, type: 'photo' }))}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                        newUpload.type === 'photo' 
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Image className="w-5 h-5 mb-1" />
                      <span className="text-xs">Photo</span>
                    </button>
                    <button
                      onClick={() => setNewUpload(prev => ({ ...prev, type: 'voice' }))}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                        newUpload.type === 'voice' 
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Mic className="w-5 h-5 mb-1" />
                      <span className="text-xs">Voice</span>
                    </button>
                    <button
                      onClick={() => setNewUpload(prev => ({ ...prev, type: 'video' }))}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                        newUpload.type === 'video' 
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Video className="w-5 h-5 mb-1" />
                      <span className="text-xs">Video</span>
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 mb-1">Drop files here or click to browse</p>
                  <p className="text-xs text-slate-500">Max file size: 10MB</p>
                </div>

                <button
                  onClick={handleFileUpload}
                  disabled={!newUpload.title}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Upload Content
                </button>
              </div>
            </div>

            {/* Uploaded Content History */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Uploads</h3>
              <div className="space-y-3">
                {uploadedContent.map(content => (
                  <div key={content.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        content.type === 'photo' ? 'bg-green-100' :
                        content.type === 'voice' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {content.type === 'photo' && <Image className="w-5 h-5 text-green-600" />}
                        {content.type === 'voice' && <Mic className="w-5 h-5 text-blue-600" />}
                        {content.type === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{content.title}</p>
                        <p className="text-sm text-slate-500">{content.uploadedAt.toLocaleDateString()} • {content.size}</p>
                      </div>
                    </div>
                    <Play className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-6 h-6 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-800">Recovery Timeline</h2>
          </div>
          
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
            <div className="space-y-6">
              {[
                { time: '3 hours ago', event: 'Vital signs improving', status: 'positive' },
                { time: '6 hours ago', event: 'Medication administered successfully', status: 'neutral' },
                { time: '12 hours ago', event: 'Patient responded well to family content', status: 'positive' },
                { time: '1 day ago', event: 'Initial treatment plan established', status: 'neutral' },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-6">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.status === 'positive' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'positive' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{item.event}</p>
                    <p className="text-sm text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyDashboard;