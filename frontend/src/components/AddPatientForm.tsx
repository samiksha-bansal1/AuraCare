import React, { useMemo, useState } from 'react';
import { adminAPI } from '../services/api';

interface AddPatientFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

interface PatientFormData {
    patientId: string;
    name: string;
    age: number;
    condition: string;
    roomNumber: string;
}

const AddPatientForm: React.FC<AddPatientFormProps> = ({ onSuccess, onCancel }) => {
    const [formData, setFormData] = useState<PatientFormData>({
        patientId: '',
        name: '',
        age: 0,
        condition: '',
        roomNumber: '101'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFieldErrors({});

        try {
            const sanitized = {
                patientId: String(formData.patientId || '')
                    .trim()
                    .toUpperCase(),
                name: String(formData.name || '').trim(),
                age: Number(String(formData.age ?? '').replace(/[^0-9]/g, '')),
                condition: String(formData.condition || '').trim(),
                roomNumber: String(formData.roomNumber || '').replace(/[^0-9]/g, ''),
            };

            // simple client-side validation aligned with backend
            const errs: Record<string, string> = {};
            if (!sanitized.patientId) errs.patientId = 'Patient ID is required';
            if (!sanitized.name) errs.name = 'Full name is required';
            if (Number.isNaN(sanitized.age)) errs.age = 'Age must be a number';
            if (sanitized.age < 0 || sanitized.age > 150) errs.age = 'Age must be between 0 and 150';
            if (!sanitized.condition) errs.condition = 'Medical condition is required';
            if (!sanitized.roomNumber) errs.roomNumber = 'Room number is required';

            if (Object.keys(errs).length) {
                setFieldErrors(errs);
                throw new Error('Please correct the highlighted fields');
            }

            await adminAPI.addPatient(sanitized);
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Failed to add patient';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            let next: any = value;
            if (name === 'patientId') next = value.toUpperCase();
            if (name === 'age') next = value.replace(/[^0-9]/g, '');
            if (name === 'roomNumber') next = value.replace(/[^0-9]/g, '');
            return { ...prev, [name]: next } as PatientFormData;
        });
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
    };

    const isSubmitDisabled = useMemo(() => {
        return (
            loading ||
            !formData.patientId ||
            !formData.name ||
            !String(formData.age) ||
            !formData.condition ||
            !formData.roomNumber
        );
    }, [loading, formData]);

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Add New Patient</h3>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="patientId" className="block text-sm font-medium text-gray-700">
                                Patient ID *
                            </label>
                            <input
                                type="text"
                                id="patientId"
                                name="patientId"
                                value={formData.patientId}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., PAT001"
                            />
                            {fieldErrors.patientId && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.patientId}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Patient's full name"
                            />
                            {fieldErrors.name && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                                Age *
                            </label>
                            <input
                                type="number"
                                id="age"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                required
                                min="0"
                                max="150"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Age in years"
                            />
                            {fieldErrors.age && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.age}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                                Medical Condition *
                            </label>
                            <input
                                type="text"
                                id="condition"
                                name="condition"
                                value={formData.condition}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Post-op recovery"
                            />
                            {fieldErrors.condition && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.condition}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700">
                                Room Number *
                            </label>
                            <select
                                id="roomNumber"
                                name="roomNumber"
                                value={formData.roomNumber}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                {Array.from({ length: 20 }, (_, i) => 101 + i).map(room => (
                                    <option key={room} value={room.toString()}>
                                        Room {room}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.roomNumber && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors.roomNumber}</p>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Adding...' : 'Add Patient'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddPatientForm;
