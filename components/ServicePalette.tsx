// components/ServicePalette.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { RecTemplate, PlanItem, Recommendation, Tree } from '../types';
import { useStore } from '../services/mockData';
import { useDraggable } from '@dnd-kit/core';
import { DroppableSlot, DraggablePlanItem, DraggableRecommendation } from './ClientDetailMap';
import { Bot, FileText, GripVertical, PlusCircle, CheckCircle, Package, Search, Briefcase, Sparkles, X, Trees, Repeat } from 'lucide-react';
import RecommendationWizard from './RecommendationWizard';
import { AnimatePresence, motion } from 'framer-motion';
import { TreeInfoPopover, getCommonName } from './TreeInfoPopover';


// --- HELPER & DRAGGABLE COMPONENTS (from LidarViewer.tsx) ---

const TemplateDragCard: React.FC<{ template: RecTemplate; isOverlay?: boolean }> = ({ template, isOverlay = false }) => {
    const shadow = isOverlay ? 'shadow-2xl' : 'shadow-sm';
    return (
        <div className={`bg-white p-3 rounded-md ${shadow} border border-gray-200 mb-2 cursor-pointer hover:border-green-500`}>
             <div className="flex items-start">
                <GripVertical className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.descriptionShort}</p>
                </div>
            </div>
        </div>
    )
};

const DraggableTemplateCard: React.FC<{ template: RecTemplate }> = ({ template }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `template-${template.id}`,
        data: { item: template, type: 'recTemplate' }
    });
    const style = {
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <TemplateDragCard template={template} />
        </div>
    );
};

