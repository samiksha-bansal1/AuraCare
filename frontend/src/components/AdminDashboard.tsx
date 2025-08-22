import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/api';
import AddPatientForm from './AddPatientForm';
import AddStaffForm from './AddStaffForm';
import AddFamilyMemberForm from './AddFamilyMemberForm';

interface Patient {
    id: string;
    patientId: string;
    name: string;
    age: number;
    condition: string;
    roomNumber: string;
    admissionDate: string;
    isActive: boolean;
}

interface Staff {
    id: string;
    staffId: string;
    name: string;
    email: string;
    role: 'doctor' | 'nurse' | 'admin';
    department: string;
    isActive: boolean;
}

interface FamilyMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    relationship: string;
    patientId: string;
    patientName: string;
    accessLevel: 'full' | 'limited';
    isApproved: boolean;
    lastLogin?: string;
}

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'patients' | 'staff' | 'family'>('patients');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddPatientForm, setShowAddPatientForm] = useState(false);
    const [showAddStaffForm, setShowAddStaffForm] = useState(false);
    const [showAddFamilyForm, setShowAddFamilyForm] = useState(false);

    useEffect(() => {
        if (user?.role === 'admin') {
            loadData();
        }
    }, [user, activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            switch (activeTab) {
                case 'patients':
                    const patientsData = await adminAPI.getPatients();
                    setPatients(patientsData);
                    break;
                case 'staff':
                    const staffData = await adminAPI.getStaff();
                    setStaff(staffData);
                    break;
                case 'family':
                    const familyData = await adminAPI.getFamilyMembers();
                    setFamilyMembers(familyData);
                    break;
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveFamilyMember = async (familyId: string) => {
        try {
            await adminAPI.approveFamilyMember(familyId);
            await loadData(); // Reload data
        } catch (err: any) {
            setError(err.message || 'Failed to approve family member');
        }
    };

    const handleDeactivateUser = async (userId: string, type: 'patient' | 'staff' | 'family') => {
        try {
            switch (type) {
                case 'patient':
                    await adminAPI.deactivatePatient(userId);
                    break;
                case 'staff':
                    await adminAPI.deactivateStaff(userId);
                    break;
                case 'family':
                    await adminAPI.deactivateFamilyMember(userId);
                    break;
            }
            await loadData(); // Reload data
        } catch (err: any) {
            setError(err.message || 'Failed to deactivate user');
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                    <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-2 text-gray-600">Manage patients, staff, and family members</p>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'patients', label: 'Patients', count: patients.length },
                            { id: 'staff', label: 'Staff', count: staff.length },
                            { id: 'family', label: 'Family Members', count: familyMembers.length },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.label}
                                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                            <div className="ml-auto pl-3">
                                <button
                                    onClick={() => setError(null)}
                                    className="inline-flex text-red-400 hover:text-red-500"
                                >
                                    <span className="sr-only">Dismiss</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="bg-white shadow rounded-lg">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading...</p>
                        </div>
                    ) : (
                        <div className="p-6">
                            {activeTab === 'patients' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold text-gray-900">Patients</h2>
                                        <button
                                            onClick={() => setShowAddPatientForm(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                        >
                                            Add Patient
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {patients.map((patient) => (
                                                    <tr key={patient.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.patientId}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.age}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.roomNumber}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.condition}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${patient.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {patient.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <button
                                                                onClick={() => handleDeactivateUser(patient.id, 'patient')}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                {patient.isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'staff' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold text-gray-900">Staff Members</h2>
                                        <button
                                            onClick={() => setShowAddStaffForm(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                        >
                                            Add Staff
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff ID</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {staff.map((staffMember) => (
                                                    <tr key={staffMember.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staffMember.staffId}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staffMember.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staffMember.email}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{staffMember.role}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staffMember.department}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${staffMember.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {staffMember.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <button
                                                                onClick={() => handleDeactivateUser(staffMember.id, 'staff')}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                {staffMember.isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'family' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold text-gray-900">Family Members</h2>
                                        <button
                                            onClick={() => setShowAddFamilyForm(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                        >
                                            Add Family Member
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Level</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {familyMembers.map((familyMember) => (
                                                    <tr key={familyMember.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{familyMember.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{familyMember.email}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{familyMember.phone}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{familyMember.relationship}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{familyMember.patientName}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{familyMember.accessLevel}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${familyMember.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {familyMember.isApproved ? 'Approved' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                            {!familyMember.isApproved && (
                                                                <button
                                                                    onClick={() => handleApproveFamilyMember(familyMember.id)}
                                                                    className="text-green-600 hover:text-green-900"
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeactivateUser(familyMember.id, 'family')}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                Deactivate
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Forms */}
            {showAddPatientForm && (
                <AddPatientForm
                    onSuccess={() => {
                        setShowAddPatientForm(false);
                        loadData();
                    }}
                    onCancel={() => setShowAddPatientForm(false)}
                />
            )}

            {showAddStaffForm && (
                <AddStaffForm
                    onSuccess={() => {
                        setShowAddStaffForm(false);
                        loadData();
                    }}
                    onCancel={() => setShowAddStaffForm(false)}
                />
            )}

            {showAddFamilyForm && (
                <AddFamilyMemberForm
                    onSuccess={() => {
                        setShowAddFamilyForm(false);
                        loadData();
                    }}
                    onCancel={() => setShowAddFamilyForm(false)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
