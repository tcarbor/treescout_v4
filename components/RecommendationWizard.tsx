// components/RecommendationWizard.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, DollarSign, Target } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RecTemplate, PlanItem } from '../types';
import { useStore } from '../services/mockData';
import { priceCalculator } from '../services/geminiService';

interface RecommendationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  template: RecTemplate;
  propertyId: string;
}

const simpleId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

const RecommendationWizard: React.FC<RecommendationWizardProps> = ({ isOpen, onClose, template, propertyId }) => {
  const { cartTreeIds, trees, targetSets, saveCartAsTargetSet, addPlanItem, plans } = useStore();
  const [inputs, setInputs] = useState(template.defaultInputs || {});
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4 | undefined>(() => {
    const currentMonth = new Date().getMonth(); // 0-11
    return Math.floor(currentMonth / 3) + 1 as 1|2|3|4;
  });

  const [targetSetId, setTargetSetId] = useState<string | null>(null);

  const plan = useMemo(() => plans.find(p => p.propertyId === propertyId), [plans, propertyId]);
  
  // Find or create a TargetSet for the current cart selection
  useEffect(() => {
    if (isOpen && cartTreeIds.length > 0) {
      const existingSet = targetSets.find(ts => 
        ts.propertyId === propertyId &&
        ts.treeIds.length === cartTreeIds.length &&
        [...ts.treeIds].sort().join(',') === [...cartTreeIds].sort().join(',')
      );
      if (existingSet) {
        setTargetSetId(existingSet.id);
      } else {
        const newId = `ts_${simpleId()}`;
        const newName = `${template.name} (${cartTreeIds.length} trees)`;
        // This is a temporary/generated target set. The user can rename it from the cart if needed.
        saveCartAsTargetSet(newName, propertyId, newId);
        setTargetSetId(newId);
      }
    }
  }, [isOpen, cartTreeIds, propertyId, targetSets, template.name, saveCartAsTargetSet]);


  const priceResult = useMemo(() => {
    return priceCalculator(template, inputs);
  }, [template, inputs]);
  
  const targetSet = useMemo(() => targetSets.find(ts => ts.id === targetSetId), [targetSets, targetSetId]);

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) || value === '') {
      setInputs(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleAddToPlan = () => {
    if (!plan || !targetSetId) return;

    const newItem: Omit<PlanItem, 'id'> = {
      planId: plan.id,
      propertyId,
      targetSetId,
      serviceCode: template.serviceCode,
      schedule: {
        type: template.visitsPerYear && template.visitsPerYear > 1 ? 'rsa' : 'oneOff',
        year: year,
        quarter: quarter,
      },
      status: 'draft',
      budget: {
        perVisitPrice: priceResult.perVisitPrice,
        visits: template.visitsPerYear || 1,
        annualEstimate: template.visitsPerYear ? priceResult.perVisitPrice * template.visitsPerYear : priceResult.perVisitPrice
      }
    };

    addPlanItem(newItem);
    onClose();
  };
  
  const renderInputControl = () => {
    switch(template.unitBasis) {
      case 'time':
        return <InputField label="Estimated Hours" field="estHours" />;
      case 'dbh':
        return <InputField label="Average DBH (inches)" field="dbhInches" />;
      case 'sqft':
        return <InputField label="Area (sq ft)" field="sqft" />;
      case 'height':
        return <InputField label="Average Height (ft)" field="heightFt" />;
      default:
        return <p className="text-sm text-gray-500">This service has no adjustable inputs.</p>;
    }
  };

  const InputField: React.FC<{label: string, field: keyof typeof inputs}> = ({ label, field }) => (
     <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="number"
            step={field === 'estHours' ? 0.25 : 1}
            min={0}
            value={inputs[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 bg-white text-gray-900"
          />
        </div>
      </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col"
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Add to Plan</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
                <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.descriptionShort}</p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 flex items-center mb-2"><Target className="w-4 h-4 mr-2" /> Target</h4>
                    <div className="p-3 border rounded-md">
                        <p className="font-medium text-sm text-gray-800">{targetSet?.name || 'Loading target...'}</p>
                        <p className="text-xs text-gray-500">{cartTreeIds.length} trees selected</p>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Inputs</h4>
                    {renderInputControl()}
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 flex items-center mb-2"><Calendar className="w-4 h-4 mr-2" /> Schedule</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                            <select id="year" value={year} onChange={e => setYear(parseInt(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                                <option>{new Date().getFullYear() -1}</option>
                                <option>{new Date().getFullYear()}</option>
                                <option>{new Date().getFullYear() + 1}</option>
                                <option>{new Date().getFullYear() + 2}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="quarter" className="block text-sm font-medium text-gray-700">Quarter</label>
                             <select id="quarter" value={quarter || ''} onChange={e => setQuarter(e.target.value ? parseInt(e.target.value) as 1|2|3|4 : undefined)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                                <option value="">Any</option>
                                <option value="1">Q1 (Jan-Mar)</option>
                                <option value="2">Q2 (Apr-Jun)</option>
                                <option value="3">Q3 (Jul-Sep)</option>
                                <option value="4">Q4 (Oct-Dec)</option>
                            </select>
                        </div>
                    </div>
                </div>

                 <div>
                    <h4 className="font-semibold text-gray-800 flex items-center mb-2"><DollarSign className="w-4 h-4 mr-2" /> Budget Estimate</h4>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                        <div>
                             <p className="text-sm text-green-800">Per Visit</p>
                             <p className="text-2xl font-bold text-green-900">${priceResult.perVisitPrice}</p>
                        </div>
                        {template.visitsPerYear && template.visitsPerYear > 1 && (
                             <div className="text-right">
                                 <p className="text-sm text-green-800">Annual ({template.visitsPerYear} visits)</p>
                                 <p className="text-2xl font-bold text-green-900">${priceResult.perVisitPrice * (template.visitsPerYear || 1)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {!plan && 
                    <div className="p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm rounded-md">
                        No active plan found for this property. Please create a plan before adding items.
                    </div>
                }

            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 mr-3">
                Cancel
              </button>
              <button onClick={handleAddToPlan} disabled={!plan || !targetSetId} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400">
                Add to Plan
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RecommendationWizard;