// components/BulkRsaAssignmentDrawer.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../services/mockData';
import type { RsaProgram, Tree } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Users, Package, Target, PlusCircle, MinusCircle } from 'lucide-react';

const ProgramCard: React.FC<{
    program: RsaProgram;
    isFocused: boolean;
    onFocus: () => void;
    onAdd: (treesToAdd: string[]) => void;
    onRemove: (treesToRemove: string[]) => void;
    workingSelection: Set<string>;
}> = ({ program, isFocused, onFocus, onAdd, onRemove, workingSelection }) => {
    const { targetSets } = useStore();
    const targetSet = useMemo(() => targetSets.find(ts => ts.id === program.targetSetId), [targetSets, program.targetSetId]);
    
    const { inProgramCount, treesToAdd, treesToRemove } = useMemo(() => {
        if (!targetSet) return { inProgramCount: 0, treesToAdd: [], treesToRemove: [] };
        
        const programMembers = new Set(targetSet.treeIds);
        let count = 0;
        const toAdd: string[] = [];
        const toRemove: string[] = [];

        workingSelection.forEach(treeId => {
            if (programMembers.has(treeId)) {
                count++;
                toRemove.push(treeId);
            } else {
                toAdd.push(treeId);
            }
        });
        return { inProgramCount: count, treesToAdd: toAdd, treesToRemove: toRemove };
    }, [targetSet, workingSelection]);

    return (
        <div 
            className={`border rounded-lg transition-all duration-200 ${isFocused ? 'bg-white shadow-lg border-green-500 ring-2 ring-green-500' : 'bg-gray-50 hover:bg-white hover:shadow-md'}`}
        >
            <div className="p-4 cursor-pointer" onClick={onFocus}>
                <h3 className="font-bold text-gray-800">{program.name}</h3>
                <p className="text-sm text-gray-500 flex items-center mt-1"><Target className="w-4 h-4 mr-2"/>{targetSet?.name}</p>
                <div className="mt-3 text-sm font-semibold">
                    <span className="text-green-700">{inProgramCount} of {workingSelection.size}</span> selected trees are in this program.
                </div>
            </div>
            {isFocused && (
                <div className="px-4 pb-4 border-t-2 border-dashed space-y-2">
                    <button 
                        onClick={() => onAdd(treesToAdd)}
                        disabled={treesToAdd.length === 0}
                        className="w-full flex items-center justify-center px-3 py-2 text-sm font-semibold text-green-800 bg-green-100 rounded-md hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add {treesToAdd.length} Trees to Program
                    </button>
                    <button
                        onClick={() => onRemove(treesToRemove)}
                        disabled={treesToRemove.length === 0}
                        className="w-full flex items-center justify-center px-3 py-2 text-sm font-semibold text-red-800 bg-red-100 rounded-md hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                        <MinusCircle className="w-4 h-4 mr-2" />
                        Remove {treesToRemove.length} Trees from Program
                    </button>
                </div>
            )}
        </div>
    );
};

interface BulkRsaAssignmentDrawerProps {
    propertyId: string;
    onSetToast: (message: string) => void;
    onProgramFocus: (program: RsaProgram | null) => void;
}

const BulkRsaAssignmentDrawer: React.FC<BulkRsaAssignmentDrawerProps> = ({ propertyId, onSetToast, onProgramFocus }) => {
    const { isBulkAssigningRsa, setIsBulkAssigningRsa, bulkRsaWorkingTreeIds, planItems, recTemplates, targetSets, toggleTreesInRsaProgram } = useStore();
    const [focusedProgramId, setFocusedProgramId] = useState<string | null>(null);

    const workingSelection = useMemo(() => new Set(bulkRsaWorkingTreeIds), [bulkRsaWorkingTreeIds]);

    const rsaPrograms = useMemo(() => {
        const programMap = new Map<string, RsaProgram>();
        const propertyPlanItems = planItems.filter(p => p.propertyId === propertyId && p.schedule.type === 'rsa');

        propertyPlanItems.forEach(item => {
            const template = recTemplates.find(t => t.serviceCode === item.serviceCode);
            if (!template || !item.targetSetId) return;

            const key = `${template.serviceCode}-${item.targetSetId}`;
            if (!programMap.has(key)) {
                programMap.set(key, {
                    id: key,
                    name: template.name,
                    propertyId: propertyId,
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
    }, [planItems, recTemplates, propertyId]);

    useEffect(() => {
        const focusedProgram = rsaPrograms.find(p => p.id === focusedProgramId) || null;
        onProgramFocus(focusedProgram);
    }, [focusedProgramId, rsaPrograms, onProgramFocus]);

    const handleClose = () => {
        setIsBulkAssigningRsa(false);
        onProgramFocus(null);
    };

    const handleAction = (program: RsaProgram, treeIds: string[], action: 'add' | 'remove') => {
        const { confirmation } = toggleTreesInRsaProgram(treeIds, program, action);
        onSetToast(confirmation);
    };

    return (
        <AnimatePresence>
            {isBulkAssigningRsa && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 bg-black/30 z-40 md:hidden" />
                    <motion.div 
                        initial={{ y: '100%' }} 
                        animate={{ y: 0 }} 
                        exit={{ y: '100%' }} 
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
                        className="fixed bottom-0 left-0 right-0 md:absolute md:inset-0 bg-gray-100 z-50 shadow-2xl rounded-t-lg md:rounded-none flex flex-col"
                    >
                        <header className="p-4 border-b flex justify-between items-center flex-shrink-0 bg-white">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-indigo-600"/>
                                Assign RSA Programs
                            </h2>
                            <button onClick={handleClose} className="p-1"><X className="w-5 h-5 text-gray-500" /></button>
                        </header>

                        <main className="p-4 space-y-4 overflow-y-auto flex-1">
                             <div className="p-3 bg-white rounded-lg border">
                                <p className="font-semibold text-gray-700">{workingSelection.size} Trees Selected</p>
                                <p className="text-xs text-gray-500 mt-1">Click on a tree on the map to add or remove it from this selection.</p>
                            </div>
                            {rsaPrograms.map(program => (
                                <ProgramCard
                                    key={program.id}
                                    program={program}
                                    isFocused={focusedProgramId === program.id}
                                    onFocus={() => setFocusedProgramId(program.id)}
                                    onAdd={(trees) => handleAction(program, trees, 'add')}
                                    onRemove={(trees) => handleAction(program, trees, 'remove')}
                                    workingSelection={workingSelection}
                                />
                            ))}
                        </main>

                        <footer className="p-4 bg-white border-t flex justify-end items-center flex-shrink-0">
                            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700">
                                Done
                            </button>
                        </footer>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BulkRsaAssignmentDrawer;