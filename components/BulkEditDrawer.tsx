// components/BulkEditDrawer.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../services/mockData';
import type { RecTemplate, Tree, Recommendation } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, DollarSign, Users, ChevronLeft, Info, Calendar, PlusCircle, Trash2, GitMerge } from 'lucide-react';
import { priceCalculator } from '../services/geminiService';

interface ConfiguredRec {
    id: string;
    template: RecTemplate;
    priceOverrides: { [treeId: string]: number };
    year: number | undefined;
    quarter: 1 | 2 | 3 | 4 | undefined;
}

const RecommendationConfigurator: React.FC<{
    template: RecTemplate;
    trees: Tree[];
    onSave: (config: Omit<ConfiguredRec, 'id' | 'template'>) => void;
    onCancel: () => void;
}> = ({ template, trees, onSave, onCancel }) => {
    const [priceOverrides, setPriceOverrides] = useState<{ [treeId: string]: number }>({});
    const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
    const [quarter, setQuarter] = useState<1 | 2 | 3 | 4 | undefined>(() => {
        const currentMonth = new Date().getMonth();
        return Math.floor(currentMonth / 3) + 1 as 1|2|3|4;
    });

    const handleOverrideChange = (treeId: string, value: string) => {
        const newOverrides = { ...priceOverrides };
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
            newOverrides[treeId] = numValue;
        } else {
            delete newOverrides[treeId];
        }
        setPriceOverrides(newOverrides);
    };

    const handleSetService = () => {
        onSave({ priceOverrides, year, quarter });
    };

    return (
        <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border-2 border-green-500">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="font-bold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{template.descriptionShort}</p>
                    </div>
                    <button onClick={onCancel} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800">
                        <ChevronLeft className="w-4 h-4 mr-1"/> Change Service
                    </button>
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                    <div>
                        <h4 className="font-semibold text-gray-800 flex items-center mb-2"><Calendar className="w-4 h-4 mr-2" /> Proposed Schedule</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                                <select id="year" value={year || ''} onChange={e => setYear(e.target.value ? parseInt(e.target.value) : undefined)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                                    <option value="">Any</option>
                                    {[0, 1, 2, 3].map(i => <option key={i} value={new Date().getFullYear() + i}>{new Date().getFullYear() + i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="quarter" className="block text-sm font-medium text-gray-700">Quarter</label>
                                <select id="quarter" value={quarter || ''} onChange={e => setQuarter(e.target.value ? parseInt(e.target.value) as 1|2|3|4 : undefined)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                                    <option value="">Any</option>
                                    <option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 flex items-center mb-2"><DollarSign className="w-4 h-4 mr-2" /> Per-Tree Pricing (Per Visit)</h4>
                        <div className="space-y-2 border rounded-md p-2 max-h-60 overflow-y-auto">
                            {trees.map(tree => {
                                const defaultPrice = priceCalculator(template, { dbhInches: tree.dbh }).perVisitPrice;
                                return (
                                    <div key={tree.id} className="grid grid-cols-3 items-center gap-2 p-2 bg-white rounded">
                                        <span className="text-sm truncate col-span-2">{tree.species} (DBH: {tree.dbh}")</span>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                placeholder={String(defaultPrice)}
                                                onChange={(e) => handleOverrideChange(tree.id, e.target.value)}
                                                className={`w-full pl-6 p-1 border rounded-md text-sm border-gray-300 bg-white text-gray-900`}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
                 <div className="mt-4 pt-4 border-t flex justify-end">
                    <button onClick={handleSetService} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700">Set Service</button>
                </div>
            </div>
        </div>
    );
};

const ConfiguredRecCard: React.FC<{
    rec: ConfiguredRec;
    onRemove: (id: string) => void;
}> = ({ rec, onRemove }) => {
    const scheduleText = useMemo(() => {
        if (!rec.year) return "Any Time";
        const yearStr = String(rec.year).slice(-2);
        if (rec.quarter) return `Q${rec.quarter} '${yearStr}`;
        return `'${yearStr}`;
    }, [rec.year, rec.quarter]);

    return (
        <div className="p-3 bg-white rounded-lg border flex justify-between items-center">
            <div>
                <p className="font-semibold text-gray-800">{rec.template.name}</p>
                <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full mt-1 inline-block">{scheduleText}</span>
            </div>
            <button onClick={() => onRemove(rec.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                <Trash2 className="w-4 h-4"/>
            </button>
        </div>
    );
};

const BulkAssigner: React.FC<{ trees: Tree[] }> = ({ trees }) => {
    const { recommendations, recTemplates, startBulkAssignToBudget } = useStore();
    const treeIds = new Set(trees.map(t => t.id));

    const assignableRecs = useMemo(() => {
        const planItems = useStore.getState().planItems;
        const scheduledRecIds = new Set(planItems.map(pi => pi.recommendationId).filter(Boolean));
        
        const recsForTrees = recommendations.filter(r => 
            (r.status === 'recommended' || r.status === 'draft') &&
            !scheduledRecIds.has(r.id) &&
            r.treeIds?.some(id => treeIds.has(id))
        );

        const groups = new Map<string, { key: string, year: number, category: string, recs: Recommendation[] }>();
        recsForTrees.forEach(rec => {
            const template = recTemplates.find(t => t.serviceCode === rec.serviceCode);
            if (!rec.proposedYear || !template || template.unitBasis === 'budget') return;

            const key = `${rec.proposedYear}-${template.category}`;
            if (!groups.has(key)) {
                groups.set(key, { key, year: rec.proposedYear, category: template.category, recs: [] });
            }
            const group = groups.get(key);
            if(group) {
                group.recs.push(rec);
            }
        });

        return Array.from(groups.values());
    }, [recommendations, recTemplates, trees]);

    if (assignableRecs.length === 0) {
        return <div className="text-center p-4 bg-gray-50 rounded-lg text-sm text-gray-500">No unscheduled recommendations found for the selected trees.</div>;
    }
    
    return (
        <div className="space-y-2">
            {assignableRecs.map(group => (
                <div key={group.key} className="p-3 bg-white rounded-lg border flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-gray-800">{group.year} {group.category}</p>
                        <p className="text-sm text-gray-500">{group.recs.length} recommendations found</p>
                    </div>
                    <button
                        onClick={() => startBulkAssignToBudget(group.recs, group.year, group.category)}
                        className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-semibold rounded-md hover:bg-green-200 flex items-center"
                    >
                       <GitMerge className="w-4 h-4 mr-2"/> Assign to Budget
                    </button>
                </div>
            ))}
        </div>
    );
};


const BulkEditDrawer: React.FC = () => {
    const { 
        isBulkEditing, setIsBulkEditing, cartTreeIds, trees, 
        bulkAddTemplate, setBulkAddTemplate, addRecommendationToTrees 
    } = useStore();
    
    const [configuredRecs, setConfiguredRecs] = useState<ConfiguredRec[]>([]);
    
    const selectedTrees = useMemo(() => trees.filter(t => cartTreeIds.includes(t.id)), [trees, cartTreeIds]);

    useEffect(() => {
        if (!isBulkEditing) {
            setConfiguredRecs([]);
            setBulkAddTemplate(null);
        }
    }, [isBulkEditing, setBulkAddTemplate]);

    const handleClose = () => {
        setIsBulkEditing(false);
    };
    
    const handleSetRecommendation = (config: Omit<ConfiguredRec, 'id' | 'template'>) => {
        if (!bulkAddTemplate) return;
        const newRec: ConfiguredRec = {
            id: `confrec_${Date.now()}_${Math.random()}`,
            template: bulkAddTemplate,
            ...config
        };
        setConfiguredRecs(prev => [...prev, newRec]);
        setBulkAddTemplate(null);
    };
    
    const handleRemoveConfiguredRec = (id: string) => {
        setConfiguredRecs(prev => prev.filter(rec => rec.id !== id));
    };

    const handleApplyAll = () => {
        if (configuredRecs.length === 0) {
            alert("No services have been set to apply.");
            return;
        }
        configuredRecs.forEach(rec => {
            addRecommendationToTrees(rec.template.serviceCode, cartTreeIds, rec.priceOverrides, { year: rec.year, quarter: rec.quarter });
        });
        handleClose();
    };

    return (
        <AnimatePresence>
            {isBulkEditing && (
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
                                <Users className="w-5 h-5 mr-2 text-green-600"/>
                                Bulk Editing {cartTreeIds.length} Trees
                            </h2>
                            <button onClick={handleClose} className="p-1"><X className="w-5 h-5 text-gray-500" /></button>
                        </header>

                        <main className="p-4 space-y-4 overflow-y-auto flex-1">
                            
                            {configuredRecs.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-600 px-1">Set Services ({configuredRecs.length})</h3>
                                    {configuredRecs.map(rec => (
                                        <ConfiguredRecCard key={rec.id} rec={rec} onRemove={handleRemoveConfiguredRec} />
                                    ))}
                                </div>
                            )}

                            {bulkAddTemplate ? (
                                <RecommendationConfigurator
                                    template={bulkAddTemplate}
                                    trees={selectedTrees}
                                    onSave={handleSetRecommendation}
                                    onCancel={() => setBulkAddTemplate(null)}
                                />
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-2">Assign Existing Recommendations</h3>
                                        <BulkAssigner trees={selectedTrees} />
                                    </div>
                                    <div className="text-center text-sm text-gray-400">OR</div>
                                    <div className="flex flex-col items-center justify-center text-center bg-white rounded-lg border p-6">
                                        <h3 className="font-bold text-lg text-gray-800">Add a New Service</h3>
                                        <p className="text-gray-500 mt-1 max-w-sm">Use the <span className="font-semibold text-green-700">Service Library</span> in the sidebar to add a brand new recommendation to this bulk edit session.</p>
                                    </div>
                                </div>
                            )}

                        </main>

                        <footer className="p-4 bg-white border-t flex justify-end items-center flex-shrink-0">
                            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 mr-3">Cancel</button>
                            <button onClick={handleApplyAll} disabled={configuredRecs.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400 flex items-center">
                                <Save className="w-4 h-4 inline mr-2" />
                                Apply {configuredRecs.length > 0 ? `${configuredRecs.length} Service(s)` : 'Services'}
                            </button>
                        </footer>
                    </motion.div>
                 </>
            )}
        </AnimatePresence>
    );
};

export default BulkEditDrawer;