import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { socketService } from '../services/socket';
import { healthAPI } from '../services/api';

const IntegrationTest: React.FC = () => {
    const { user } = useAuth();
    const [backendStatus, setBackendStatus] = useState<string>('Checking...');
    const [socketStatus, setSocketStatus] = useState<string>('Disconnected');
    const [messages, setMessages] = useState<string[]>([]);
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        // Check backend health
        checkBackendHealth();

        // Set up Socket.IO listeners
        setupSocketListeners();

        return () => {
            // Cleanup socket listeners
            socketService.disconnect();
        };
    }, []);

    const checkBackendHealth = async () => {
        try {
            const response = await healthAPI.check();
            setBackendStatus(`Connected - ${response.status}`);
        } catch (error) {
            setBackendStatus('Disconnected');
        }
    };

    const setupSocketListeners = () => {
        const socket = socketService.getSocket();
        if (socket) {
            socket.on('connect', () => {
                setSocketStatus('Connected');
                addMessage('Socket.IO connected successfully');
            });

            socket.on('disconnect', () => {
                setSocketStatus('Disconnected');
                addMessage('Socket.IO disconnected');
            });

            socket.on('connect_error', (error) => {
                setSocketStatus('Connection Error');
                addMessage(`Socket.IO error: ${error.message}`);
            });

            // Listen for various real-time events
            socketService.onVitalSigns((data) => {
                addMessage(`Vital signs update: ${JSON.stringify(data)}`);
            });

            socketService.onCriticalAlert((data) => {
                addMessage(`Critical alert: ${JSON.stringify(data)}`);
            });

            socketService.onNewContent((data) => {
                addMessage(`New content received: ${JSON.stringify(data)}`);
            });

            socketService.onEmotionUpdate((data) => {
                addMessage(`Emotion update: ${JSON.stringify(data)}`);
            });
        }
    };

    const addMessage = (message: string) => {
        setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const sendTestMessage = () => {
        if (user?.type === 'nurse') {
            socketService.emitVitalSignsUpdate({
                patientId: 'test-patient',
                heartRate: 75,
                bloodPressure: '120/80',
                temperature: 98.6,
                timestamp: new Date().toISOString()
            });
            addMessage('Sent test vital signs update');
        } else if (user?.type === 'family') {
            socketService.emitShareContent({
                type: 'photo',
                url: 'https://example.com/test-photo.jpg',
                message: testMessage,
                timestamp: new Date().toISOString()
            });
            addMessage('Sent test content share');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Integration Test Dashboard</h2>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-blue-800">Backend Status</h3>
                    <p className={`text-sm ${backendStatus.includes('Connected') ? 'text-green-600' : 'text-red-600'}`}>
                        {backendStatus}
                    </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-green-800">Socket.IO Status</h3>
                    <p className={`text-sm ${socketStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                        {socketStatus}
                    </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-purple-800">User Role</h3>
                    <p className="text-sm text-purple-600 capitalize">{user?.type || 'Unknown'}</p>
                </div>
            </div>

            {/* Test Controls */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Test Controls</h3>

                {user?.type === 'nurse' && (
                    <div className="mb-4">
                        <button
                            onClick={sendTestMessage}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                        >
                            Send Test Vital Signs Update
                        </button>
                    </div>
                )}

                {user?.type === 'family' && (
                    <div className="mb-4">
                        <input
                            type="text"
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Enter test message..."
                            className="border border-gray-300 rounded px-3 py-2 mr-2 w-64"
                        />
                        <button
                            onClick={sendTestMessage}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                        >
                            Send Test Content
                        </button>
                    </div>
                )}

                <button
                    onClick={checkBackendHealth}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                    Refresh Backend Status
                </button>
            </div>

            {/* Real-time Messages */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4">Real-time Messages</h3>
                <div className="bg-white border rounded p-4 h-64 overflow-y-auto">
                    {messages.length === 0 ? (
                        <p className="text-gray-500 text-sm">No messages yet. Try sending a test message or wait for real-time updates.</p>
                    ) : (
                        <div className="space-y-2">
                            {messages.map((message, index) => (
                                <div key={index} className="text-sm text-gray-700 bg-gray-100 p-2 rounded">
                                    {message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setMessages([])}
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                >
                    Clear Messages
                </button>
            </div>
        </div>
    );
};

export default IntegrationTest;
