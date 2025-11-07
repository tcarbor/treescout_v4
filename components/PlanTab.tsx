// components/PlanTab.tsx
import React, { useMemo, useState, useEffect } from 'react';
import type { Property, RecTemplate, PlanItem, TargetSet } from '../types';
import PlanBoard from './ClientDetailMap';
import { PlusCircle, X, Save, Copy } from 'lucide-react';
import { useStore } from '../services/mockData';
import { AnimatePresence, motion } from 'framer-motion';
import CopyProgramModal from './CopyProgramModal';

const AddAnnualProgramModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    property: Property;
    planId: string;
}> = ({ isOpen, onClose, property, planId }) => {
    const { createAnnualProgram } = useStore();
    const [name, setName] = useState('');
    const [year, setYear] = useState(new Date().getFullYear() + 1);

    useEffect(() => {
        if(isOpen) {
            const nextYear = new Date().getFullYear() + 1;
            setYear(nextYear);
            setName(`${nextYear} Annual Care Program`);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (name.trim() && year) {
            createAnnualProgram({ propertyId: property.id, planId, year, name });
            onClose();
        } else {
            alert("Please provide a name and year.");
        }
    };
    
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[1005] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">New Annual RSA Program</h2>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Program Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Year</label>
                                <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                    {[0, 1, 2, 3].map(i => <option key={i} value={new Date().getFullYear() + i}>{new Date().getFullYear() + i}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3">Cancel</button>
                            <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md flex items-center disabled:bg-gray-400"><Save className="w-4 h-4 mr-2" />Create Program</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


const AddBudgetProgramModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    property: Property;
    planId: string;
}> = ({ isOpen, onClose, property, planId }) => {
    const { recTemplates, createBudgetProgram, createCustomBudgetProgram } = useStore();
    const [mode, setMode] = useState<'template' | 'custom'>('template');
    const [templateId, setTemplateId] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [totalBudget, setTotalBudget] = useState(5000);
    const [customName, setCustomName] = useState('');
    const [customCategory, setCustomCategory] = useState<'PHC' | 'Pruning' | 'Removal' | 'General'>('General');

    const budgetTemplates = useMemo(() => recTemplates.filter(t => t.unitBasis === 'budget'), [recTemplates]);

    useEffect(() => {
        if (isOpen && budgetTemplates.length > 0 && !templateId) {
            setTemplateId(budgetTemplates[0].id);
        }
    }, [isOpen, budgetTemplates, templateId]);

    const resetState = () => {
        setMode('template');
        setTemplateId(budgetTemplates.length > 0 ? budgetTemplates[0].id : '');
        setYear(new Date().getFullYear());
        setTotalBudget(5000);
        setCustomName('');
        setCustomCategory('General');
    };

    const handleSave = () => {
        if (mode === 'template') {
            if (!templateId || !year || !planId) {
                alert("Please select a budget type and year.");
                return;
            }
            createBudgetProgram({
                propertyId: property.id,
                planId,
                recTemplateId: templateId,
                year,
                totalBudget
            });
        } else {
            if (!customName.trim() || !year || !planId) {
                alert("Please provide a name and year for the custom budget.");
                return;
            }
            createCustomBudgetProgram({
                propertyId: property.id,
                planId,
                name: customName,
                category: customCategory,
                year,
                totalBudget,
            });
        }
        resetState();
        onClose();
    };
    
    const handleClose = () => {
        resetState();
        onClose();
    }
    
    const isSaveDisabled = mode === 'template' ? !templateId : !customName.trim();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[1005] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md"
                    >
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Add Budget Program</h2>
                            <button onClick={handleClose}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200 rounded-lg">
                                <button onClick={() => setMode('template')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${mode === 'template' ? 'bg-white shadow text-green-700' : 'text-gray-600'}`}>
                                    From Template
                                </button>
                                <button onClick={() => setMode('custom')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${mode === 'custom' ? 'bg-white shadow text-green-700' : 'text-gray-600'}`}>
                                    New Custom
                                </button>
                            </div>

                            {mode === 'template' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Budget Type</label>
                                    <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                        {budgetTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Custom Program Name</label>
                                        <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm" placeholder="e.g., 2025 Special Projects" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                        <select value={customCategory} onChange={e => setCustomCategory(e.target.value as any)} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                            <option>General</option>
                                            <option>PHC</option>
                                            <option>Pruning</option>
                                            <option>Removal</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year</label>
                                    <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                        {[0, 1, 2, 3].map(i => <option key={i} value={new Date().getFullYear() + i}>{new Date().getFullYear() + i}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total Budget</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input type="number" value={totalBudget} onChange={e => setTotalBudget(Number(e.target.value))} className="mt-1 block w-full p-2 pl-6 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3">Cancel</button>
                            <button onClick={handleSave} disabled={isSaveDisabled} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md flex items-center disabled:bg-gray-400"><Save className="w-4 h-4 mr-2" />Save</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


interface PlanTabProps {
    property: Property;
}

const PlanTab: React.FC<PlanTabProps> = ({ property }) => {
    const { planItems, plans } = useStore();
    const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);
    const [isAddAnnualProgramModalOpen, setIsAddAnnualProgramModalOpen] = useState(false);
    const [programToCopy, setProgramToCopy] = useState<PlanItem | null>(null);

    const currentPlan = useMemo(() => plans.find(p => p.propertyId === property.id), [plans, property.id]);

    const annualBudgets = useMemo(() => {
        if (!currentPlan) return {};

        const propertyPlanItems = planItems.filter(item => item.planId === currentPlan.id && item.status !== 'draft');
        
        const budgets: { [year: number]: number } = {};
        
        propertyPlanItems.forEach(item => {
            const year = item.schedule.year;
            
            if (item.isBudgetProgram || item.isRsaProgram) {
                if (!budgets[year]) budgets[year] = 0;
                
                if(item.isBudgetProgram) {
                    budgets[year] += item.totalBudget || 0;
                } else { // isRsaProgram
                     const containedItems = planItems.filter(pi => item.containedItemIds?.includes(pi.id));
                     const programBudget = containedItems.reduce((sum, ci) => sum + (ci.budget?.annualEstimate || 0), 0);
                     budgets[year] += programBudget;
                }

                return;
            }

            const perVisitPrice = item.budget?.perVisitPrice || 0;
            const template = useStore.getState().recTemplates.find(t => t.id === item.recTemplateId);
            const visits = template?.visitsPerYear || 1;
            const annualEstimate = perVisitPrice * visits;

            if (!budgets[year]) {
                budgets[year] = 0;
            }
            // Add contained items if their budget isn't already rolled up into a program budget
            if (!item.containerId) {
                 budgets[year] += annualEstimate;
            }
        });

        // Ensure all years in horizon have an entry
        for (let i = 0; i < (currentPlan.horizonYears || 1); i++) {
            const year = new Date().getFullYear() + i;
            if (!budgets[year]) {
                budgets[year] = 0;
            }
        }
        
        return budgets;

    }, [planItems, currentPlan]);


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">Care Plan Timeline & Budget</h2>
                 <div className="flex space-x-2">
                     <button onClick={() => setIsAddAnnualProgramModalOpen(true)} className="flex items-center text-sm font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add RSA Program
                     </button>
                     <button onClick={() => setIsAddBudgetModalOpen(true)} className="flex items-center text-sm font-semibold bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Budget
                     </button>
                 </div>
            </div>
            
            {currentPlan && (
                 <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.entries(annualBudgets).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([year, total]) => (
                            <div key={year} className="p-4 rounded-lg bg-white shadow-sm text-center">
                                <p className="text-sm font-semibold text-gray-500">{year} Budget</p>
                                <p className="text-2xl font-bold text-green-700 mt-1">${total.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                    <PlanBoard property={property} onCopyProgram={setProgramToCopy} />
                    <AddBudgetProgramModal 
                        isOpen={isAddBudgetModalOpen}
                        onClose={() => setIsAddBudgetModalOpen(false)}
                        property={property}
                        planId={currentPlan.id}
                    />
                    <AddAnnualProgramModal
                        isOpen={isAddAnnualProgramModalOpen}
                        onClose={() => setIsAddAnnualProgramModalOpen(false)}
                        property={property}
                        planId={currentPlan.id}
                    />
                    {programToCopy && (
                        <CopyProgramModal
                            isOpen={!!programToCopy}
                            onClose={() => setProgramToCopy(null)}
                            program={programToCopy}
                        />
                    )}
                 </>
            )}
        </div>
    )
};

export default PlanTab;