// components/ClientMap.tsx
// Fix: Import useState from React to resolve 'Cannot find name' errors.
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
// Fix: Import 'Package' icon from lucide-react.
import { Menu, X, Bot, ShoppingCart, TreePine, ChevronsLeft, ChevronsRight, Info, Package, UserCircle } from 'lucide-react';
import { useStore } from '../services/mockData';
import RecTemplatePalette, { PlanDraftsPalette } from './ServicePalette';
import TargetSetDrawer from './EditTreeModal';
import { AnimatePresence, motion } from 'framer-motion';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { PlanItemCard, RecommendationDragCard, BulkAssignToQuarterModal } from './ClientDetailMap';
import type { PlanItem, Recommendation, RecTemplate } from '../types';


const Drawer: React.FC<{ isOpen: boolean, onClose: () => void, children: React.ReactNode, side: 'left' | 'right' }> = ({ isOpen, onClose, children, side }) => (
     <AnimatePresence>
        {isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-40"
                />
                <motion.div
                    initial={{ x: side === 'left' ? '-100%' : '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: side === 'left' ? '-100%' : '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 bottom-0 w-80 max-w-[calc(100vw-4rem)] bg-white z-50 shadow-lg"
                >
                    {children}
                </motion.div>
            </>
        )}
     </AnimatePresence>
  );


const AppShell: React.FC = () => {
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);

  const { activeDndItem, setActiveDndItem, hoveredGroupId, updatePlanItemSchedule, scheduleMultiVisitRsa, createPlanItemFromRecommendation, recTemplates, editingTree, isBulkEditing, isBulkAssigningRsa, addPlanItemFromTemplate, bulkAssigningToBudgetContext, confirmBulkAssignToBudget, cancelBulkAssignToBudget, unschedulePlanItems, movePlanItemToBudget, setHoveredDndId, scheduleRecommendationInProgram } = useStore();
  const location = useLocation();
  
  const pathParts = location.pathname.split('/');
  const propertyId = pathParts[1] === 'properties' ? pathParts[2] : undefined;
  const tab = pathParts.length > 3 ? pathParts[3] : 'trees';
  const isPlanTab = tab === 'plan';
  const isTreesTab = tab === 'trees';

  // Control sidebar expansion based on context
  useEffect(() => {
    if (editingTree || isPlanTab || isBulkEditing || isBulkAssigningRsa) {
      setSidebarCollapsed(false);
    } else if (isTreesTab) {
      setSidebarCollapsed(true);
    }
  }, [editingTree, isPlanTab, isTreesTab, isBulkEditing, isBulkAssigningRsa]);


  const handleDragStart = (event: any) => {
    setActiveDndItem({
        item: event.active.data.current.item,
        type: event.active.data.current.type
    });
  };

  const handleDragEnd = (event: any) => {
    setHoveredDndId(null);
    setActiveDndItem(null);
    const { active, over } = event;
    if (!over) return;
    
    const item = active.data.current.item as RecTemplate | PlanItem | Recommendation;
    const type = active.data.current.type;
    const dropId = over.id as string;
    
    // Use if/else if to ensure only one drop logic branch is executed
    if (dropId === 'scheduling-palette') {
        if (type === 'planItem') {
            unschedulePlanItems((item as PlanItem).id);
        }
    } else if (dropId.startsWith('annual-program-')) {
        const programId = dropId.replace('annual-program-', '');
        if (type === 'recommendation') {
            const rec = item as Recommendation & { isGroup?: boolean, items?: Recommendation[] };
            if (rec.isGroup) {
                rec.items?.forEach((r: Recommendation) => {
                    scheduleRecommendationInProgram(r, programId);
                });
            } else {
                scheduleRecommendationInProgram(rec, programId);
            }
        }
    } else if (dropId.startsWith('budget-program-')) {
        const budgetId = dropId.replace('budget-program-', '');
        const budgetProgram = useStore.getState().planItems.find(p => p.id === budgetId);
        if (!budgetProgram) return;

        const budgetYear = budgetProgram.schedule.year;

        if (type === 'recommendation') {
            const rec = item as Recommendation & { isGroup?: boolean, items?: Recommendation[] };
            if (rec.isGroup) {
                 rec.items?.forEach((r: Recommendation) => {
                     const quarter = r.proposedQuarter || 1;
                     createPlanItemFromRecommendation(r, budgetYear, quarter, budgetId);
                 });
            } else {
                 const quarter = rec.proposedQuarter || 1;
                 createPlanItemFromRecommendation(rec, budgetYear, quarter, budgetId);
            }
        } else if (type === 'planItem') {
            movePlanItemToBudget((item as PlanItem).id, budgetId);
        }
    } else if (type === 'budgetProgram' && dropId.startsWith('year-header-')) {
        const year = parseInt(dropId.replace('year-header-', ''));
        if (year) {
            updatePlanItemSchedule((item as PlanItem).id, year);
        }
    } else if (type === 'recTemplate' && (item as RecTemplate).unitBasis === 'budget' && dropId.startsWith('year-header-')) {
        const year = parseInt(dropId.replace('year-header-', ''));
        if (year && propertyId) {
            addPlanItemFromTemplate((item as RecTemplate).serviceCode, propertyId, year);
        }
    } else if (dropId.includes('-')) {
        const [yearStr, quarterStr] = dropId.split('-');
        const year = parseInt(yearStr);
        const quarter = parseInt(quarterStr) as 1 | 2 | 3 | 4;

        if (year && quarter >= 1 && quarter <= 4) {
            if (type === 'planItem') {
                const planItem = item as PlanItem;
                const template = recTemplates.find(t => t.serviceCode === planItem.serviceCode);
                if (planItem.status === 'draft' && template?.visitsPerYear && template.visitsPerYear > 1) {
                    scheduleMultiVisitRsa(planItem.id, year, quarter);
                } else {
                    updatePlanItemSchedule(planItem.id, year, quarter);
                }
            } else if (type === 'recommendation') {
                const rec = item as Recommendation & { isGroup?: boolean, items?: Recommendation[] };
                if (rec.isGroup) {
                    rec.items?.forEach((r: Recommendation) => {
                        createPlanItemFromRecommendation(r, year, quarter);
                    });
                } else {
                    createPlanItemFromRecommendation(rec, year, quarter);
                }
            }
        }
    }
  };

  const handleDragCancel = () => {
    setHoveredDndId(null);
    setActiveDndItem(null);
  };

  const renderSidebarContent = () => {
    // Priority 1: Bulk editing forces the Service Library
    if (isBulkEditing) {
        return <RecTemplatePalette propertyId={propertyId!} isCollapsed={isSidebarCollapsed} />;
    }
    // Priority 2: Plan tab shows draft items
    if (isPlanTab) {
      return <PlanDraftsPalette propertyId={propertyId!} isCollapsed={isSidebarCollapsed} />;
    }
    // Priority 3: Trees tab shows different content based on what's being edited
    if (isTreesTab) {
      if (editingTree) {
        return <RecTemplatePalette propertyId={propertyId!} isCollapsed={isSidebarCollapsed} />;
      }
      // Bulk RSA assigning shows a generic info panel
      if (isBulkAssigningRsa) {
        return (
             <div className="p-4 text-center">
                <Info className={`w-8 h-8 text-gray-400 ${isSidebarCollapsed ? 'mx-auto' : 'mx-auto mb-2'}`}/>
                {!isSidebarCollapsed && (
                    <>
                    <h3 className="font-bold text-gray-800">Assigning Programs</h3>
                    <p className="text-sm text-gray-500 mt-1">Use the drawer to manage recurring services for the selected trees.</p>
                    </>
                )}
            </div>
        )
      }
      // Default content for Trees tab when nothing is selected
      return (
        <div className="p-4 text-center">
          <Info className={`w-8 h-8 text-gray-400 ${isSidebarCollapsed ? 'mx-auto' : 'mx-auto mb-2'}`}/>
          {!isSidebarCollapsed && (
            <>
              <h3 className="font-bold text-gray-800">Tree Tools</h3>
              <p className="text-sm text-gray-500 mt-1">Select a tree to edit details or use the tools in the main panel.</p>
            </>
          )}
        </div>
      );
    }
    // Fallback for other potential tabs
    return <RecTemplatePalette propertyId={propertyId!} isCollapsed={isSidebarCollapsed} />;
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {propertyId && <button onClick={() => setPaletteOpen(true)} className="md:hidden p-2"><Menu className="w-6 h-6"/></button>}
            <Link to="/clients" className="flex items-center space-x-2">
              <TreePine className="w-8 h-8 text-green-700" />
              <h1 className="text-xl font-bold text-gray-800">TreeScout Cloud Manager</h1>
            </Link>
          </div>
          <div className="flex items-center">
            <Link to="/settings" className="p-2 text-gray-500 hover:text-gray-800" title="Account Settings">
                <UserCircle className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </header>

    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} onDragOver={(e) => setHoveredDndId(e.over?.id as string ?? null)} collisionDetection={pointerWithin}>
      <div className="flex">
        {/* Left Palette (Desktop) */}
        {propertyId && (
            <motion.aside 
                animate={{ width: isSidebarCollapsed ? '5rem' : '18rem' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden md:block flex-shrink-0 border-r bg-white h-[calc(100vh-4rem)] sticky top-16 z-20 relative overflow-hidden"
            >
                {renderSidebarContent()}
                 <button 
                  onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} 
                  className="absolute top-4 right-2 bg-white border rounded-full p-1 shadow-sm hover:bg-gray-100 z-10 transition-opacity"
                  aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isSidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                </button>
            </motion.aside>
        )}
        
        {/* Mobile Palette */}
        <Drawer isOpen={isPaletteOpen} onClose={() => setPaletteOpen(false)} side="left">
             {(propertyId && isPlanTab)
                ? <PlanDraftsPalette propertyId={propertyId} onClose={() => setPaletteOpen(false)}/>
                : <RecTemplatePalette propertyId={propertyId!} onClose={() => setPaletteOpen(false)}/>
             }
        </Drawer>


        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
        
        {/* Floating Cart Button */}
        {propertyId && (
            <button 
                onClick={() => setCartOpen(true)} 
                className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full h-16 w-16 flex items-center justify-center shadow-lg hover:bg-green-700 transition-transform hover:scale-110 z-[1003]"
                aria-label="Open Target Cart"
            >
                <ShoppingCart className="w-8 h-8" />
                {useStore.getState().cartTreeIds.length > 0 && 
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
                        {useStore.getState().cartTreeIds.length}
                    </span>
                }
            </button>
        )}
        
        {/* Cart Drawer (Mobile & Desktop) */}
        <Drawer isOpen={isCartOpen} onClose={() => setCartOpen(false)} side="right">
             <TargetSetDrawer propertyId={propertyId!} onClose={() => setCartOpen(false)} />
        </Drawer>
      </div>

       <DragOverlay dropAnimation={null}>
          {activeDndItem ? (
             <>
                {activeDndItem.type === 'planItem' && (
                    <PlanItemCard item={activeDndItem.item as PlanItem} onEdit={() => {}} onViewTrees={() => {}} isOverlay isHighlighted={!!((activeDndItem.item as PlanItem).groupId && (activeDndItem.item as PlanItem).groupId === hoveredGroupId)} />
                )}
                 {activeDndItem.type === 'budgetProgram' && (
                    <div className="p-3 bg-white rounded-lg shadow-2xl border-l-8 border-green-500 opacity-90">
                        <p className="font-bold text-green-700 flex items-center"><Package className="w-4 h-4 mr-2"/>{(activeDndItem.item as any).name || 'Budget Program'}</p>
                        <p className="text-sm text-gray-600">Moving to new year...</p>
                    </div>
                )}
                {activeDndItem.type === 'recommendation' && (
                    <RecommendationDragCard recommendation={activeDndItem.item as Recommendation} isOverlay />
                )}
                {activeDndItem.type === 'recTemplate' && (
                    <RecTemplatePalette.TemplateDragCard template={activeDndItem.item as RecTemplate} isOverlay />
                )}
             </>
          ) : null}
      </DragOverlay>

      <BulkAssignToQuarterModal
        context={bulkAssigningToBudgetContext}
        onClose={cancelBulkAssignToBudget}
        onConfirm={confirmBulkAssignToBudget}
      />
    </DndContext>
    </div>
  );
};

export default AppShell;