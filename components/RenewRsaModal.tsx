// components/RenewRsaModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../services/mockData';
import type { DisplayProgram, ProgramService } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, RefreshCw } from 'lucide-react';

const RenewRsaModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    program: DisplayProgram | null;
}> = ({ isOpen, onClose, program }) => {
    const { renewRsaServices, plans } = useStore();
    
    const [targetYear, setTargetYear] = useState(program ? program.year + 1 : new Date().getFullYear() + 1);
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (program) {
            setTargetYear(program.year + 1);
            // Default to all services selected
            setSelectedServices(new Set(program.services.map(s => `${s.template.serviceCode}-${s.targetSet.id}`)));
        }
    }, [program]);

    const plan = useMemo(() => {
        if (!program) return null;
        const propertyId = program.services[0]?.targetSet.propertyId;
        return plans.find(p => p.propertyId === propertyId);
    }, [program, plans]);


    if (!isOpen || !program) return null;

    const handleToggleService = (serviceKey: string) => {
        setSelectedServices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(serviceKey)) {
                newSet.delete(serviceKey);
            } else {
                newSet.add(serviceKey);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        if (!plan) return;
        const servicesToRenew = program.services.filter(s => selectedServices.has(`${s.template.serviceCode}-${s.targetSet.id}`));
        renewRsaServices({
            propertyId: plan.propertyId,
            planId: plan.id,
            targetYear: targetYear,
            services: servicesToRenew,
        });
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 z-[1005] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="bg-white rounded-lg shadow-xl w-full max-w-lg"
                >
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Renew Program: {program.category}
                        </h2>
                        <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                    </div>

                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <p>Renewing from <span className="font-semibold">{program.year}</span>. Select which services to include for the new year.</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Year</label>
                            <select value={targetYear} onChange={e => setTargetYear(parseInt(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                {[1, 2, 3].map(i => <option key={i} value={program.year + i}>{program.year + i}</option>)}
                            </select>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Included Services ({program.services.length})</h3>
                            <div className="space-y-2">
                                {program.services.map(service => {
                                    const serviceKey = `${service.template.serviceCode}-${service.targetSet.id}`;
                                    const isSelected = selectedServices.has(serviceKey);
                                    return (
                                        <div key={serviceKey} onClick={() => handleToggleService(serviceKey)} className={`p-3 rounded-lg border flex items-center cursor-pointer transition-colors ${isSelected ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                            <input type="checkbox" checked={isSelected} readOnly className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mr-4"/>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{service.template.name}</p>
                                                <p className="text-xs text-gray-500">{service.targetSet.name} ({service.targetSet.treeIds.length} trees)</p>
                                            </div>
                                            <p className="font-mono text-sm">${service.annualCost.toLocaleString()}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3">Cancel</button>
                        <button onClick={handleSave} disabled={selectedServices.size === 0} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md flex items-center disabled:bg-gray-400">
                            <Save className="w-4 h-4 mr-2" />
                            Renew {selectedServices.size} Service(s)
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RenewRsaModal;