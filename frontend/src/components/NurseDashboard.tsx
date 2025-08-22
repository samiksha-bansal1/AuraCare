import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, AlertTriangle, CheckCircle, Activity, Heart, Thermometer, Calendar, Upload, FileText, X, Download, Bell } from 'lucide-react';
import type { User } from '../contexts/AuthContext';
import { nurseAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { socketService } from '../services/socket';

import VitalChart from './VitalChart';
import VideoStream from './VideoStream';

interface NurseDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Alert {
  id: string;
  type: 'vital' | 'patient_request' | 'emotional';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  resolved: boolean;
}

interface VitalReading {
  timestamp: Date;
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
}

interface Patient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  age: number;
  condition: string;
  roomNumber: string;
  admissionDate: string;
}

interface ProgressNote {
  _id: string;
  patientId: string;
  author: {
    id: string;
    name: string;
    model: string;
  };
  text: string;
  visibility: 'staff' | 'family';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface MediaDocument {
  _id: string;
  patientId: string;
  title: string;
  type: string;
  storage: {
    kind: string;
    key: string;
    mime: string;
    size: number;
  };
  uploadedBy: string;
  createdAt: string;
}

const NurseDashboard: React.FC<NurseDashboardProps> = ({ user, onLogout }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [selectedSection, setSelectedSection] = useState<'vitals' | 'alerts' | 'medical' | 'history'>('vitals');
  const [patientCode, setPatientCode] = useState<string>('');
  const [autoRoom, setAutoRoom] = useState<string>('');

  // Medical Records state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [documents, setDocuments] = useState<MediaDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'staff' | 'family'>('staff');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  // Upload progress tracking for future enhancement
  // const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState(false);

  // Load patients on component mount
  useEffect(() => {
    fetchPatients();
  }, []);

  // Load patient data when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient);
    }
  }, [selectedPatient]);

  // Auto-detect active room from localStorage so nurse can auto-join
  useEffect(() => {
    const key = 'auracare_active_room';
    try {
      const existing = localStorage.getItem(key) || '';
      setAutoRoom(existing);
      if (existing) {
        const normalized = existing.replace(/^\w+_/, '');
        setPatientCode((prev) => prev || normalized);
      }
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        const value = e.newValue || '';
        setAutoRoom(value);
        if (value) {
          const normalized = value.replace(/^\w+_/, '');
          setPatientCode((prev) => prev || normalized);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Set up socket connection and event listeners
  useEffect(() => {
    // Connect to socket when component mounts
    socketService.connect();
    
    // Clean up on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Simulate real-time data
  useEffect(() => {
    // Generate initial vital signs
    const generateVitals = () => {
      const now = new Date();
      const readings: VitalReading[] = [];

      for (let i = 30; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60000); // Every minute
        readings.push({
          timestamp,
          heartRate: 70 + Math.random() * 20,
          oxygenSaturation: 95 + Math.random() * 4,
          temperature: 98.0 + Math.random() * 2,
          bloodPressureSys: 110 + Math.random() * 20,
          bloodPressureDia: 70 + Math.random() * 10
        });
      }
      setVitals(readings);
    };

    // Generate sample alerts
    const generateAlerts = () => {
      const sampleAlerts: Alert[] = [
        {
          id: '1',
          type: 'patient_request',
          message: 'Patient requests water',
          severity: 'low',
          timestamp: new Date(Date.now() - 300000),
          resolved: false
        },
        {
          id: '2',
          type: 'vital',
          message: 'Heart rate spike detected (95 BPM)',
          severity: 'medium',
          timestamp: new Date(Date.now() - 120000),
          resolved: false
        },
        {
          id: '3',
          type: 'emotional',
          message: 'Signs of distress detected - comfort content auto-played',
          severity: 'low',
          timestamp: new Date(Date.now() - 600000),
          resolved: true
        }
      ];
      setAlerts(sampleAlerts);
    };

    generateVitals();
    generateAlerts();

    // Simulate real-time updates
    const vitalInterval = setInterval(() => {
      setVitals(prev => {
        const newReading: VitalReading = {
          timestamp: new Date(),
          heartRate: 70 + Math.random() * 20,
          oxygenSaturation: 95 + Math.random() * 4,
          temperature: 98.0 + Math.random() * 2,
          bloodPressureSys: 110 + Math.random() * 20,
          bloodPressureDia: 70 + Math.random() * 10
        };
        return [...prev.slice(-29), newReading];
      });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(vitalInterval);
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      setError(null);
      console.log('🔍 Fetching patients...');
      
      // Debug: Check if we have a token
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
      
      const patients = await nurseAPI.getPatients();
      console.log('✅ Patients fetched successfully:', patients.length);
      setPatients(patients);
      
      if (patients.length === 0) {
        setError('No patients found. Please contact your administrator to add patients to the system.');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch patients:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log out and log back in.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You may not have the required permissions to view patients.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please contact your administrator or try again later.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        setError('Cannot connect to server. Please ensure the backend server is running on port 5000.');
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to fetch patients. Please try again.');
      }
    }
  }, []);

  const loadPatientData = async (patientId: string) => {
    try {
      setLoading(true);
      const [notesData, documentsData] = await Promise.all([
        nurseAPI.getPatientNotes(patientId).catch(() => []),
        nurseAPI.getPatientDocuments(patientId).catch(() => [])
      ]);

      setNotes(notesData);
      setDocuments(documentsData.data || documentsData);
    } catch (err) {
      console.error('Error loading patient data:', err);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!noteText.trim() || !selectedPatient) return;

    try {
      setLoading(true);
      console.log('🔍 Creating note for patient:', selectedPatient);
      console.log('📝 Note data:', { text: noteText, visibility: noteVisibility });
      console.log('🌐 API URL will be:', `http://localhost:5000/api/patients/${selectedPatient}/notes`);
      
      await nurseAPI.createPatientNote(selectedPatient, {
        text: noteText,
        visibility: noteVisibility
      });

      console.log('✅ Note created successfully');
      // Reset form
      setNoteText('');
      setShowNoteForm(false);
      loadPatientData(selectedPatient);
    } catch (error: any) {
      console.error('❌ Failed to create note:', error);
      console.error('❌ Error response:', error.response);
      setError(error.response?.data?.error || error.message || 'Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedPatient) return;

    try {
      setIsUploading(true);
      console.log('🔍 Uploading file for patient:', selectedPatient);
      console.log('📁 File details:', { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type });
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', uploadDescription);
      formData.append('title', selectedFile.name);
      formData.append('type', uploadDescription || selectedFile.type);

      await nurseAPI.uploadDocument(selectedPatient, formData);

      console.log('✅ File uploaded successfully');
      setSelectedFile(null);
      setUploadDescription('');
      loadPatientData(selectedPatient);
    } catch (error: any) {
      console.error('❌ Failed to upload file:', error);
      console.error('❌ Error response:', error.response);
      setError(error.response?.data?.error || error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  const currentVitals = vitals[vitals.length - 1] || null;

  const { sendAlert } = useNotifications();
  
  // Test notification function (can be removed in production)
  const testNotification = () => {
    sendAlert(
      'TEST123', 
      'This is a test notification from the system', 
      'info'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nurse Dashboard</h1>
            <p className="text-slate-600">{user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={testNotification}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="Test Notification"
            >
              <Bell className="w-5 h-5" />
              Test Alert
            </button>
            <a
              href="/test"
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Activity className="w-5 h-5" />
              Integration Test
            </a>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Live Video Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800">Live Patient Monitoring</h2>
                <div className="flex items-center gap-3">
                  <input
                    placeholder={autoRoom ? `Auto-detected: ${autoRoom}` : "Enter Room (e.g., 101A) or Patient Code (e.g., P001)"}
                    value={patientCode}
                    onChange={(e) => setPatientCode(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-slate-600">LIVE</span>
                  </div>
                </div>
              </div>
              {autoRoom || patientCode ? (
                <VideoStream
                  role="viewer"
                  roomId={`${(autoRoom || '').startsWith('room_') || (autoRoom || '').startsWith('patient_') ? autoRoom : `${/^[Pp]/.test(patientCode.trim()) ? 'patient' : 'room'}_${patientCode.trim()}`}`}
                  className="w-full"
                />
              ) : (
                <div className="relative bg-slate-900 rounded-xl overflow-hidden text-white flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                  <span className="text-slate-300">Enter a patient code to start viewing the live stream</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats & Alerts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vital Signs Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Current Vitals</h3>
              {currentVitals && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Heart className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Heart Rate</p>
                      <p className="font-semibold text-slate-800">{Math.round(currentVitals.heartRate)} BPM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">O2 Saturation</p>
                      <p className="font-semibold text-slate-800">{Math.round(currentVitals.oxygenSaturation)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Thermometer className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Temperature</p>
                      <p className="font-semibold text-slate-800">{currentVitals.temperature.toFixed(1)}°F</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Blood Pressure</p>
                      <p className="font-semibold text-slate-800">
                        {Math.round(currentVitals.bloodPressureSys)}/{Math.round(currentVitals.bloodPressureDia)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active Alerts */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Active Alerts</h3>
              <div className="space-y-3">
                {alerts.filter(alert => !alert.resolved).map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-4 ${alert.severity === 'high'
                        ? 'bg-red-50 border-red-500'
                        : alert.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`w-4 h-4 ${alert.severity === 'high'
                              ? 'text-red-600'
                              : alert.severity === 'medium'
                                ? 'text-yellow-600'
                                : 'text-blue-600'
                            }`} />
                          <span className="text-sm font-medium text-slate-800">{alert.message}</span>
                        </div>
                        <p className="text-xs text-slate-600">{alert.timestamp.toLocaleTimeString()}</p>
                      </div>
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="ml-2 p-1 hover:bg-white rounded transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                ))}
                {alerts.filter(alert => !alert.resolved).length === 0 && (
                  <p className="text-slate-500 text-center py-4">No active alerts</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="mt-6">
          {/* Section Navigation */}
          <div className="bg-white rounded-t-2xl shadow-lg">
            <div className="flex border-b border-slate-200">
              {[
                { key: 'vitals', label: 'Vital Signs', icon: Activity },
                { key: 'alerts', label: 'Alert History', icon: AlertTriangle },
                { key: 'medical', label: 'Medical Records', icon: FileText },
                { key: 'history', label: 'Patient History', icon: Calendar }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedSection(key as any)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${selectedSection === key
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-b-2xl shadow-lg p-6">
            {selectedSection === 'vitals' && (
              <VitalChart vitals={vitals} />
            )}

            {selectedSection === 'alerts' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">All Alerts</h3>
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${alert.resolved ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`w-5 h-5 ${alert.resolved ? 'text-slate-400' :
                              alert.severity === 'high' ? 'text-red-600' :
                                alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                            }`} />
                          <div>
                            <p className={`font-medium ${alert.resolved ? 'text-slate-600' : 'text-slate-800'}`}>
                              {alert.message}
                            </p>
                            <p className="text-sm text-slate-500">{alert.timestamp.toLocaleString()}</p>
                          </div>
                        </div>
                        {alert.resolved && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSection === 'medical' && (
              <div className="space-y-6">
                {/* Patient Selection */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">Medical Management</h3>
                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Patient</option>
                      {patients.map(patient => (
                        <option key={patient._id} value={patient._id}>
                          {patient.name} - Room {patient.roomNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowNoteForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Add Note
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Upload Document
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4,.wav"
                      />
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-red-600 hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {selectedPatient && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Documents Section */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-800">Recent Documents</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {documents.length > 0 ? (
                          documents.map(doc => (
                            <div key={doc._id} className="p-3 border border-slate-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-slate-800">{doc.title}</p>
                                  <p className="text-sm text-slate-600">
                                    {doc.type} • {new Date(doc.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <button className="text-blue-600 hover:text-blue-800">
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 text-center py-4">No documents uploaded</p>
                        )}
                      </div>
                    </div>

                    {/* Progress Notes Section */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-800">Progress Notes</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notes.length > 0 ? (
                          notes.map(note => (
                            <div key={note._id} className="p-3 border border-slate-200 rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  note.visibility === 'family' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {note.visibility === 'family' ? 'Family Visible' : 'Staff Only'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-slate-800 text-sm">{note.text}</p>
                              <p className="text-xs text-slate-500 mt-1">By: {note.author.name}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 text-center py-4">No notes available</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Note Creation Modal */}
                {showNoteForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Add Progress Note</h3>
                        <button
                          onClick={() => setShowNoteForm(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Visibility
                          </label>
                          <select
                            value={noteVisibility}
                            onChange={(e) => setNoteVisibility(e.target.value as 'staff' | 'family')}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="staff">Staff Only</option>
                            <option value="family">Visible to Family</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Note Text
                          </label>
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter progress note..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateNote}
                            disabled={!noteText.trim() || loading}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Saving...' : 'Save Note'}
                          </button>
                          <button
                            onClick={() => setShowNoteForm(false)}
                            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* File Upload Modal */}
                {selectedFile && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Upload Document</h3>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-slate-600">Selected file:</p>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Description (optional)
                          </label>
                          <input
                            type="text"
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter description..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleFileUpload}
                            disabled={isUploading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploading ? 'Uploading...' : 'Upload'}
                          </button>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedSection === 'history' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Patient History</h3>
                <div className="space-y-3">
                  {[
                    { time: '2 hours ago', event: 'Medication administered - Antibiotics' },
                    { time: '4 hours ago', event: 'Vital signs checked - Normal ranges' },
                    { time: '6 hours ago', event: 'Family content auto-played due to stress detection' },
                    { time: '8 hours ago', event: 'Patient requested water - Fulfilled' },
                  ].map((entry, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-slate-800">{entry.event}</p>
                        <p className="text-sm text-slate-600">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseDashboard;