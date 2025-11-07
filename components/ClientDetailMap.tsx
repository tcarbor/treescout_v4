// components/ClientDetailMap.tsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '../services/mockData';
import type { Property, PlanItem, RecTemplate, Recommendation, BulkAssigningToBudgetContext, Tree } from '../types';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { GripVertical, Edit, Users, Trash2, Package, Sparkles, AlertTriangle, FileText, CheckCircle, X, DollarSign, Save, Percent, ChevronsRightLeft, MapPin, Copy } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { TreeInfoPopover, getCommonName } from './TreeInfoPopover';

// --- HELPERS & STYLING ---

const getStatusColor = (status: PlanItem['status']) => {
    switch (status) {
        case 'approved': return 'border-green-500';
        case 'proposed': return 'border-blue-500';
        case 'scheduled': return 'border-yellow-500';
        case 'done': return 'border-gray-400';
        case 'draft': return 'border-dashed border-gray-400';
        default: return 'border-gray-300';
    }
};

const programColorMap: { [key: string]: { border: string, bg: string, text: string } } = {
  orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  gray: { border: 'border-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
  green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
};


// --- MODALS ---

const TreeListModal: React.FC<{
    item: PlanItem | null;
    isOpen: boolean;
    onClose: () => void;
}> = ({ item, isOpen, onClose }) => {
    const { targetSets, trees, sections } = useStore();
    const [popoverTree, setPopoverTree] = useState<Tree | null>(null);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

    const targetSet = useMemo(() => {
        if (!item) return null;
        return targetSets.find(ts => ts.id === item.targetSetId);
    }, [item, targetSets]);

    const targetTrees = useMemo(() => {
        if (!targetSet) return [];
        return targetSet.treeIds.map(id => trees.find(t => t.id === id)).filter((t): t is Tree => !!t);
    }, [targetSet, trees]);

    const handleTreeClick = (tree: Tree, event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setPopoverPosition({ top: rect.bottom + 5, left: rect.left });
        setPopoverTree(tree);
    };
    
    const template = useMemo(() => {
      if(!item) return null;
      return useStore.getState().recTemplates.find(t => t.serviceCode === item.serviceCode);
    }, [item]);

    const sectionForPopover = popoverTree?.sectionId ? sections.find(s => s.id === popoverTree.sectionId) : null;

    return (
        <>
            <AnimatePresence>
                {isOpen && item && (
                    <div className="fixed inset-0 bg-black/60 z-[1006] flex items-center justify-center p-4" onClick={onClose}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[70vh]"
                        >
                            <div className="p-4 border-b flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-800">{template?.name} - Target Trees</h2>
                                <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                            </div>
                            <div className="p-4 overflow-y-auto">
                                {targetTrees.length > 0 ? (
                                    <ul className="space-y-2">
                                        {targetTrees.map(tree => (
                                            <li key={tree.id}>
                                                <a href="#" onClick={(e) => handleTreeClick(tree, e)} className="flex items-center p-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm font-medium text-green-700 truncate">
                                                    {tree.images && tree.images.length > 0 ? (
                                                        <img src={tree.images[0].url} alt={getCommonName(tree.species)} className="w-10 h-10 object-cover rounded-md mr-3 flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-200 rounded-md mr-3 flex-shrink-0"></div>
                                                    )}
                                                    <span className="flex items-baseline truncate">
                                                        <span className="text-xs font-mono text-gray-500 mr-2">(#{tree.id.slice(-4)})</span>
                                                        <span className="mr-1">{tree.dbh}"</span>
                                                        <span className="truncate">{getCommonName(tree.species)}</span>
                                                    </span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">No specific trees are targeted for this service.</p>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {popoverTree && <TreeInfoPopover tree={popoverTree} sectionName={sectionForPopover?.name} onClose={() => setPopoverTree(null)} position={popoverPosition} />}
            </AnimatePresence>
        </>
    );
};


const PlanItemEditModal: React.FC<{
    item: PlanItem | null;
    isOpen: boolean;
    onClose: () => void;
}> = ({ item, isOpen, onClose }) => {
    const { updatePlanItemDetails, recTemplates, planItems, targetSets, trees } = useStore();
    const [perVisitPrice, setPerVisitPrice] = useState(0);

    // For budget program editing
    const [editedTotalBudget, setEditedTotalBudget] = useState<number | string>(0);
    const [editedItems, setEditedItems] = useState<Map<string, { contractAnnualEstimate: number | string }>>(new Map());
    const [totalContractValue, setTotalContractValue] = useState<number | string>('');
    const [percentageAdjustment, setPercentageAdjustment] = useState<number | string>('');

    const { containedItems, allocatedBudget } = useMemo(() => {
        if (!item || !(item.isBudgetProgram || item.isRsaProgram)) {
            return { containedItems: [], allocatedBudget: 0 };
        }

        const items = planItems.filter(pi => item.containedItemIds?.includes(pi.id))
            .map(pi => {
                const template = recTemplates.find(t => t.serviceCode === pi.serviceCode);
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
            });
        
        const budget = items.reduce((sum, current) => sum + (current.budget?.annualEstimate ?? 0), 0);
        
        return { containedItems: items, allocatedBudget: budget };

    }, [item, planItems, recTemplates, targetSets, trees]);


    useEffect(() => {
        if (isOpen && item) {
            if (item.isBudgetProgram) {
                setEditedTotalBudget(item.totalBudget || 0);
                const initialMap = new Map<string, { contractAnnualEstimate: number | string }>();
                containedItems.forEach(ci => {
                    const price = ci.budget?.contractAnnualEstimate ?? ci.budget?.annualEstimate ?? 0;
                    initialMap.set(ci.id, { contractAnnualEstimate: price });
                });
                setEditedItems(initialMap);
                setTotalContractValue('');
                setPercentageAdjustment('');
            } else {
                setPerVisitPrice(item.budget?.perVisitPrice || 0);
            }
        }
    }, [item, isOpen, containedItems]);


    if (!isOpen || !item) return null;

    const template = recTemplates.find(t => t.serviceCode === item.serviceCode);

    const handleItemPriceChange = (itemId: string, value: string) => {
        const newMap = new Map(editedItems);
        newMap.set(itemId, { contractAnnualEstimate: value });
        setEditedItems(newMap);
    };

    const handlePercentageAdjust = () => {
        const percentage = Number(percentageAdjustment);
        if (isNaN(percentage)) return;
        const newMap = new Map();
        containedItems.forEach(ci => {
            const originalValue = ci.budget?.annualEstimate ?? 0;
            const newValue = Math.round(originalValue * (1 + percentage / 100));
            newMap.set(ci.id, { contractAnnualEstimate: newValue });
        });
        setEditedItems(newMap);
        setPercentageAdjustment('');
    };

    const handleTotalAdjust = () => {
        const total = Number(totalContractValue);
        if (isNaN(total) || total <= 0) return;
        const originalTotal = containedItems.reduce((sum, ci) => sum + (ci.budget?.annualEstimate ?? 0), 0);
        if (originalTotal === 0) return;

        const newMap = new Map();
        let runningTotal = 0;
        containedItems.forEach((ci, index) => {
            const originalValue = ci.budget?.annualEstimate ?? 0;
            const proportion = originalValue / originalTotal;
            let newValue;
            if (index === containedItems.length - 1) {
                newValue = total - runningTotal;
            } else {
                newValue = Math.round(total * proportion);
                runningTotal += newValue;
            }
            newMap.set(ci.id, { contractAnnualEstimate: newValue });
        });
        setEditedItems(newMap);
        setTotalContractValue('');
    };
    
    const handleSave = () => {
        if (item.isBudgetProgram) {
            editedItems.forEach((value, itemId) => {
                const finalPrice = Number(value.contractAnnualEstimate);
                if (!isNaN(finalPrice)) {
                    updatePlanItemDetails(itemId, { budget: { contractAnnualEstimate: finalPrice } });
                }
            });
            const finalTotalBudget = Number(editedTotalBudget);
            if (!isNaN(finalTotalBudget)) {
                updatePlanItemDetails(item.id, { totalBudget: finalTotalBudget });
            }
        } else {
            updatePlanItemDetails(item.id, { budget: { ...item.budget!, perVisitPrice } });
        }
        onClose();
    };

    const currentProgramTotal = Array.from(editedItems.values()).reduce((sum: number, val: { contractAnnualEstimate: number | string }) => sum + Number(val.contractAnnualEstimate || 0), 0);
    
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[1005] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className={`bg-white rounded-lg shadow-xl w-full ${item.isBudgetProgram || item.isRsaProgram ? 'max-w-2xl' : 'max-w-md'}`}
                    >
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center"><Edit className="w-5 h-5 mr-2" />{item.isBudgetProgram || item.isRsaProgram ? 'Edit Program' : 'Edit Plan Item'}</h2>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>

                        {item.isBudgetProgram || item.isRsaProgram ? (
                            <>
                            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                               <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{template?.name}</h3>
                                        <p className="text-sm text-gray-600">{item.schedule.year} Program</p>
                                    </div>
                                    {item.isBudgetProgram && (
                                        <div className="text-right">
                                            <label className="text-sm font-medium text-gray-700">Total Program Budget</label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                <input
                                                    type="number"
                                                    value={editedTotalBudget}
                                                    onChange={e => setEditedTotalBudget(e.target.value)}
                                                    className="w-full text-right font-bold text-2xl text-green-700 p-1 pl-6 bg-white border rounded-md"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Allocated: ${allocatedBudget.toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                               </div>
                               
                                {item.isBudgetProgram && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Bulk Adjustments</h4>
                                    <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-gray-50">
                                        <div className="relative">
                                            <input type="number" value={percentageAdjustment} onChange={e=>setPercentageAdjustment(e.target.value)} placeholder="e.g., 10 or -5" className="w-full p-2 border rounded-md bg-white text-gray-900" />
                                            <button onClick={handlePercentageAdjust} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200 rounded"><Percent className="w-4 h-4"/></button>
                                        </div>
                                        <div className="relative">
                                            <input type="number" value={totalContractValue} onChange={e=>setTotalContractValue(e.target.value)} placeholder="e.g., 9500" className="w-full p-2 border rounded-md bg-white text-gray-900" />
                                            <button onClick={handleTotalAdjust} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200 rounded"><ChevronsRightLeft className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                </div>
                                )}
                               
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Individual Services ({containedItems.length})</h4>
                                    <div className="space-y-2">
                                    {containedItems.map(ci => (
                                        <div key={ci.id} className="grid grid-cols-5 items-center gap-2 p-2 bg-white rounded border">
                                            <div className="col-span-3">
                                                <p className="font-semibold text-sm truncate">{ci.template?.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{ci.targetText}</p>
                                            </div>
                                            <p className="text-sm text-gray-500 text-right font-mono">${(ci.budget?.annualEstimate ?? 0).toLocaleString()}</p>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                <input type="number" value={editedItems.get(ci.id)?.contractAnnualEstimate || ''} onChange={e => handleItemPriceChange(ci.id, e.target.value)} className="w-full pl-6 p-1 border rounded-md text-sm border-gray-300 bg-white text-gray-900" />
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            </div>
                            </>
                        ) : (
                            <div className="p-6 space-y-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <h3 className="font-bold text-gray-900">{template?.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{item.schedule.year} {item.schedule.quarter ? `Q${item.schedule.quarter}`: ''}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center"><DollarSign className="w-4 h-4 mr-1.5" />Per Visit Price</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={perVisitPrice}
                                            onChange={(e) => setPerVisitPrice(Number(e.target.value))}
                                            className="focus:ring-green-500 focus:border-green-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md p-2 bg-white text-gray-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md flex items-center"><Save className="w-4 h-4 mr-2"/>Save</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export const BulkAssignToQuarterModal: React.FC<{ context: BulkAssigningToBudgetContext | null; onClose: () => void; onConfirm: (quarter: 1 | 2 | 3 | 4) => void; }> = ({ context, onClose, onConfirm }) => {
    return (
        <AnimatePresence>
            {context && (
                <div className="fixed inset-0 bg-black/60 z-[1005] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="bg-white rounded-lg shadow-xl max-w-md w-full"
                    >
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Assign to Quarter</h2>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                You are assigning <span className="font-bold">{context.recommendations.length}</span> recommendations from the
                                <span className="font-bold"> {context.year} {context.category}</span> program. Please select a quarter.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map(q => (
                                    <button key={q} onClick={() => onConfirm(q as 1|2|3|4)} className="p-4 border rounded-lg text-center font-semibold hover:bg-green-100 hover:border-green-400">
                                        Quarter {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// --- DROPPABLE COMPONENTS ---

export const DroppableSlot: React.FC<{ id: string; title: string; children: React.ReactNode; className?: string; isOver?: boolean }> = ({ id, title, children, className = '', isOver }) => {
    const { setNodeRef } = useDroppable({ id });
    const baseClasses = "p-2 rounded-lg transition-colors min-h-[50px]";
    const stateClasses = isOver ? 'bg-green-100' : 'bg-gray-100';
    return (
        <div ref={setNodeRef} className={`${baseClasses} ${stateClasses} ${className}`}>
            {title && <h4 className="text-sm font-bold text-gray-600 mb-2">{title}</h4>}
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
};

// --- CARD COMPONENTS ---

export const PlanItemCard: React.FC<{ item: PlanItem; onEdit: () => void; onViewTrees: () => void; isOverlay?: boolean; isHighlighted?: boolean; dragListeners?: any; }> = ({ item, onEdit, onViewTrees, isOverlay, isHighlighted, dragListeners }) => {
    const { recTemplates, targetSets, trees, planItems } = useStore();
    const template = recTemplates.find(t => t.serviceCode === item.serviceCode);
    const targetSet = targetSets.find(ts => ts.id === item.targetSetId);
    
    const parentProgram = item.containerId ? planItems.find(p => p.id === item.containerId) : null;
    const colorClassKey = item.color || parentProgram?.color;
    const colorClasses = colorClassKey ? programColorMap[colorClassKey] : null;

    let targetText = "No target set";
    if (targetSet) {
        if (targetSet.treeIds.length === 1) {
            const tree = trees.find(t => t.id === targetSet.treeIds[0]);
            targetText = tree ? getCommonName(tree.species) : '1 tree';
        } else {
            targetText = `${targetSet.treeIds.length} trees`;
        }
    }

    const shadow = isOverlay ? 'shadow-2xl' : 'shadow-sm';
    const highlightClass = isHighlighted ? 'ring-2 ring-offset-2 ring-blue-500' : '';
    const groupIndicator = item.groupId ? `(${item.visitNumber}/${item.budget?.visits})` : '';

    const borderColor = colorClasses ? colorClasses.border : getStatusColor(item.status);

    const displayPrice = item.budget?.contractAnnualEstimate 
        ? item.budget.contractAnnualEstimate / (item.budget?.visits || 1)
        : item.budget?.perVisitPrice;

    return (
        <div onClick={onViewTrees} className={`p-2 bg-white rounded-md ${shadow} border-l-4 ${borderColor} ${highlightClass} group cursor-pointer`}>
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate flex items-center">
                        {item.isRenewal && item.status === 'draft' && <span className="text-xs font-semibold text-green-800 bg-green-100 px-2 py-0.5 rounded-full mr-2">ACTIVE RENEWAL</span>}
                        {template?.name || 'Unknown Service'} {groupIndicator}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center truncate"><Users className="w-3 h-3 mr-1.5" />{targetText}</p>
                </div>
                <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
                    <p className="font-bold text-sm text-gray-800">${(displayPrice || 0).toLocaleString()}</p>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-0.5"><Edit className="w-3 h-3"/></button>
                    <button {...dragListeners} onClick={(e) => e.stopPropagation()} className="cursor-grab touch-none p-0.5 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100">
                        <GripVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RecommendationDragCard: React.FC<{ 
    recommendation: Recommendation | { isGroup: true, items: Recommendation[] }; 
    isOverlay?: boolean, 
    dragListeners?: any; 
    onViewTrees?: (item: any, event: React.MouseEvent) => void;
}> = ({ recommendation, isOverlay = false, dragListeners, onViewTrees }) => {
    const { recTemplates, trees } = useStore();
    const shadow = isOverlay ? 'shadow-2xl' : 'shadow-sm';
    
    const isGroup = 'isGroup' in recommendation;
    const firstRec = isGroup ? recommendation.items[0] : recommendation;
    const template = recTemplates.find(t => t.serviceCode === firstRec.serviceCode);

    const isSingleTreeRec = !isGroup && recommendation.treeIds?.length === 1;
    const singleTree = isSingleTreeRec ? trees.find(t => t.id === recommendation.treeIds![0]) : null;

    let count: number;
    
    if (singleTree) {
        count = 1;
    } else {
        count = isGroup ? recommendation.items.length : (firstRec.treeIds?.length || 0);
    }
    
    const getScheduleParts = (rec: Recommendation): { quarter: string | null; year: string | null } => {
        if (!rec.proposedYear) return { quarter: null, year: null };
        const yearStr = `'${String(rec.proposedYear).slice(-2)}`;
        const quarterStr = rec.proposedQuarter ? `Q${rec.proposedQuarter}` : null;
        return { quarter: quarterStr, year: yearStr };
    };

    const scheduleParts = getScheduleParts(firstRec);

    const handleViewTrees = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onViewTrees) {
            if (singleTree) {
                onViewTrees(singleTree, e);
            } else {
                onViewTrees(recommendation, e);
            }
        }
    };

    if (template?.unitBasis === 'budget') {
         return (
             <div className={`p-3 bg-white rounded-lg ${shadow} border-l-8 border-purple-500`}>
                <p className="font-bold text-purple-700 flex items-center"><Package className="w-4 h-4 mr-2"/>{template?.name}</p>
                <p className="text-sm text-gray-600 mt-1">New Budget Program</p>
            </div>
         )
    }

    return (
        <div className={`bg-white p-3 rounded-md ${shadow} border border-gray-200 hover:border-blue-500`}>
             <div className="flex items-start">
                <div {...dragListeners} className="cursor-grab touch-none mr-2 flex-shrink-0 mt-0.5">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-yellow-500"/>
                        {template?.name}
                        {template && template.visitsPerYear && template.visitsPerYear > 1 && (
                            <span className="ml-2 text-xs font-semibold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                RSA
                            </span>
                        )}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                        {count > 0 ? (
                             <button onClick={handleViewTrees} className="text-xs text-gray-500 hover:text-blue-600 hover:underline flex items-baseline truncate">
                                <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                                {singleTree ? (
                                    <>
                                        <span className="text-gray-400 font-mono mr-1">(#{singleTree.id.slice(-4)})</span>
                                        <span className="mr-1">{singleTree.dbh}"</span>
                                        <span className="truncate">{getCommonName(singleTree.species)}</span>
                                    </>
                                ) : (
                                    <span className="truncate">{`${count} ${count > 1 ? 'trees' : 'tree'}`}</span>
                                )}
                            </button>
                        ) : (
                             <p className="text-xs text-gray-500 flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                No trees
                            </p>
                        )}
                        {scheduleParts.year && (
                            <div className="flex flex-col items-center justify-center text-center bg-blue-100 text-blue-800 rounded-md px-1.5 py-0.5 leading-none">
                                {scheduleParts.quarter && <span className="text-[10px] font-bold">{scheduleParts.quarter}</span>}
                                <span className="text-[10px] font-mono">{scheduleParts.year}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- DRAGGABLE & PROGRAM COMPONENTS ---

const ProgramSwimlane: React.FC<{ item: PlanItem; onEdit: (item: PlanItem) => void; onCopy: (item: PlanItem) => void; isOver?: boolean; }> = ({ item, onEdit, onCopy, isOver }) => {
    const { planItems, recTemplates, targetSets, trees, unschedulePlanItems } = useStore();
    const colorClasses = item.color ? programColorMap[item.color] : programColorMap.gray;

    const containedItems = useMemo(() =>
        planItems.filter(pi => item.containedItemIds?.includes(pi.id))
        .map(pi => {
            const template = recTemplates.find(t => t.serviceCode === pi.serviceCode);
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
    , [planItems, item.containedItemIds, recTemplates, targetSets, trees]);

    const allocated = useMemo(() => 
        containedItems.reduce((sum, current) => sum + (current.budget?.contractAnnualEstimate ?? current.budget?.annualEstimate ?? 0), 0)
    , [containedItems]);
    
    const remaining = (item.totalBudget || 0) - allocated;
    
    const { attributes, listeners, setNodeRef: setDraggableNodeRef } = useDraggable({
        id: `budgetProgram-${item.id}`,
        data: { item, type: 'budgetProgram' }
    });

    const { setNodeRef: setDroppableNodeRef } = useDroppable({
        id: `budget-program-${item.id}`,
    });
    
    const baseClasses = `relative p-3 rounded-lg border-2 border-dashed ${colorClasses.border} mb-4 transition-colors`;
    const stateClasses = isOver ? colorClasses.bg.replace('-50', '-100') : colorClasses.bg;

    return (
        <div ref={setDroppableNodeRef} className={`${baseClasses} ${stateClasses}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center">
                        <div ref={setDraggableNodeRef} {...listeners} {...attributes} className="cursor-grab touch-none p-1 -ml-1">
                             <GripVertical className={`w-5 h-5 ${colorClasses.text}`} />
                        </div>
                        <p className={`font-bold ${colorClasses.text} flex items-center ml-1`}><Package className="w-4 h-4 mr-2"/>{useStore.getState().recTemplates.find(t=>t.serviceCode===item.serviceCode)?.name}</p>
                    </div>
                    <div className="text-sm text-gray-600 mt-2 flex space-x-4 pl-8">
                        <span>Allocated: <span className="font-semibold">${allocated.toLocaleString()}</span></span>
                        <span>Remaining: <span className="font-semibold">${remaining.toLocaleString()}</span></span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <p className={`font-bold text-2xl ${colorClasses.text}`}>${(item.totalBudget || 0).toLocaleString()}</p>
                    <button onClick={() => onCopy(item)} className="text-gray-400 hover:text-gray-700 p-1" title="Copy Program"><Copy className="w-4 h-4"/></button>
                    <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-gray-700 p-1" title="Edit Program"><Edit className="w-4 h-4"/></button>
                </div>
            </div>
            {containedItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-400/50 pl-8 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Contained Services</h4>
                    {containedItems.map(contained => (
                        <div key={contained.id} className="flex justify-between items-center bg-white/70 p-2 rounded-md shadow-sm">
                            <div>
                                <p className="font-semibold text-sm text-gray-800 flex items-center">
                                    {contained.template?.name}
                                    <span className="ml-2 text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                                        Q{contained.schedule.quarter}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500">{contained.targetText}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-gray-800">${(contained.budget?.contractAnnualEstimate ?? contained.budget?.annualEstimate ?? 0).toLocaleString()}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to remove this service from the program? It will be returned to the scheduling palette.")) {
                                            unschedulePlanItems(contained.id);
                                        }
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                                    title="Remove from Program"
                                >
                                    <Trash2 className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const RsaProgramSwimlane: React.FC<{ item: PlanItem; onEdit: (item: PlanItem) => void; isOver?: boolean; }> = ({ item, onEdit, isOver }) => {
    const { planItems, recTemplates, targetSets, trees, unschedulePlanItems } = useStore();
    const colorClasses = programColorMap.green;

    const containedItems = useMemo(() =>
        planItems.filter(pi => item.containedItemIds?.includes(pi.id))
        .map(pi => {
            const template = recTemplates.find(t => t.serviceCode === pi.serviceCode);
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
    , [planItems, item.containedItemIds, recTemplates, targetSets, trees]);

    const allocated = useMemo(() => 
        containedItems.reduce((sum, current) => sum + (current.budget?.annualEstimate ?? 0), 0)
    , [containedItems]);
    
    const { setNodeRef: setDroppableNodeRef } = useDroppable({
        id: `annual-program-${item.id}`,
    });
    
    const baseClasses = `relative p-3 rounded-lg border-2 border-dashed ${colorClasses.border} mb-4 transition-colors`;
    const stateClasses = isOver ? colorClasses.bg.replace('-50', '-100') : colorClasses.bg;

    return (
        <div ref={setDroppableNodeRef} className={`${baseClasses} ${stateClasses}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                     <p className={`font-bold ${colorClasses.text} flex items-center ml-1`}><Package className="w-4 h-4 mr-2"/>{useStore.getState().recTemplates.find(t=>t.serviceCode===item.serviceCode)?.name}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <p className={`font-bold text-xl ${colorClasses.text}`}>${(allocated || 0).toLocaleString()}</p>
                    <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-gray-700 p-1" title="Edit Program"><Edit className="w-4 h-4"/></button>
                </div>
            </div>
             {containedItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-400/50 pl-2 space-y-2">
                    {containedItems.map(contained => (
                        <div key={contained.id} className="flex justify-between items-center bg-white/70 p-2 rounded-md shadow-sm">
                            <div>
                                <p className="font-semibold text-sm text-gray-800 flex items-center">
                                    {contained.template?.name}
                                    <span className="ml-2 text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                                        Q{contained.schedule.quarter}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500">{contained.targetText}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-gray-800">${(contained.budget?.annualEstimate ?? 0).toLocaleString()}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to remove this service from the program? It will be returned to the scheduling palette.")) {
                                            unschedulePlanItems(contained.id);
                                        }
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                                    title="Remove from Program"
                                >
                                    <Trash2 className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const DraggablePlanItem: React.FC<{ item: PlanItem; onEdit: () => void; onViewTrees: () => void; }> = ({ item, onEdit, onViewTrees }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `planItem-${item.id}`,
        data: { item, type: 'planItem' }
    });
    const style = {
        opacity: isDragging ? 0.5 : 1,
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to unschedule this item?")) {
            useStore.getState().unschedulePlanItems(item.id);
        }
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} onDoubleClick={handleDoubleClick} className="touch-none">
            <PlanItemCard item={item} onEdit={onEdit} onViewTrees={onViewTrees} dragListeners={listeners} />
        </div>
    );
};

export const DraggableRecommendation: React.FC<{ 
    item: Recommendation | { isGroup: true, items: Recommendation[] };
    onViewTrees: (item: any, event: React.MouseEvent) => void;
}> = ({ item, onViewTrees }) => {
    const isGroup = 'isGroup' in item;
    const firstRec = isGroup ? item.items[0] : item;
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `rec-${firstRec.id}`,
        data: { item, type: 'recommendation' }
    });
    const style = {
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <RecommendationDragCard recommendation={item} dragListeners={listeners} onViewTrees={onViewTrees} />
        </div>
    );
};

// --- MAIN BOARD COMPONENT ---

const PlanBoard: React.FC<{ property: Property, onCopyProgram: (program: PlanItem) => void; }> = ({ property, onCopyProgram }) => {
    const { plans, planItems, hoveredDndId } = useStore();
    const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
    const [viewingTreesForItem, setViewingTreesForItem] = useState<PlanItem | null>(null);

    const plan = useMemo(() => plans.find(p => p.propertyId === property.id), [plans, property.id]);
    
    const years = useMemo(() => {
        if (!plan) return [];
        const startYear = new Date().getFullYear();
        return Array.from({ length: plan.horizonYears }, (_, i) => startYear + i);
    }, [plan]);

    const itemsByQuarter = useMemo(() => {
        const grouped: { [key: string]: PlanItem[] } = {};
        planItems
            .filter(item => item.planId === plan?.id && item.status !== 'draft' && !item.isBudgetProgram && !item.isRsaProgram)
            .forEach(item => {
                const key = `${item.schedule.year}-${item.schedule.quarter}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            });
        return grouped;
    }, [planItems, plan]);

    const { rsaProgramsByYear, budgetProgramsByYear } = useMemo(() => {
        const rsaGrouped: { [key: number]: PlanItem[] } = {};
        const budgetGrouped: { [key: number]: PlanItem[] } = {};
        planItems.filter(item => item.planId === plan?.id && (item.isBudgetProgram || item.isRsaProgram)).forEach(item => {
            const year = item.schedule.year;
            if (item.isRsaProgram) {
                if(!rsaGrouped[year]) rsaGrouped[year] = [];
                rsaGrouped[year].push(item);
            } else if (item.isBudgetProgram) {
                if(!budgetGrouped[year]) budgetGrouped[year] = [];
                budgetGrouped[year].push(item);
            }
        });
        return { rsaProgramsByYear: rsaGrouped, budgetProgramsByYear: budgetGrouped };
    }, [planItems, plan]);
    
    if (!plan) return <div className="text-center p-8 bg-gray-50 rounded-lg">No care plan exists for this property yet.</div>;
    
    return (
        <div className="space-y-6">
            {years.map(year => (
                <div key={year}>
                    <DroppableSlot id={`year-header-${year}`} title="">
                        <div className="flex justify-between items-center mb-2">
                           <h3 className="text-xl font-bold text-gray-800">{year}</h3>
                        </div>
                    </DroppableSlot>
                    
                    <div className="space-y-4">
                        {/* Program Swimlanes */}
                        <div className="relative z-10 space-y-4">
                            {rsaProgramsByYear[year]?.map(prog => (
                                <RsaProgramSwimlane
                                    key={prog.id}
                                    item={prog}
                                    onEdit={setEditingItem}
                                    isOver={hoveredDndId === `annual-program-${prog.id}`}
                                />
                            ))}
                            {budgetProgramsByYear[year]?.map(prog => (
                                <ProgramSwimlane
                                    key={prog.id}
                                    item={prog}
                                    onEdit={setEditingItem}
                                    onCopy={onCopyProgram}
                                    isOver={hoveredDndId === `budget-program-${prog.id}`}
                                />
                            ))}
                            {(!budgetProgramsByYear[year] || budgetProgramsByYear[year].length === 0) && (!rsaProgramsByYear[year] || rsaProgramsByYear[year].length === 0) &&
                                <DroppableSlot id={`budget-program-placeholder-${year}`} title="" className="border-2 border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-500 py-4">
                                    Drop a budget item or RSA program here
                                </DroppableSlot>
                            }
                        </div>

                        {/* Unassigned Items Timeline */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(quarter => {
                                const id = `${year}-${quarter}`;
                                const items = itemsByQuarter[id] || [];
                                return (
                                    <DroppableSlot key={id} id={id} title={`Q${quarter}`} isOver={hoveredDndId === id}>
                                        {items.map(item => (
                                            <DraggablePlanItem
                                                key={item.id}
                                                item={item}
                                                onEdit={() => setEditingItem(item)}
                                                onViewTrees={() => setViewingTreesForItem(item)}
                                            />
                                        ))}
                                    </DroppableSlot>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}
             <PlanItemEditModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                item={editingItem}
             />
             <TreeListModal
                isOpen={!!viewingTreesForItem}
                onClose={() => setViewingTreesForItem(null)}
                item={viewingTreesForItem}
             />
        </div>
    );
};

export default PlanBoard;