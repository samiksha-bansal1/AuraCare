import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Heart, Shield, Users, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'patient' | 'nurse' | 'family' | 'admin'>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    let isValid = false;
    let credentials: any = {};

    switch (userType) {
      case 'patient':
        isValid = Boolean(formData.id && formData.name);
        if (isValid) {
          credentials = {
            type: 'patient',
            id: formData.id,
            name: formData.name,
          };
        }
        break;

      case 'nurse': // staff
        isValid = Boolean(formData.id && formData.password);
        if (isValid) {
          credentials = {
            type: 'nurse',
            email: formData.id, // ✅ backend expects email
            password: formData.password,
          };
        }
        break;

      case 'family':
        isValid = Boolean(formData.name && formData.password);
        if (isValid) {
          credentials = {
            type: 'family',
            email: formData.name, // ✅ backend expects email
            password: formData.password,
          };
        }
        break;

      case 'admin':
        isValid = Boolean(formData.id && formData.password);
        if (isValid) {
          credentials = {
            type: 'admin',
            email: formData.id, // Email field
            password: formData.password,
          };
        }
        break;
    }

    if (isValid) {
      try {
        await login(credentials);
        // Ensure redirect after successful login
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Login error:', error);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData({ name: '', id: '', password: '' });
    clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Aura Care</h1>
          <p className="text-slate-600">Remote Patient Monitoring & Support</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* User Type Selection */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setUserType('patient');
                resetForm();
              }}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${userType === 'patient'
                ? 'bg-blue-100 text-blue-600 border-2 border-blue-200'
                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                }`}
            >
              <User className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Patient</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('nurse');
                resetForm();
              }}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${userType === 'nurse'
                ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-200'
                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                }`}
            >
              <Shield className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Nurse</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('family');
                resetForm();
              }}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${userType === 'family'
                ? 'bg-orange-100 text-orange-600 border-2 border-orange-200'
                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                }`}
            >
              <Users className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Family</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('admin');
                resetForm();
              }}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${userType === 'admin'
                ? 'bg-purple-100 text-purple-600 border-2 border-purple-200'
                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                }`}
            >
              <Shield className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Admin</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Form */}
            {userType === 'patient' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Patient ID *
                  </label>
                  <input
                    type="text"
                    name="id"
                    value={formData.id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Patient ID"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Patient Name"
                    required
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {/* Nurse Form */}
            {userType === 'nurse' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="id"
                    value={formData.id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Email"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                      placeholder="Enter Password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Family Form */}
            {userType === 'family' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Email"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                      placeholder="Enter Password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Admin Form */}
            {userType === 'admin' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="id"
                    value={formData.id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Email"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                      placeholder="Enter Password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
