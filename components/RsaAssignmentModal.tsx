// components/RsaAssignmentModal.tsx
import React, { useMemo } from 'react';
import { useStore } from '../services/mockData';
import type { Tree, RsaProgram } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Package, Target } from 'lucide-react';

const ToggleSwitch: React.FC<{ id: string, checked: boolean; onChange: (checked: boolean) => void; }> = ({ id, checked, onChange }) => (
    <label htmlFor={id} className="relative cursor-pointer">
        <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
    </label>
);


interface RsaAssignmentModalProps {
    isOpen: boolean;
    tree: Tree | null;
    onClose: () => void;
    onConfirm: (confirmationMessage: string) => void;
}

const RsaAssignmentModal: React.FC<RsaAssignmentModalProps> = ({ isOpen, tree, onClose, onConfirm }) => {
    const { planItems, recTemplates, targetSets, toggleTreeInRsaProgram } = useStore();

    const rsaPrograms = useMemo(() => {
        if (!tree) return [];
        const programMap = new Map<string, RsaProgram>();
        const propertyPlanItems = planItems.filter(p => p.propertyId === tree.propertyId && p.schedule.type === 'rsa');

        propertyPlanItems.forEach(item => {
            const template = recTemplates.find(t => t.serviceCode === item.serviceCode);
            if (!template || !item.targetSetId) return;

            const key = `${template.serviceCode}-${item.targetSetId}`;
            if (!programMap.has(key)) {
                programMap.set(key, {
                    id: key,
                    name: template.name,
                    propertyId: tree.propertyId,
                    serviceCode: template.serviceCode,
                    targetSetId: item.targetSetId,
                    planItemIds: []
                });
            }
            const program = programMap.get(key);
            if(program) {
                program.planItemIds.push(item.id);
            }
        });

        return Array.from(programMap.values());
    }, [planItems, recTemplates, tree]);

    const handleToggle = (program: RsaProgram) => {
        if (!tree) return;
        const { confirmation } = toggleTreeInRsaProgram(tree.id, program);
        onConfirm(confirmation);
    };

    if (!isOpen || !tree) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 z-[1001] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[90vh]"
                >
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center"><Package className="w-5 h-5 mr-2" />Assign to RSA Program</h2>
                        <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                    </div>
                    
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <p className="text-sm text-gray-600">
                            Add or remove <span className="font-bold">{tree.species}</span> from existing recurring service programs. Changes will automatically update program budgets.
                        </p>
                        
                        <div className="space-y-3">
                            {rsaPrograms.length > 0 ? rsaPrograms.map(program => {
                                const targetSet = targetSets.find(ts => ts.id === program.targetSetId);
                                const isMember = !!targetSet?.treeIds.includes(tree.id);

                                return (
                                    <div key={program.id} className="p-3 border rounded-lg flex justify-between items-center bg-gray-50">
                                        <div>
                                            <p className="font-semibold text-gray-800">{program.name}</p>
                                            <p className="text-xs text-gray-500 flex items-center mt-1"><Target className="w-3 h-3 mr-1.5"/>{targetSet?.name}</p>
                                        </div>
                                        <ToggleSwitch id={`rsa-toggle-${program.id}`} checked={isMember} onChange={(_checked) => handleToggle(program)} />
                                    </div>
                                );
                            }) : (
                                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                    <p className="text-gray-500">No recurring service programs (RSAs) have been scheduled for this property.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md">Done</button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RsaAssignmentModal;