// components/CopyProgramModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../services/mockData';
import type { PlanItem, RecTemplate, TargetSet, Tree } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, Copy } from 'lucide-react';

const getCommonName = (species: string = '') => species.match(/\(([^)]+)\)/)?.[1] || species;

type ItemAction = 'none' | 'move' | 'copy';

const CopyProgramModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    program: PlanItem;
}> = ({ isOpen, onClose, program }) => {
    const { planItems, recTemplates, targetSets, trees, copyBudgetProgram } = useStore();
    
    const [targetYear, setTargetYear] = useState(program.schedule.year + 1);
    const [newBudget, setNewBudget] = useState(program.totalBudget || 5000);
    const [itemActions, setItemActions] = useState<{ [itemId: string]: ItemAction }>({});

    const containedItems = useMemo(() =>
        planItems.filter(pi => program.containedItemIds?.includes(pi.id))
        .map(pi => {
            const template = recTemplates.find(t => t.id === pi.recTemplateId);
            const targetSet = targetSets.find(ts => ts.id === pi.targetSetId);
            let targetText = "No target";
            if (targetSet) {
                 if (targetSet.treeIds.length === 1) {
                    const tree = trees.find(t => t.id === targetSet.treeIds[0]);
                    targetText = tree ? getCommonName(tree.species) : '1 tree';
                } else {
                    targetText = `${targetSet.treeIds.length} trees`;
                }
            }
            return { ...pi, template, targetSet, targetText };
        })
    , [planItems, program.containedItemIds, recTemplates, targetSets, trees]);

    const programTemplate = recTemplates.find(t => t.id === program.recTemplateId);

    const handleActionChange = (itemId: string, action: ItemAction) => {
        setItemActions(prev => ({...prev, [itemId]: action}));
    };
    
    const handleSave = () => {
        const finalActions: { [itemId: string]: 'move' | 'copy' } = {};
        for (const [itemId, action] of Object.entries(itemActions)) {
            if (action === 'move' || action === 'copy') {
                finalActions[itemId] = action;
            }
        }
        copyBudgetProgram(program.id, targetYear, newBudget, finalActions);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[1005] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-lg"
                    >
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                                <Copy className="w-5 h-5 mr-2" />
                                Copy Program: {programTemplate?.name}
                            </h2>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <p>Copying from <span className="font-semibold">{program.schedule.year}</span>. Select a new year and budget.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">New Year</label>
                                    <select value={targetYear} onChange={e => setTargetYear(parseInt(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                        {[1, 2, 3, 4, 5].map(i => <option key={i} value={program.schedule.year + i}>{program.schedule.year + i}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">New Budget</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input type="number" value={newBudget} onChange={e => setNewBudget(Number(e.target.value))} className="mt-1 block w-full p-2 pl-6 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Contained Services ({containedItems.length})</h3>
                                <div className="space-y-2">
                                {containedItems.map(item => (
                                    <div key={item.id} className="p-3 bg-gray-50 rounded-lg border">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-sm">{item.template?.name}</p>
                                                <p className="text-xs text-gray-500">{item.targetText}</p>
                                            </div>
                                            <p className="font-mono text-sm">${item.budget?.annualEstimate?.toLocaleString()}</p>
                                        </div>
                                        <div className="mt-2 pt-2 border-t flex justify-end space-x-2 text-xs">
                                            <label className="flex items-center space-x-1 cursor-pointer">
                                                <input type="radio" name={`action-${item.id}`} checked={(itemActions[item.id] || 'none') === 'none'} onChange={() => handleActionChange(item.id, 'none')} />
                                                <span>Don't Include</span>
                                            </label>
                                            <label className="flex items-center space-x-1 cursor-pointer">
                                                <input type="radio" name={`action-${item.id}`} checked={itemActions[item.id] === 'move'} onChange={() => handleActionChange(item.id, 'move')} />
                                                <span>Move</span>
                                            </label>
                                            <label className="flex items-center space-x-1 cursor-pointer">
                                                <input type="radio" name={`action-${item.id}`} checked={itemActions[item.id] === 'copy'} onChange={() => handleActionChange(item.id, 'copy')} />
                                                <span>Copy</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md flex items-center"><Save className="w-4 h-4 mr-2" />Create Copy</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CopyProgramModal;