const TemplateCard: React.FC<{
    template: RecTemplate,
    isAdded: boolean,
    isCollapsed: boolean,
    onClick: () => void,
}> = ({ template, isAdded, isCollapsed, onClick }) => (
    <div 
        onClick={() => !isAdded && onClick()}
        className={`p-3 rounded-md border cursor-pointer transition-colors ${
            isAdded 
            ? 'bg-green-100 border-green-300 text-gray-500 cursor-not-allowed' 
            : 'bg-white hover:bg-gray-50 hover:border-green-400'
        }`}
    >
        <div className="flex justify-between items-center">
            <p className={`font-semibold text-sm ${isAdded ? 'text-green-800' : 'text-gray-800'}`}>{template.name}</p>
            {isAdded && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
        </div>
        {!isCollapsed && <p className="text-xs text-gray-500 mt-1">{template.descriptionShort}</p>}
    </div>
);


// --- RECOMMENDATION PALETTE (for Tree Edit / Bulk Edit) ---

const RecTemplatePalette: React.FC<{ propertyId: string; onClose?: () => void; isCollapsed?: boolean }> = ({ propertyId, onClose, isCollapsed = false }) => {
    const { 
        recTemplates, cartTreeIds, editingTree, recommendations, 
        addRecommendation, planItems, addRecommendationToEditingTree, 
        isBulkEditing, setBulkAddTemplate, createBudgetRecommendation
    } = useStore();
    const [selectedTemplate, setSelectedTemplate] = useState<RecTemplate | null>(null);
    const [activeTab, setActiveTab] = useState<'oneOff' | 'rsa'>('oneOff');

    // Determine the current mode: single tree edit, bulk edit, or general library view
    const mode = editingTree ? 'single' : isBulkEditing ? 'bulk' : 'library';

    const addedRecs = useMemo(() => {
        if (mode !== 'single' || !editingTree) return [];
        const savedRecs = editingTree.id ? recommendations.filter(r => r.treeIds?.includes(editingTree.id!)) : [];
        return [...savedRecs, ...(editingTree.recommendations || [])];
    }, [recommendations, editingTree, mode]);

    const activeRsaTemplateIds = useMemo(() => {
        if (!editingTree?.propertyId) return new Set<string>();
        const ids = new Set<string>();

        // 1. From scheduled plan items of type RSA
        planItems
            .filter(item => item.propertyId === editingTree.propertyId && item.schedule.type === 'rsa')
            .forEach(item => ids.add(item.recTemplateId));

        // 2. From existing (even unscheduled) recommendations for multi-visit templates
        recommendations
            .filter(rec => rec.propertyId === editingTree.propertyId)
            .forEach(rec => {
                const template = recTemplates.find(t => t.id === rec.recTemplateId);
                if (template?.visitsPerYear && template.visitsPerYear > 1) {
                    ids.add(rec.recTemplateId);
                }
            });

        return ids;
    }, [planItems, recommendations, recTemplates, editingTree?.propertyId]);

    const handleAddRec = (template: RecTemplate) => {
        if (mode === 'single' && editingTree) {
            if (editingTree.id) {
                addRecommendation(template.id, editingTree.id);
            } else {
                addRecommendationToEditingTree(template.id);
            }
        } else if (mode === 'bulk') {
            setBulkAddTemplate(template);
        }
    };
    
    // If we are editing a single tree or in bulk mode, this palette becomes a recommendation picker
    if (mode === 'single' || mode === 'bulk') {
        const oneOffTemplates = recTemplates.filter(t => !t.visitsPerYear || t.visitsPerYear <= 1);
        const rsaTemplates = recTemplates.filter(t => t.visitsPerYear && t.visitsPerYear > 1);
        
        const activeRsaPrograms = rsaTemplates.filter(t => activeRsaTemplateIds.has(t.id));
        const otherRsaPrograms = rsaTemplates.filter(t => !activeRsaTemplateIds.has(t.id));

        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b flex-shrink-0">
                    <h3 className={`font-bold text-lg flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                        <PlusCircle className="w-5 h-5 mr-2" />
                        {!isCollapsed && 'Add Recommendation'}
                    </h3>
                    {!isCollapsed && <p className="text-sm text-gray-500 mt-1">
                        {mode === 'single' 
                            ? 'Select a service to recommend for this tree.'
                            : `Select a service to add to the ${cartTreeIds.length} selected trees.`
                        }
                    </p>}
                </div>

                {/* TABS */}
                {!isCollapsed && (
                    <div className="p-2 border-b grid grid-cols-2 gap-2 bg-gray-50">
                        <button onClick={() => setActiveTab('oneOff')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'oneOff' ? 'bg-white shadow-sm text-green-700' : 'text-gray-600 hover:bg-gray-200'}`}>
                            One-Off Recs
                        </button>
                         <button onClick={() => setActiveTab('rsa')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'rsa' ? 'bg-white shadow-sm text-green-700' : 'text-gray-600 hover:bg-gray-200'}`}>
                            RSA Programs
                        </button>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {activeTab === 'oneOff' && oneOffTemplates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            isAdded={false} // Multiple one-offs are allowed
                            isCollapsed={isCollapsed}
                            onClick={() => handleAddRec(template)}
                        />
                    ))}
                    
                    {activeTab === 'rsa' && (
                        <>
                            {!isCollapsed && activeRsaPrograms.length > 0 && mode === 'single' && (
                                <div className="mb-4">
                                    <h4 className="font-semibold text-xs uppercase text-gray-500 px-1 mb-2">Active Property Programs</h4>
                                    <div className="space-y-2">
                                        {activeRsaPrograms.map(template => (
                                            <TemplateCard
                                                key={template.id}
                                                template={template}
                                                isAdded={addedRecs.some(r => r.recTemplateId === template.id)}
                                                isCollapsed={isCollapsed}
                                                onClick={() => handleAddRec(template)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!isCollapsed && <h4 className="font-semibold text-xs uppercase text-gray-500 px-1 mb-2">Library Programs</h4>}
                            <div className="space-y-2">
                                {otherRsaPrograms.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        isAdded={addedRecs.some(r => r.recTemplateId === template.id)}
                                        isCollapsed={isCollapsed}
                                        onClick={() => handleAddRec(template)}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Default view: Service Library for adding to plan
    const categories = Array.from(new Set(recTemplates.map(t => t.category))).sort();

    const handleClick = (template: RecTemplate) => {
        if (template.unitBasis === 'budget') {
            createBudgetRecommendation(template.id, propertyId);
            alert(`'${template.name}' added to Scheduling Palette.`);
            return;
        }

        if (cartTreeIds.length > 0) {
            setSelectedTemplate(template);
        } else {
            alert('Please select one or more trees in the "Trees" tab first to create a recommendation.');
        }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b flex-shrink-0">
                <h3 className={`font-bold text-lg flex items-center ${isCollapsed ? 'justify-center' : ''}`}><Bot className="w-5 h-5 mr-2" />{!isCollapsed && 'Service Library'}</h3>
                {!isCollapsed && <p className="text-sm text-gray-500 mt-1">Click a service to create a draft recommendation. Drag budget programs directly to the plan.</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!isCollapsed && categories.map(category => (
                    <div key={category}>
                        <h4 className="font-semibold text-md text-gray-700 mb-2">{category}</h4>
                        <div className="space-y-2">
                            {recTemplates.filter(t => t.category === category).map(template => {
                                if (template.unitBasis === 'budget') {
                                    return (
                                        <div key={template.id} onClick={() => handleClick(template)}>
                                             <DraggableTemplateCard template={template} />
                                        </div>
                                    );
                                }
                                return (
                                    <div key={template.id} onClick={() => handleClick(template)}>
                                        <TemplateDragCard template={template} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            {selectedTemplate && (
                <RecommendationWizard
                    isOpen={!!selectedTemplate}
                    onClose={() => setSelectedTemplate(null)}
                    template={selectedTemplate}
                    propertyId={propertyId}
                />
            )}
        </div>
    );
};

RecTemplatePalette.TemplateDragCard = TemplateDragCard;


// --- TREE LIST POPOVER (for PlanDraftsPalette) ---

const RecTreeListPopover: React.FC<{
    recommendation: Recommendation | { isGroup: true, items: Recommendation[] } | null;
    isOpen: boolean;
    onClose: () => void;
    position?: { top: number | string, left: number, bottom: number | string };
}> = ({ recommendation, isOpen, onClose, position }) => {
    const { trees, sections } = useStore();
    const [popoverTree, setPopoverTree] = useState<Tree | null>(null);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);


    const targetTrees = useMemo(() => {
        if (!recommendation) return [];
        const isGroup = 'isGroup' in recommendation;
        const recs = isGroup ? recommendation.items : [recommendation];
        const treeIdSet = new Set<string>();
        recs.forEach(rec => {
            rec.treeIds?.forEach(id => treeIdSet.add(id));
        });
        if (treeIdSet.size === 0) return [];
        return Array.from(treeIdSet)
            .map(id => trees.find(t => t.id === id))
            .filter((t): t is Tree => !!t);
    }, [recommendation, trees]);

    const handleTreeClick = (tree: Tree, event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setPopoverPosition({ top: rect.bottom + 5, left: rect.left });
        setPopoverTree(tree);
    };

    const template = useMemo(() => {
      if(!recommendation) return null;
      const firstRec = 'isGroup' in recommendation ? recommendation.items[0] : recommendation;
      return useStore.getState().recTemplates.find(t => t.id === firstRec.recTemplateId);
    }, [recommendation]);
    
    const sectionForPopover = popoverTree?.sectionId ? sections.find(s => s.id === popoverTree.sectionId) : null;

    return (
        <>
            <AnimatePresence>
                {isOpen && recommendation && position && (
                     <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, y: position?.bottom !== 'auto' ? 10 : -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: position?.bottom !== 'auto' ? 10 : -10 }}
                        style={position ? { top: position.top, left: position.left, bottom: position.bottom } : {}}
                        className="fixed z-[1006] bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[70vh]"
                    >
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">{template?.name} - Target Trees</h2>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            {targetTrees.length > 0 ? (
                                <ul className="space-y-2">
                                    {targetTrees.map(tree => (
                                        <li key={tree.id} className="truncate">
                                            <a href="#" onClick={(e) => handleTreeClick(tree, e)} className="flex items-center p-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm font-medium text-green-700 truncate">
                                                {tree.images && tree.images.length > 0 ? (
                                                    <img src={tree.images[0].url} alt={getCommonName(tree.species)} className="w-10 h-10 object-cover rounded-md mr-3 flex-shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded-md mr-3 flex-shrink-0 flex items-center justify-center text-gray-400">
                                                        <Trees className="w-6 h-6"/>
                                                    </div>
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
                )}
            </AnimatePresence>
            <AnimatePresence>
                {popoverTree && <TreeInfoPopover tree={popoverTree} sectionName={sectionForPopover?.name} onClose={() => setPopoverTree(null)} position={popoverPosition} />}
            </AnimatePresence>
        </>
    );
};


// --- DRAFTS PALETTE (for Plan Tab) ---

export const PlanDraftsPalette: React.FC<{ propertyId: string; onClose?: () => void; isCollapsed?: boolean }> = ({ propertyId, isCollapsed = false }) => {
    const { planItems, plans, recommendations, recTemplates, trees, sections } = useStore();
    const [activeTab, setActiveTab] = useState<'recs' | 'programs'>('recs');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingRecTrees, setViewingRecTrees] = useState<{ rec: any, position: { top: number | string, left: number, bottom: number | string } } | null>(null);
    const [directPopoverTree, setDirectPopoverTree] = useState<Tree | null>(null);
    const [directPopoverPosition, setDirectPopoverPosition] = useState({ top: 0, left: 0 });

    const plan = plans.find(p => p.propertyId === propertyId);
    
    const handleViewTrees = (item: any, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const viewportHeight = window.innerHeight;
    
        if (item.species) { // Duck-typing to see if it's a Tree object
            const POPOVER_APPROX_HEIGHT = 400; // Estimate for TreeInfoPopover
            let top = rect.bottom + 5;
            if (top + POPOVER_APPROX_HEIGHT > viewportHeight && rect.top > POPOVER_APPROX_HEIGHT) {
                top = rect.top - POPOVER_APPROX_HEIGHT - 5;
            }
            setDirectPopoverTree(item);
            setDirectPopoverPosition({ top, left: rect.left });
            setViewingRecTrees(null);
        } else {
            const POPOVER_MAX_HEIGHT_VH = 0.7; // From max-h-[70vh]
            const popoverMaxHeight = viewportHeight * POPOVER_MAX_HEIGHT_VH;
    
            let top: number | string = rect.bottom + 8;
            let bottom: number | string = 'auto';
    
            // If it would go off the bottom, and there's space on top, show it above
            if (rect.bottom + popoverMaxHeight > viewportHeight && rect.top > popoverMaxHeight) {
                top = 'auto';
                bottom = viewportHeight - rect.top + 8;
            }
    
            setViewingRecTrees({
                rec: item,
                position: { top, left: rect.left, bottom }
            });
            setDirectPopoverTree(null);
        }
    };

    const unscheduledRecs = useMemo(() => {
        const scheduledRecIds = new Set(planItems.filter(pi => pi.propertyId === propertyId && pi.recommendationId).map(pi => pi.recommendationId));
        return recommendations.filter(rec => rec.propertyId === propertyId && rec.status === 'recommended' && !scheduledRecIds.has(rec.id));
    }, [planItems, recommendations, propertyId]);

    const { individualRecs, programRecs } = useMemo(() => {
        const individuals: Recommendation[] = [];
        const programs: Recommendation[] = [];
        unscheduledRecs.forEach(rec => {
            const template = recTemplates.find(t => t.id === rec.recTemplateId);
            if (template?.unitBasis === 'budget') {
                programs.push(rec);
            } else {
                individuals.push(rec);
            }
        });
        return { individualRecs: individuals, programRecs: programs };
    }, [unscheduledRecs, recTemplates]);
    
    const bundledIndividualRecs = useMemo(() => {
        const groups = new Map<string, Recommendation[]>();
        individualRecs.forEach(rec => {
            const key = `${rec.recTemplateId}-${rec.proposedYear || 'any'}-${rec.proposedQuarter || 'any'}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(rec);
        });
        
        const result: (Recommendation | {isGroup: true, items: Recommendation[]})[] = [];
        groups.forEach(items => {
            if (items.length > 1) {
                result.push({ isGroup: true, items });
            } else {
                result.push(items[0]);
            }
        });
        return result;
    }, [individualRecs]);

    const draftPlanItems = planItems.filter(item => item.planId === plan?.id && item.status === 'draft');

    const { rsaDrafts, otherDrafts } = useMemo(() => {
        const rsa: PlanItem[] = [];
        const other: PlanItem[] = [];
        draftPlanItems.forEach(item => {
            const template = recTemplates.find(t => t.id === item.recTemplateId);
            if(template?.visitsPerYear && template.visitsPerYear > 1) {
                rsa.push(item);
            } else {
                other.push(item);
            }
        });
        return { rsaDrafts: rsa, otherDrafts: other };
    }, [draftPlanItems, recTemplates]);

    const filteredBundledRecs = useMemo(() => bundledIndividualRecs.filter(item => {
        const firstRec = 'isGroup' in item ? item.items[0] : item;
        const template = recTemplates.find(t => t.id === firstRec.recTemplateId);
        return template?.name.toLowerCase().includes(searchTerm.toLowerCase());
    }), [bundledIndividualRecs, searchTerm, recTemplates]);

    const filteredProgramRecs = useMemo(() => programRecs.filter(item => {
        const template = recTemplates.find(t => t.id === item.recTemplateId);
        return template?.name.toLowerCase().includes(searchTerm.toLowerCase());
    }), [programRecs, searchTerm, recTemplates]);

    const filteredRsaDrafts = useMemo(() => rsaDrafts.filter(item => {
        const template = recTemplates.find(t => t.id === item.recTemplateId);
        return template?.name.toLowerCase().includes(searchTerm.toLowerCase());
    }), [rsaDrafts, searchTerm, recTemplates]);

    const sectionForPopover = directPopoverTree?.sectionId ? sections.find(s => s.id === directPopoverTree.sectionId) : null;

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b flex-shrink-0">
                <h3 className={`font-bold text-lg flex items-center ${isCollapsed ? 'justify-center' : ''}`}><FileText className="w-5 h-5 mr-2" />{!isCollapsed && 'Scheduling Palette'}</h3>
                {!isCollapsed && <p className="text-sm text-gray-500 mt-1">Drag items onto the timeline to schedule them.</p>}
            </div>

            {!isCollapsed && (
                <>
                    <div className="p-2 border-b">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Filter items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md text-sm" />
                        </div>
                    </div>
                    <div className="p-2 border-b grid grid-cols-2 gap-2 bg-gray-50">
                        <button onClick={() => setActiveTab('recs')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'recs' ? 'bg-white shadow-sm text-green-700' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <Sparkles className="w-4 h-4"/>Individual Recs
                        </button>
                         <button onClick={() => setActiveTab('programs')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'programs' ? 'bg-white shadow-sm text-green-700' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <Briefcase className="w-4 h-4"/>Programs & Budgets
                        </button>
                    </div>
                </>
            )}

            <div className="flex-1 overflow-y-auto p-2">
                <DroppableSlot id="scheduling-palette" title="">
                    {activeTab === 'recs' && (
                        <>
                         {filteredBundledRecs.map((item, index) => isCollapsed ? (<div key={index} className="p-2 bg-blue-200 rounded-md my-2"></div>) : <DraggableRecommendation key={index} item={item} onViewTrees={handleViewTrees} />)}
                         {!isCollapsed && filteredBundledRecs.length === 0 && <p className="text-center text-sm text-gray-500 p-4">No individual recommendations.</p>}
                        </>
                    )}
                     {activeTab === 'programs' && (
                        <>
                         {!isCollapsed && filteredProgramRecs.length > 0 && <h4 className="font-semibold text-xs uppercase text-gray-500 px-1 mb-2 flex items-center"><Package className="w-4 h-4 mr-1.5" />Unscheduled Budgets</h4>}
                         {filteredProgramRecs.map((item, index) => isCollapsed ? (<div key={index} className="p-2 bg-purple-200 rounded-md my-2"></div>) : <DraggableRecommendation key={item.id} item={item} onViewTrees={handleViewTrees} />)}
                         
                         {!isCollapsed && filteredRsaDrafts.length > 0 && <h4 className="font-semibold text-xs uppercase text-gray-500 px-1 mb-2 mt-4 flex items-center"><Repeat className="w-4 h-4 mr-1.5" />RSA Drafts</h4>}
                         {filteredRsaDrafts.map(item => isCollapsed ? (<div key={item.id} className="p-2 bg-gray-200 rounded-md my-2"></div>) : <DraggablePlanItem key={item.id} item={item} onEdit={()=>{}} onViewTrees={() => {}} />)}
                         
                         {!isCollapsed && filteredProgramRecs.length === 0 && filteredRsaDrafts.length === 0 && <p className="text-center text-sm text-gray-500 p-4">No programs or drafts.</p>}
                        </>
                     )}
                </DroppableSlot>
            </div>
            <RecTreeListPopover
                isOpen={!!viewingRecTrees}
                onClose={() => setViewingRecTrees(null)}
                recommendation={viewingRecTrees?.rec}
                position={viewingRecTrees?.position}
            />
            <AnimatePresence>
                {directPopoverTree && <TreeInfoPopover tree={directPopoverTree} sectionName={sectionForPopover?.name} onClose={() => setDirectPopoverTree(null)} position={directPopoverPosition} />}
            </AnimatePresence>
        </div>
    );
}

export default RecTemplatePalette;
