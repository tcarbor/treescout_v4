// components/TreeEditDrawer.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Tree, Recommendation, RecTemplate } from '../types';
import { useStore, pointInPolygon } from '../services/mockData';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, Trash2, LocateFixed, Search, ChevronDown, ImagePlus, Trash, Star, Key, Tag, MapPin, ChevronLeft, ChevronRight, Edit, Scan, UploadCloud, Calendar, FileText } from 'lucide-react';
import speciesList from './speciesList';
import LoadingSpinner from './LoadingSpinner';

const simpleId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; icon: React.ElementType }> = ({ label, checked, onChange, icon: Icon }) => (
    <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center">
            <Icon className={`w-5 h-5 mr-3 ${checked ? (label.includes('Landmark') ? 'text-yellow-500' : 'text-purple-500') : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
        </div>
    </label>
);


const InputField: React.FC<{
    label: string;
    field: string;
    value: any;
    onChange: (field: string, value: string) => void;
    type?: string;
    step?: string;
    placeholder?: string;
    list?: string;
}> = ({ label, field, value, onChange, type = "text", step, placeholder, list }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            step={step}
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            className="mt-1 block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-green-500 focus:border-green-500"
            placeholder={placeholder}
            list={list}
        />
    </div>
);

const RecommendationCard: React.FC<{
    recommendation: Recommendation;
    onDelete: () => void;
}> = ({ recommendation, onDelete }) => {
    const { recTemplates, updateRecommendationDetails } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [price, setPrice] = useState(recommendation.perVisitPrice);

    const template = recTemplates.find(t => t.id === recommendation.recTemplateId);

    useEffect(() => {
        setPrice(recommendation.perVisitPrice);
    }, [recommendation.perVisitPrice]);
    
    const frequencyText = useMemo(() => {
        if (!template) return '';
        const visits = template.visitsPerYear || 1;
        if (visits === 2) return "Bi-annual";
        if (visits === 3) return "Tri-annual";
        if (visits === 4) return "Quarterly";
        if (visits > 1) return `${visits} visits/year`;
        return template.category;
    }, [template]);

    const scheduleText = useMemo(() => {
        if (!recommendation.proposedYear) return '';
        const yearStr = String(recommendation.proposedYear).slice(-2);
        if (recommendation.proposedQuarter) {
            return `Q${recommendation.proposedQuarter} '${yearStr}`;
        }
        return `'${yearStr}`;
    }, [recommendation.proposedYear, recommendation.proposedQuarter]);

    if (!template) return null;
    
    const handleDetailChange = (field: 'notes' | 'proposedYear' | 'proposedQuarter', value: any) => {
        updateRecommendationDetails(recommendation.id, { [field]: value });
    }

    const handlePriceChange = (newPrice: number) => {
        if (!isNaN(newPrice)) {
            setPrice(newPrice);
        }
    }
    const handlePriceBlur = () => {
        if (price !== recommendation.perVisitPrice) {
            updateRecommendationDetails(recommendation.id, { perVisitPrice: price });
        }
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex-1">
                    <p className="font-semibold text-gray-800">{template.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                        <p className={`text-xs font-semibold rounded-full inline-block px-2 py-0.5 ${template.visitsPerYear && template.visitsPerYear > 1 ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 bg-gray-100'}`}>{frequencyText}</p>
                        {scheduleText && <p className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">{scheduleText}</p>}
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <p className="font-bold text-gray-800">${recommendation.perVisitPrice}</p>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                </div>
            </div>
             <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 space-y-3 border-t">
                             <div className="pt-2">
                                <label className="block text-xs font-medium text-gray-600">Price Override</label>
                                 <div className="relative mt-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => handlePriceChange(Number(e.target.value))}
                                        onBlur={handlePriceBlur}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                        className="w-full pl-6 p-1 border rounded-md text-sm border-gray-300 bg-white text-gray-900"
                                    />
                                </div>
                             </div>
                             <div>
                                <h4 className="block text-xs font-medium text-gray-600 mb-1 mt-2">Proposed Timing (Optional)</h4>
                                <div className="grid grid-cols-2 gap-2">
                                     <select value={recommendation.proposedYear || ''} onChange={e => handleDetailChange('proposedYear', e.target.value ? parseInt(e.target.value) : undefined)} className="block w-full text-sm p-1.5 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                        <option value="">Any Year</option>
                                        {[0, 1, 2, 3].map(i => <option key={i} value={new Date().getFullYear() + i}>{new Date().getFullYear() + i}</option>)}
                                    </select>
                                    <select value={recommendation.proposedQuarter || ''} onChange={e => handleDetailChange('proposedQuarter', e.target.value ? parseInt(e.target.value) as any : undefined)} className="block w-full text-sm p-1.5 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm">
                                        <option value="">Any Q</option>
                                        <option value="1">Q1</option>
                                        <option value="2">Q2</option>
                                        <option value="3">Q3</option>
                                        <option value="4">Q4</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600">Notes</label>
                                <textarea
                                    value={recommendation.notes || ''}
                                    onChange={(e) => handleDetailChange('notes', e.target.value)}
                                    rows={2}
                                    placeholder="e.g., focus on west side..."
                                    className="mt-1 block w-full text-sm p-1.5 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                                />
                            </div>
                            <button 
                                onClick={onDelete}
                                className="w-full text-xs text-red-600 hover:underline pt-2 border-t text-center"
                            >
                                Remove Recommendation
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CollapsibleSection: React.FC<{
    title: string;
    summary: React.ReactNode;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, summary, children, headerActions, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-lg border">
            <div className="w-full flex items-center justify-between p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                     {!isOpen && <div className="text-xs text-gray-500 mt-1 truncate flex items-center">{summary}</div>}
                </div>
                 <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    {!isOpen && <div onClick={e => e.stopPropagation()}>{headerActions}</div>}
                    <button>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t pt-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ScanUploader: React.FC<{ onUploadSuccess: (url: string) => void }> = ({ onUploadSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const startSimulation = useCallback(() => {
        setIsSimulating(true);
        setTimeout(() => {
            const mockUrl = 'https://storage.googleapis.com/kmz_overlays/potree_exports/auburn_roosevelt_oak_v7/auburn_roosevelt_oak_v7.html';
            onUploadSuccess(mockUrl);
            setIsSimulating(false);
        }, 3000); // Simulate a 3-second upload/process
    }, [onUploadSuccess]);

    const handleFileSelect = useCallback((file: File | null) => {
        if (file) {
            startSimulation();
        }
    }, [startSimulation]);
    
    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        handleFileSelect(e.dataTransfer.files?.[0] || null);
    }, [handleFileSelect]);


    if (isSimulating) {
        return (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
                <LoadingSpinner />
                <p className="text-sm font-semibold text-gray-700 mt-2">Processing scan...</p>
            </div>
        );
    }
    
    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
        >
            <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} className="hidden" />
            <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm font-semibold text-gray-700">Upload LiDAR Scan</p>
            <p className="text-xs text-gray-500 mt-1">Drag & drop a file or click</p>
        </div>
    );
};


const TreeEditDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tree: Partial<Tree> | null;
    isAddingNew: boolean;
    setTempLocation: (pos: {lat: number, lng: number}) => void;
    onViewScan: (url: string, title: string) => void;
}> = ({ isOpen, onClose, tree, isAddingNew, setTempLocation, onViewScan }) => {
    const { saveTree, deleteTree, recommendations, recTemplates, sections, removeRecommendationFromEditingTree, deleteRecommendation: deleteSavedRecommendation, setEditingTree } = useStore();
    const [speciesSearch, setSpeciesSearch] = useState('');
    const [isSpeciesListVisible, setSpeciesListVisible] = useState(false);
    const imagesContainerRef = useRef<HTMLDivElement>(null);
    const [newScanData, setNewScanData] = useState({ date: new Date().toISOString().split('T')[0], notes: '' });
    
    const propertySections = useMemo(() => sections.filter(s => s.propertyId === tree?.propertyId), [sections, tree]);

    useEffect(() => {
        setSpeciesSearch(tree?.species || '');
    }, [tree?.species]);

    // Auto-assign section based on location
    useEffect(() => {
        if (tree?.location) {
            const geoSections = propertySections.filter(s => s.coords);
            let foundSectionId;
            for (const section of geoSections) {
                if (pointInPolygon(tree.location, section.coords!)) {
                    foundSectionId = section.id;
                    break;
                }
            }
            // Only update if it's different, to allow manual overrides
            if (tree.sectionId !== foundSectionId) {
                setEditingTree({ ...tree, sectionId: foundSectionId });
            }
        }
    }, [tree?.location, propertySections, setEditingTree, tree]);
    
    const combinedRecommendations = useMemo(() => {
        if (!tree) return [];
        const savedRecs = tree.id ? recommendations.filter(r => r.treeIds?.includes(tree.id!)) : [];
        const tempRecs = tree.recommendations || [];
        // De-duplicate based on ID, preferring savedRecs
        const recMap = new Map();
        [...savedRecs, ...tempRecs].forEach(rec => recMap.set(rec.id, rec));
        return Array.from(recMap.values()).sort((a,b) => a.id.localeCompare(b.id));
    }, [recommendations, tree]);


    const handleSave = () => {
        if (tree) {
            saveTree(tree);
            onClose();
        }
    };
    
    const handleDelete = () => {
        if (tree?.id && window.confirm("Are you sure you want to delete this tree? This cannot be undone.")) {
            deleteTree(tree.id);
            onClose();
        }
    };

    const handleChange = (field: keyof Tree, value: any) => {
        if (tree) {
            // Special handler for tags string from input
            if (field === 'tags' && typeof value === 'string') {
                 const tagsArray = value.split(',').map(tag => tag.trim()).filter(Boolean);
                 setEditingTree({ ...tree, tags: tagsArray });
            } else {
                setEditingTree({ ...tree, [field]: value });
            }
        }
    };

    const handleSpeciesSelect = (species: string) => {
        handleChange('species', species);
        setSpeciesSearch(species);
        setSpeciesListVisible(false);
    }
    
    const handleSectionChange = (name: string) => {
        const existingSection = propertySections.find(s => s.name.toLowerCase() === name.toLowerCase());
        handleChange('sectionId', existingSection ? existingSection.id : name);
    };
    
    const currentSectionName = useMemo(() => {
        if (!tree?.sectionId) return '';
        const section = propertySections.find(s => s.id === tree.sectionId);
        return section?.name ?? tree.sectionId;
    }, [tree?.sectionId, propertySections]);


    const filteredSpecies = useMemo(() => {
        if (!isSpeciesListVisible) return [];
        if (!speciesSearch) {
            return speciesList;
        }
        return speciesList.filter(s => s.toLowerCase().includes(speciesSearch.toLowerCase())).slice(0, 10);
    }, [speciesSearch, isSpeciesListVisible]);

    const handleAddImage = () => {
        const url = prompt("Enter image URL:");
        if (url) {
            const newImages = [...(tree?.images || [])];
            newImages.push({ url });
            handleChange('images', newImages);
        }
    };

    const handleDeleteImage = (index: number) => {
        if (window.confirm("Remove this image?")) {
            const newImages = [...(tree?.images || [])];
            newImages.splice(index, 1);
            handleChange('images', newImages);
        }
    };

    const scrollImages = (direction: 'left' | 'right') => {
        if (imagesContainerRef.current) {
            const scrollAmount = direction === 'left' ? -200 : 200;
            imagesContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
    
    const handleAddScan = (url: string) => {
        if (!tree) return;
        const newScan = {
            id: `scan_${simpleId()}`,
            url,
            date: newScanData.date,
            notes: newScanData.notes
        };
        const updatedScans = [...(tree.lidarScans || []), newScan];
        handleChange('lidarScans', updatedScans);
        setNewScanData({ date: new Date().toISOString().split('T')[0], notes: '' });
    };

    const handleRemoveScan = (scanId: string) => {
        if (!tree) return;
        const updatedScans = tree.lidarScans?.filter(s => s.id !== scanId) || [];
        handleChange('lidarScans', updatedScans);
    };

    if (!isOpen || !tree) return null;
    
    const attributesSummary = (
        <div className="flex items-center space-x-2">
            {tree.isLandmark && <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />}
            {tree.isKeystone && <Key className="w-4 h-4 text-purple-500" />}
            {tree.tags?.slice(0, 2).map(tag => <span key={tag} className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs">{tag}</span>)}
            {tree.tags && tree.tags.length > 2 && <span className="text-gray-500 text-xs">...</span>}
        </div>
    );
    
    const locationSummary = (
         <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-xs">{tree.location ? `${tree.location.lat.toFixed(4)}, ${tree.location.lng.toFixed(4)}` : 'Not set'}</span>
        </div>
    )

    const locationActions = (
        <button onClick={() => navigator.geolocation.getCurrentPosition(pos => setTempLocation({lat: pos.coords.latitude, lng: pos.coords.longitude}))} className="text-blue-600 hover:text-blue-800" title="Use my current location"><LocateFixed className="w-4 h-4" /></button>
    );
    
    const getCommonName = (species: string = '') => species.match(/\(([^)]+)\)/)?.[1] || species;

    const primaryDetailsSummary = (
        <div className="flex items-center space-x-2">
            <span className="font-medium truncate">{getCommonName(tree.species) || 'No Species Selected'}</span>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-600">DBH: {tree.dbh ? `${tree.dbh}"` : 'N/A'}</span>
        </div>
    );

    const scanSummary = (
        <div className="flex items-center space-x-2">
            <Scan className={`w-4 h-4 ${tree.lidarScans && tree.lidarScans.length > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className={`${tree.lidarScans && tree.lidarScans.length > 0 ? 'text-gray-800' : 'text-gray-500'}`}>
                {tree.lidarScans?.length || 0} Scan{tree.lidarScans?.length !== 1 && 's'}
            </span>
        </div>
    );
    
    const sortedScans = useMemo(() => {
        return tree.lidarScans ? [...tree.lidarScans].sort((a,b) => b.date.localeCompare(a.date)) : [];
    }, [tree.lidarScans]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/30 z-40 md:hidden" />
                    <motion.div 
                        initial={{ y: '100%' }} 
                        animate={{ y: 0 }} 
                        exit={{ y: '100%' }} 
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
                        className="fixed bottom-0 left-0 right-0 md:absolute md:inset-0 bg-gray-100 z-50 shadow-2xl rounded-t-lg md:rounded-none flex flex-col"
                    >
                        <header className="p-4 border-b flex justify-between items-center flex-shrink-0 bg-white">
                            <h2 className="text-lg font-bold text-gray-800">{isAddingNew ? 'Add New Tree' : 'Edit Tree'}</h2>
                            <button onClick={onClose} className="p-1"><X className="w-5 h-5 text-gray-500" /></button>
                        </header>
                        
                        <main className="p-4 space-y-4 overflow-y-auto flex-1">
                            {/* --- SECTION: Primary Details (collapsible) --- */}
                             <CollapsibleSection title="Primary Details" summary={primaryDetailsSummary} defaultOpen={isAddingNew || !tree.species || !tree.dbh}>
                                <div className="space-y-4">
                                     <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700">Species</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input type="text" value={speciesSearch} onChange={(e) => {setSpeciesSearch(e.target.value); setSpeciesListVisible(true)}} onFocus={() => setSpeciesListVisible(true)} onBlur={() => setTimeout(() => setSpeciesListVisible(false), 200)} className="mt-1 block w-full pl-9 p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-green-500 focus:border-green-500" />
                                        </div>
                                        {isSpeciesListVisible && filteredSpecies.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-auto">
                                                {filteredSpecies.map(s => <li key={s} onMouseDown={() => handleSpeciesSelect(s)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">{s}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="DBH (in)" field="dbh" value={tree.dbh} onChange={(f,v) => handleChange(f as any, parseFloat(v))} type="number" step="0.1" />
                                        <InputField label="Height (ft)" value={tree.height} field="height" onChange={(f,v) => handleChange(f as any, parseFloat(v))} type="number" step="1" />
                                    </div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Condition</label>
                                            <select value={tree.condition || 'Fair'} onChange={(e) => handleChange('condition', e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm text-gray-900 focus:ring-green-500 focus:border-green-500">
                                                <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
                                            </select>
                                        </div>
                                        <InputField 
                                            label="Section"
                                            field="section"
                                            value={currentSectionName}
                                            onChange={(f,v) => handleSectionChange(v)}
                                            placeholder="Select or type..."
                                            list="sections-datalist"
                                        />
                                        <datalist id="sections-datalist">
                                            {propertySections.map(sec => <option key={sec.id} value={sec.name} />)}
                                        </datalist>
                                    </div>
                                </div>
                            </CollapsibleSection>

                            {/* --- SECTION: Attributes (collapsible) --- */}
                            <CollapsibleSection title="Attributes" summary={attributesSummary}>
                                <div className="space-y-3">
                                    <InputField 
                                        label="Tags"
                                        field="tags"
                                        value={tree.tags?.join(', ') || ''}
                                        onChange={(f,v) => handleChange(f as any, v)}
                                        placeholder="priority, needs_pruning"
                                    />
                                    <ToggleSwitch label="Landmark Tree" checked={!!tree.isLandmark} onChange={(c) => handleChange('isLandmark', c)} icon={Star} />
                                    <ToggleSwitch label="Keystone Species" checked={!!tree.isKeystone} onChange={(c) => handleChange('isKeystone', c)} icon={Key} />
                                </div>
                            </CollapsibleSection>
                            
                             {/* --- SECTION: Location (collapsible) --- */}
                             <CollapsibleSection title="Location" summary={locationSummary} headerActions={locationActions}>
                                <p className="text-xs text-gray-500 mt-2">Click the GPS icon or drag the pin on the map to set location.</p>
                            </CollapsibleSection>
                            
                            {/* --- SECTION: 3D Scan --- */}
                           <CollapsibleSection title="3D Scans & Data" summary={scanSummary}>
                               <div className="space-y-3">
                                   {sortedScans.map(scan => (
                                       <div key={scan.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-blue-800 flex items-center"><Calendar className="w-4 h-4 mr-2" />{scan.date}</p>
                                                    {scan.notes && <p className="text-sm text-blue-700 mt-1 flex items-start"><FileText className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"/>{scan.notes}</p>}
                                                </div>
                                                 <button onClick={() => handleRemoveScan(scan.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full flex-shrink-0"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                           <button onClick={() => onViewScan(scan.url, `${getCommonName(tree.species)} - ${scan.date}`)} className="mt-2 w-full text-sm flex items-center justify-center px-3 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                                                <Scan className="w-4 h-4 mr-2" />
                                                View Scan
                                           </button>
                                       </div>
                                   ))}
                                   
                                   <div className="pt-4 mt-4 border-t space-y-3">
                                       <h4 className="font-semibold text-gray-800">Add New Scan</h4>
                                       <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Scan Date</label>
                                                <input type="date" value={newScanData.date} onChange={e => setNewScanData({...newScanData, date: e.target.value})} className="mt-1 block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" />
                                            </div>
                                       </div>
                                       <div>
                                            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                            <textarea value={newScanData.notes} onChange={e => setNewScanData({...newScanData, notes: e.target.value})} rows={2} className="mt-1 block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" placeholder="e.g., Annual checkup, post-storm damage" />
                                       </div>
                                       <ScanUploader onUploadSuccess={handleAddScan} />
                                   </div>
                               </div>
                           </CollapsibleSection>
                            
                            {/* --- SECTION: Images --- */}
                            <div className="p-4 bg-white rounded-lg border">
                                <h3 className="text-base font-semibold text-gray-800 mb-4">Images</h3>
                                <div className="relative">
                                    <div ref={imagesContainerRef} className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth" style={{scrollSnapType: 'x mandatory'}}>
                                        {tree.images?.map((img, idx) => (
                                            <div key={img.url} className="relative flex-shrink-0" style={{scrollSnapAlign: 'start'}}>
                                                <img src={img.url} className="w-28 h-28 object-cover rounded-md border"/>
                                                <button onClick={() => handleDeleteImage(idx)} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-1 shadow-md">
                                                    <Trash className="w-3 h-3"/>
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={handleAddImage} className="w-28 h-28 border-2 border-dashed rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-50 flex-shrink-0" style={{scrollSnapAlign: 'start'}}>
                                            <ImagePlus className="w-8 h-8"/>
                                        </button>
                                    </div>
                                    {tree.images && tree.images.length > 0 && (
                                        <>
                                        <button onClick={() => scrollImages('left')} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full shadow-md p-1.5 border hover:bg-gray-100"><ChevronLeft className="w-4 h-4"/></button>
                                        <button onClick={() => scrollImages('right')} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white rounded-full shadow-md p-1.5 border hover:bg-gray-100"><ChevronRight className="w-4 h-4"/></button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* --- SECTION: Services --- */}
                             <div className="p-4 bg-white rounded-lg border">
                                <h3 className="text-base font-semibold text-gray-800 mb-2">Services & Recommendations</h3>
                                <div className="space-y-3">
                                    {combinedRecommendations.length > 0 ? (
                                        combinedRecommendations.map(rec => {
                                            const isTemporary = !recommendations.some(savedRec => savedRec.id === rec.id);
                                            return <RecommendationCard key={rec.id} recommendation={rec} onDelete={() => isTemporary ? removeRecommendationFromEditingTree(rec.id) : deleteSavedRecommendation(rec.id)} />;
                                        })
                                    ) : (
                                        <p className="text-sm text-gray-500 italic text-center p-4 bg-gray-50 rounded-md">Use the sidebar to add services to this tree.</p>
                                    )}
                                </div>
                            </div>

                        </main>
                        <footer className="p-4 bg-white border-t flex justify-between items-center flex-shrink-0">
                            <div>
                                {!isAddingNew && <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200"><Trash2 className="w-4 h-4" /></button>}
                            </div>
                            <div className="flex">
                                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 mr-3">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 flex items-center">
                                    <Save className="w-4 h-4 inline mr-2" />
                                    {isAddingNew ? 'Add Tree' : 'Save Changes'}
                                </button>
                            </div>
                        </footer>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TreeEditDrawer;