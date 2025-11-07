// components/RsaBuilderTab.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Property, PlanItem, RecTemplate, TargetSet, DisplayProgram, ProgramService, Tree } from '../types';
import { useStore } from '../services/mockData';
import { RefreshCw, Package, Target, DollarSign, Edit3, Check, Calendar, AlertTriangle, Presentation, Copy, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CopyProgramModal from './CopyProgramModal';
import RenewRsaModal from './RenewRsaModal';

const ProgramBudgetEditor: React.FC<{program: DisplayProgram, planId: string}> = ({ program, planId }) => {
    const { updateRsaProgramBudget } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [budgetValue, setBudgetValue] = useState(program.totalBudget);

    useEffect(() => {
        setBudgetValue(program.totalBudget);
    }, [program.totalBudget]);

    const handleSave = () => {
        const newBudget = Number(budgetValue);
        if (!isNaN(newBudget) && newBudget !== program.totalBudget) {
            updateRsaProgramBudget(planId, program.key, newBudget);
        }
        setIsEditing(false);
    }
    
    if (isEditing) {
        return (
            <div className="flex items-center">
                 <span className="text-xl font-bold text-gray-800 mr-1">$</span>
                 <input
                    type="number"
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(Number(e.target.value))}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="font-bold text-xl text-gray-800 w-32 p-1 rounded-md border border-green-500 bg-white"
                    autoFocus
                 />
                 <button onClick={handleSave} className="ml-2 text-green-600 hover:text-green-800"><Check className="w-5 h-5"/></button>
            </div>
        )
    }

    return (
         <div onClick={() => setIsEditing(true)} className="flex items-center cursor-pointer group p-1 -m-1 rounded-md hover:bg-gray-100">
            <span className="font-bold text-xl text-gray-800">${program.totalBudget.toLocaleString()}</span>
            {program.isOverridden && <AlertTriangle className="w-4 h-4 ml-2 text-yellow-500" title="Budget has been manually overridden"/>}
            <Edit3 className="w-4 h-4 ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    )
}

const RsaProgramCard: React.FC<{ program: DisplayProgram; planId: string; onRenew: (program: DisplayProgram) => void; }> = ({ program, planId, onRenew }) => {
    const totalVisits = useMemo(() => program.services.reduce((sum, s) => sum + s.visits, 0), [program.services]);

    return (
        <div key={program.key} className="bg-white rounded-lg shadow-md flex flex-col border-t-4 border-green-600">
            <div className="p-4 border-b">
                <p className="text-sm font-semibold text-gray-500">{program.year} Program</p>
                <h3 className="text-xl font-bold text-green-700">{program.category} Services</h3>
            </div>
            <div className="p-4 space-y-4 flex-1">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-600 flex items-center"><Package className="w-4 h-4 mr-2"/> {program.services.length} Included Services</span>
                    <span className="font-semibold text-gray-600 flex items-center">{totalVisits} Total Visits <Calendar className="w-4 h-4 ml-2"/></span>
                </div>
                
                <div className="space-y-3">
                    {program.services.map(service => (
                        <div key={service.template.id} className="p-2 bg-gray-50 rounded-md">
                            <p className="font-semibold text-sm text-gray-800">{service.template.name}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                <span className="flex items-center truncate"><Target className="w-3 h-3 mr-1.5"/>{service.targetSet.name}</span>
                                <span className="font-semibold text-gray-700">${service.annualCost.toLocaleString()} ({service.visits}/yr)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
             <div className="p-4 border-t-2 border-dashed bg-gray-50">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-600 flex items-center"><DollarSign className="w-4 h-4 mr-2"/> Annual Budget</span>
                    <ProgramBudgetEditor program={program} planId={planId} />
                </div>
            </div>
            <div className="p-3 bg-gray-100 rounded-b-lg mt-auto">
                <button onClick={() => onRenew(program)} className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    Renew for {program.year + 1}
                </button>
            </div>
        </div>
    );
};

const BudgetProgramCard: React.FC<{ 
    program: PlanItem; 
    onCopy: (program: PlanItem) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}> = ({ program, onCopy, isExpanded, onToggleExpand }) => {
    const { recTemplates, planItems, targetSets, trees } = useStore();
    
    const template = recTemplates.find(t => t.serviceCode === program.serviceCode);
    
    const getCommonName = (species: string = '') => species.match(/\(([^)]+)\)/)?.[1] || species;

    const containedItems = useMemo(() =>
        planItems.filter(pi => program.containedItemIds?.includes(pi.id))
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
    , [planItems, program.containedItemIds, recTemplates, targetSets, trees]);
    
    const allocatedBudget = useMemo(() => {
        return containedItems.reduce((sum, item) => sum + (item.budget?.annualEstimate || 0), 0);
    }, [containedItems]);
    
    const remainingBudget = (program.totalBudget || 0) - allocatedBudget;
    const color = program.color || 'gray';
    const colorClasses = {
        'orange': 'border-orange-500',
        'purple': 'border-purple-500',
        'red': 'border-red-500',
        'gray': 'border-gray-500',
    };

    return (
        <div className={`bg-white rounded-lg shadow-md flex flex-col border-t-4 ${colorClasses[color]}`}>
            <div className="p-4 border-b cursor-pointer" onClick={onToggleExpand}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-semibold text-gray-500">{program.schedule.year} Program</p>
                        <h3 className="text-xl font-bold text-gray-800">{template?.name}</h3>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>
            
            <AnimatePresence>
                {isExpanded ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-3 border-t">
                            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Contained Services</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {containedItems.map(item => (
                                    <div key={item.id} className="p-2 bg-gray-50 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-sm text-gray-800">{item.template?.name}</p>
                                                <p className="text-xs text-gray-500">{item.targetText}</p>
                                            </div>
                                            <span className="font-semibold text-sm text-gray-700">${(item.budget?.annualEstimate || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                                {containedItems.length === 0 && <p className="text-xs text-gray-500 italic text-center">No services assigned.</p>}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                     <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                     >
                        <div className="p-4 space-y-4 flex-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-gray-600 flex items-center"><Package className="w-4 h-4 mr-2"/> {program.containedItemIds?.length || 0} Services</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-medium text-gray-500">Allocated</span>
                                    <span className="font-semibold text-gray-800">${allocatedBudget.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-medium text-gray-500">Remaining</span>
                                    <span className="font-semibold text-gray-800">${remainingBudget.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

             <div className="p-4 border-t-2 border-dashed bg-gray-50">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-600 flex items-center"><DollarSign className="w-4 h-4 mr-2"/> Total Budget</span>
                    <span className="font-bold text-xl text-gray-800">${(program.totalBudget || 0).toLocaleString()}</span>
                </div>
            </div>
            <div className="p-3 bg-gray-100 rounded-b-lg mt-auto">
                <button onClick={() => onCopy(program)} className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                    <Copy className="w-4 h-4 mr-2"/>
                    Copy to {program.schedule.year + 1}
                </button>
            </div>
        </div>
    )
}


const RsaBuilderTab: React.FC<{ property: Property }> = ({ property }) => {
    const { planItems, plans, recTemplates, targetSets } = useStore();
    const [programToCopy, setProgramToCopy] = useState<PlanItem | null>(null);
    const [programToRenew, setProgramToRenew] = useState<DisplayProgram | null>(null);
    const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
    const plan = useMemo(() => plans.find(p => p.propertyId === property.id), [plans, property.id]);

    const { rsaProgramsByYear, budgetProgramsByYear } = useMemo(() => {
        if (!plan) return { rsaProgramsByYear: {}, budgetProgramsByYear: {} };
        
        // RSA Programs Logic
        const programsByKey = new Map<string, Omit<DisplayProgram, 'totalBudget' | 'isOverridden'>>();
        const scheduledRsaItems = planItems.filter(item => 
            item.planId === plan.id && (item.schedule.type === 'rsa' || ((item.serviceCode && recTemplates.find(t=>t.serviceCode===item.serviceCode)?.visitsPerYear) ?? 0) > 1) && item.status !== 'draft'
        );
        scheduledRsaItems.forEach(item => {
            const template = recTemplates.find(t => t.serviceCode === item.serviceCode);
            if (!template || template.unitBasis === 'budget') return;
            const key = `${item.schedule.year}-${template.category}`;
            if (!programsByKey.has(key)) {
                programsByKey.set(key, { key, year: item.schedule.year, category: template.category, recTemplateIds: [], services: [] });
            }
        });
        const finalRsaPrograms: DisplayProgram[] = Array.from(programsByKey.values()).map(p_base => {
            const relevantItems = scheduledRsaItems.filter(item => {
                const template = recTemplates.find(t => t.serviceCode === item.serviceCode);
                return item.schedule.year === p_base.year && template?.category === p_base.category;
            });
            const serviceMap = new Map<string, ProgramService>();
            relevantItems.forEach(item => {
                const template = recTemplates.find(t => t.serviceCode === item.serviceCode);
                const targetSet = targetSets.find(ts => ts.id === item.targetSetId);
                if (!template || !targetSet) return;
                const serviceKey = `${template.serviceCode}-${targetSet.id}`;
                if (!serviceMap.has(serviceKey)) {
                    const visits = template.visitsPerYear || 1;
                    const annualCost = (item.budget?.annualEstimate || 0);
                    serviceMap.set(serviceKey, { template, targetSet, visits, annualCost, perVisitPrice: annualCost / visits });
                }
            });
            const services = Array.from(serviceMap.values()).sort((a,b) => a.template.name.localeCompare(b.template.name));
            const recTemplateIds = services.map(s => s.template.id);
            const isOverridden = plan.budgetOverrides?.[p_base.key] !== undefined;
            const totalBudget = isOverridden ? plan.budgetOverrides![p_base.key] : services.reduce((sum, s) => sum + s.annualCost, 0);
            return { ...p_base, services, recTemplateIds, totalBudget, isOverridden };
        });
        const groupedRsaByYear: {[year: number]: DisplayProgram[]} = {};
        finalRsaPrograms.forEach(p => {
            if (!groupedRsaByYear[p.year]) groupedRsaByYear[p.year] = [];
            groupedRsaByYear[p.year].push(p);
            groupedRsaByYear[p.year].sort((a,b) => a.category.localeCompare(b.category));
        });

        // Budget Programs Logic
        const budgetPrograms = planItems.filter(item => item.planId === plan.id && item.isBudgetProgram);
        const groupedBudgetsByYear: {[year: number]: PlanItem[]} = {};
        budgetPrograms.forEach(p => {
            if (!groupedBudgetsByYear[p.schedule.year]) groupedBudgetsByYear[p.schedule.year] = [];
            groupedBudgetsByYear[p.schedule.year].push(p);
        });

        return { rsaProgramsByYear: groupedRsaByYear, budgetProgramsByYear: groupedBudgetsByYear };

    }, [plan, planItems, recTemplates, targetSets]);

    const years = useMemo(() => {
        const yearSet = new Set([...Object.keys(rsaProgramsByYear).map(Number), ...Object.keys(budgetProgramsByYear).map(Number)]);
        return Array.from(yearSet).sort((a, b) => a - b);
    }, [rsaProgramsByYear, budgetProgramsByYear]);
    
    const handleRenew = (program: DisplayProgram) => {
        setProgramToRenew(program);
    };

    if (!plan) return <p>No plan found for this property.</p>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold">Annual Program Builder</h2>
                    <p className="text-gray-500 mt-1">Review and renew recurring service and budget programs for client presentations.</p>
                </div>
                <Link
                    to={`/rsa-presentation/${property.id}/${plan.id}`}
                    className="flex items-center justify-center bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-800 transition-colors"
                >
                    <Presentation className="w-5 h-5 mr-2" />
                    Enter Presentation Mode
                </Link>
            </div>
            
            {years.length > 0 ? (
                years.map(year => (
                    <div key={year}>
                        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">{year}</h2>
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-600 mb-3">Recurring Service Agreements (RSAs)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rsaProgramsByYear[year]?.map(program => (
                                    <RsaProgramCard key={program.key} program={program} planId={plan.id} onRenew={handleRenew} />
                                ))}
                                {(!rsaProgramsByYear[year] || rsaProgramsByYear[year].length === 0) && <p className="text-sm text-gray-500 md:col-span-3">No RSA programs for this year.</p>}
                            </div>
                        </div>
                        <div>
                             <h3 className="text-lg font-semibold text-gray-600 mb-3">Annual Budget Programs</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {budgetProgramsByYear[year]?.map(program => (
                                    <BudgetProgramCard 
                                        key={program.id} 
                                        program={program} 
                                        onCopy={setProgramToCopy}
                                        isExpanded={expandedBudgetId === program.id}
                                        onToggleExpand={() => setExpandedBudgetId(prev => prev === program.id ? null : program.id)}
                                    />
                                ))}
                                 {(!budgetProgramsByYear[year] || budgetProgramsByYear[year].length === 0) && <p className="text-sm text-gray-500 md:col-span-3">No budget programs for this year.</p>}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300"/>
                    <h3 className="mt-2 text-lg font-semibold text-gray-800">No Programs Found</h3>
                    <p className="mt-1 text-sm text-gray-500">Schedule services or create budgets in the 'Plan' tab to build programs here.</p>
                </div>
            )}

            {programToCopy && (
                <CopyProgramModal 
                    isOpen={!!programToCopy}
                    onClose={() => setProgramToCopy(null)}
                    program={programToCopy}
                />
            )}

            <RenewRsaModal
                isOpen={!!programToRenew}
                onClose={() => setProgramToRenew(null)}
                program={programToRenew}
            />
        </div>
    );
};

export default RsaBuilderTab;