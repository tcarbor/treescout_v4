// components/TreeList.tsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Tree, Recommendation } from '../types';
import { useStore } from '../services/mockData';
import { ChevronDown, Plus, PackagePlus, Edit, Star, Key, Scan } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const RecommendationGroup: React.FC<{ recs: Recommendation[] }> = ({ recs }) => {
    const { recTemplates } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const firstRec = recs[0];
    const template = recTemplates.find(t => t.id === firstRec.recTemplateId);

    if (!template) return null;

    const getScheduleText = (rec: Recommendation) => {
        if (!rec.proposedYear) return null;
        const yearStr = String(rec.proposedYear).slice(-2);
        return rec.proposedQuarter ? `Q${rec.proposedQuarter} '${yearStr}` : `'${yearStr}`;
    };

    if (recs.length === 1) {
        const scheduleText = getScheduleText(firstRec);
        return (
            <li className="text-gray-600 bg-gray-50 p-2 rounded-md flex justify-between items-center">
                <span className="text-sm">{template.name} - ${firstRec.perVisitPrice}</span>
                {scheduleText && <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">{scheduleText}</span>}
            </li>
        );
    }

    return (
        <li className="bg-gray-50 rounded-md text-sm">
            <div className="p-2 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <span>{template.name} ({recs.length} instances)</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <ul className="px-2 pb-2 pl-6 space-y-1 border-t border-gray-200 pt-2">
                            {recs.map(rec => {
                                const scheduleText = getScheduleText(rec);
                                return (
                                    <li key={rec.id} className="text-gray-600 flex justify-between items-center text-xs">
                                        <span>${rec.perVisitPrice}</span>
                                        {scheduleText ? 
                                          <span className="font-semibold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-full">{scheduleText}</span>
                                          : <span className="text-gray-400 italic">Unscheduled</span>
                                        }
                                    </li>
                                );
                            })}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
};


interface TreeCardProps {
  tree: Tree;
  isSelected: boolean; // Is in cart
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isExpanded: boolean;
  isActive: boolean; // Is focused on map
  onHeaderClick: () => void;
  onEdit: () => void;
  onAssignRsa: () => void;
  onViewScan: (url: string, title: string) => void;
}

const getCommonName = (species: string = '') => species.match(/\(([^)]+)\)/)?.[1] || species;

const TreeCard = React.forwardRef<HTMLDivElement, TreeCardProps>(({ tree, isSelected, onSelect, isExpanded, isActive, onHeaderClick, onEdit, onAssignRsa, onViewScan }, ref) => {
  const allRecommendations = useStore(s => s.recommendations);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const scanButtonRef = useRef<HTMLDivElement>(null);
  
  const treeRecommendations = useMemo(
    () => allRecommendations.filter(r => r.treeIds?.includes(tree.id)),
    [allRecommendations, tree.id]
  );
    
  const conditionClasses = {
    'Excellent': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Fair': 'bg-yellow-100 text-yellow-800',
    'Poor': 'bg-red-100 text-red-800',
  };
  
  const ringClass = isActive
    ? 'ring-2 ring-blue-500 shadow-lg' // Active tree has blue ring
    : isSelected
    ? 'ring-2 ring-green-500' // In cart tree has green ring
    : 'ring-1 ring-transparent';
    
  const groupedRecommendations = useMemo(() => {
    const groups = new Map<string, Recommendation[]>();
    treeRecommendations.forEach(rec => {
        if (!groups.has(rec.recTemplateId)) {
            groups.set(rec.recTemplateId, []);
        }
        groups.get(rec.recTemplateId)!.push(rec);
    });
    return Array.from(groups.values());
  }, [treeRecommendations]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scanButtonRef.current && !scanButtonRef.current.contains(event.target as Node)) {
        setShowScanOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScanButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tree.lidarScans && tree.lidarScans.length > 1) {
        setShowScanOptions(prev => !prev);
    } else if (tree.lidarScans && tree.lidarScans.length === 1) {
        onViewScan(tree.lidarScans[0].url, `${getCommonName(tree.species)} - ${tree.lidarScans[0].date}`);
    }
  };

  const sortedScans = useMemo(() => {
    return tree.lidarScans ? [...tree.lidarScans].sort((a,b) => b.date.localeCompare(a.date)) : [];
  }, [tree.lidarScans]);


  return (
    <div ref={ref} className={`bg-white rounded-lg shadow-sm transition-all duration-200 hover:shadow-md ${ringClass} first:mt-1`}>
      {/* Card Header */}
      <div className="flex items-center p-3 cursor-pointer" onClick={onHeaderClick}>
        <div className="mr-3">
            <input 
                type="checkbox" 
                className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={isSelected}
                onChange={onSelect}
                onClick={(e) => e.stopPropagation()} // Prevent expansion when clicking checkbox
            />
        </div>
        <div className="flex-1 min-w-0">
          {/* Line 1 */}
          <p className="font-bold text-gray-800 truncate">
            <span className="mr-2">{tree.dbh}"</span>
            <span>{getCommonName(tree.species) || 'Unknown Species'}</span>
          </p>
          {/* Line 2 */}
          <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
            {tree.isLandmark && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" title="Landmark Tree" />}
            {tree.isKeystone && <Key className="w-4 h-4 text-purple-500 flex-shrink-0" title="Keystone Species" />}
            <span className="text-xs font-mono">(#{tree.id.slice(-4)})</span>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${conditionClasses[tree.condition ?? 'Fair']}`}>
                {tree.condition}
            </span>
          </div>
        </div>
        <div className="ml-3">
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t p-4 space-y-4">
              {/* Image Gallery */}
              {tree.images && tree.images.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Gallery</h4>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {tree.images.map((img, idx) => (
                      <img key={idx} src={img.url} alt={img.caption || `Tree ${tree.id}`} className="w-32 h-24 object-cover rounded-md flex-shrink-0" />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recommendations */}
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Existing Recommendations</h4>
                {groupedRecommendations.length > 0 ? (
                  <ul className="space-y-2">
                     {groupedRecommendations.map((group, index) => (
                        <RecommendationGroup key={index} recs={group} />
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500 italic">None found.</p>}
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2 border-t">
                  <button onClick={onEdit} className="flex-1 text-sm flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200">
                    <Edit className="w-4 h-4 mr-2" />Edit Tree
                  </button>
                  <button onClick={onAssignRsa} className="flex-1 text-sm flex items-center justify-center px-3 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-md hover:bg-indigo-100">
                    <PackagePlus className="w-4 h-4 mr-2" />Find/Bundle for RSA
                  </button>
                  {sortedScans.length > 0 && (
                     <div className="flex-1 relative" ref={scanButtonRef}>
                        <button onClick={handleScanButtonClick} className="w-full text-sm flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 font-semibold rounded-md hover:bg-blue-100">
                            <Scan className="w-4 h-4 mr-2" />
                            View Scan
                            {sortedScans.length > 1 && <ChevronDown className="w-4 h-4 ml-1" />}
                        </button>
                        <AnimatePresence>
                        {showScanOptions && (
                            <motion.ul 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute bottom-full mb-2 w-full bg-white border rounded-md shadow-lg z-10 overflow-hidden"
                            >
                                {sortedScans.map(scan => (
                                    <li key={scan.id}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewScan(scan.url, `${getCommonName(tree.species)} - ${scan.date}`);
                                                setShowScanOptions(false);
                                            }}
                                            className="w-full text-left text-sm px-3 py-2 hover:bg-gray-100"
                                        >
                                            Scan from {scan.date}
                                        </button>
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                        </AnimatePresence>
                    </div>
                  )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface TreeListProps {
  trees: Tree[];
  onEditTree: (tree: Tree) => void;
  onAssignRsa: (tree: Tree) => void;
  selectedTreeId: string | null;
  expandedTreeId: string | null;
  onTreeCardClick: (id: string) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  onViewScan: (url: string, title: string) => void;
}

const TreeList: React.FC<TreeListProps> = ({ trees, onEditTree, onAssignRsa, selectedTreeId, expandedTreeId, onTreeCardClick, itemRefs, onViewScan }) => {
  const { cartTreeIds, setCartTreeIds } = useStore();

  const selectedInCartIds = new Set(cartTreeIds);

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, treeId: string) => {
    const updatedSelectedIds = new Set(selectedInCartIds);
    if (e.target.checked) {
      updatedSelectedIds.add(treeId);
    } else {
      updatedSelectedIds.delete(treeId);
    }
    setCartTreeIds(Array.from(updatedSelectedIds));
  };

  return (
    <div className="space-y-3">
      {trees.map(tree => (
        <TreeCard 
          ref={(el) => itemRefs.current.set(tree.id, el)}
          key={tree.id}
          tree={tree}
          isSelected={selectedInCartIds.has(tree.id)}
          onSelect={(e) => handleSelectOne(e, tree.id)}
          isExpanded={expandedTreeId === tree.id}
          isActive={selectedTreeId === tree.id}
          onHeaderClick={() => onTreeCardClick(tree.id)}
          onEdit={() => onEditTree(tree)}
          onAssignRsa={() => onAssignRsa(tree)}
          onViewScan={onViewScan}
        />
      ))}
    </div>
  );
};

export default TreeList;