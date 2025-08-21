import React from 'react';
import { Activity } from 'lucide-react';

interface VitalReading {
  timestamp: Date;
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
}

interface VitalChartProps {
  vitals: VitalReading[];
}

const VitalChart: React.FC<VitalChartProps> = ({ vitals }) => {
  const chartHeight = 200;
  const chartWidth = 600;

  const getHeartRatePoints = () => {
    if (vitals.length === 0) return '';
    
    const minRate = Math.min(...vitals.map(v => v.heartRate));
    const maxRate = Math.max(...vitals.map(v => v.heartRate));
    const range = maxRate - minRate || 1;
    
    return vitals.map((vital, index) => {
      const x = (index / (vitals.length - 1)) * chartWidth;
      const y = chartHeight - ((vital.heartRate - minRate) / range) * (chartHeight - 40) - 20;
      return `${x},${y}`;
    }).join(' ');
  };

  const getOxygenPoints = () => {
    if (vitals.length === 0) return '';
    
    const minSat = Math.min(...vitals.map(v => v.oxygenSaturation));
    const maxSat = Math.max(...vitals.map(v => v.oxygenSaturation));
    const range = maxSat - minSat || 1;
    
    return vitals.map((vital, index) => {
      const x = (index / (vitals.length - 1)) * chartWidth;
      const y = chartHeight - ((vital.oxygenSaturation - minSat) / range) * (chartHeight - 40) - 20;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800">Vital Signs Monitoring</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heart Rate Chart */}
        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-800">Heart Rate</h4>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-slate-600">BPM</span>
            </div>
          </div>
          <div className="relative">
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="overflow-visible"
            >
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="0"
                  y1={i * (chartHeight / 4)}
                  x2={chartWidth}
                  y2={i * (chartHeight / 4)}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}
              
              {/* Heart rate line */}
              <polyline
                points={getHeartRatePoints()}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              
              {/* Data points */}
              {vitals.map((vital, index) => {
                const minRate = Math.min(...vitals.map(v => v.heartRate));
                const maxRate = Math.max(...vitals.map(v => v.heartRate));
                const range = maxRate - minRate || 1;
                const x = (index / (vitals.length - 1)) * chartWidth;
                const y = chartHeight - ((vital.heartRate - minRate) / range) * (chartHeight - 40) - 20;
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#ef4444"
                    className="hover:r-6 transition-all"
                  />
                );
              })}
            </svg>
          </div>
          <div className="mt-2 flex justify-between text-sm text-slate-600">
            <span>30 min ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Oxygen Saturation Chart */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-800">Oxygen Saturation</h4>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-slate-600">%</span>
            </div>
          </div>
          <div className="relative">
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="overflow-visible"
            >
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="0"
                  y1={i * (chartHeight / 4)}
                  x2={chartWidth}
                  y2={i * (chartHeight / 4)}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}
              
              {/* Oxygen saturation line */}
              <polyline
                points={getOxygenPoints()}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              
              {/* Data points */}
              {vitals.map((vital, index) => {
                const minSat = Math.min(...vitals.map(v => v.oxygenSaturation));
                const maxSat = Math.max(...vitals.map(v => v.oxygenSaturation));
                const range = maxSat - minSat || 1;
                const x = (index / (vitals.length - 1)) * chartWidth;
                const y = chartHeight - ((vital.oxygenSaturation - minSat) / range) * (chartHeight - 40) - 20;
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3b82f6"
                    className="hover:r-6 transition-all"
                  />
                );
              })}
            </svg>
          </div>
          <div className="mt-2 flex justify-between text-sm text-slate-600">
            <span>30 min ago</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      {/* Recent Readings Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h4 className="font-semibold text-slate-800">Recent Readings</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-4 text-slate-600 font-medium">Time</th>
                <th className="text-left p-4 text-slate-600 font-medium">Heart Rate</th>
                <th className="text-left p-4 text-slate-600 font-medium">O2 Saturation</th>
                <th className="text-left p-4 text-slate-600 font-medium">Temperature</th>
                <th className="text-left p-4 text-slate-600 font-medium">Blood Pressure</th>
              </tr>
            </thead>
            <tbody>
              {vitals.slice(-5).reverse().map((vital, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-slate-800">{vital.timestamp.toLocaleTimeString()}</td>
                  <td className="p-4">
                    <span className={`font-medium ${
                      vital.heartRate > 100 || vital.heartRate < 60 ? 'text-red-600' : 'text-slate-800'
                    }`}>
                      {Math.round(vital.heartRate)} BPM
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${
                      vital.oxygenSaturation < 95 ? 'text-red-600' : 'text-slate-800'
                    }`}>
                      {Math.round(vital.oxygenSaturation)}%
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${
                      vital.temperature > 100.4 || vital.temperature < 97 ? 'text-red-600' : 'text-slate-800'
                    }`}>
                      {vital.temperature.toFixed(1)}°F
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-800">
                    {Math.round(vital.bloodPressureSys)}/{Math.round(vital.bloodPressureDia)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VitalChart;