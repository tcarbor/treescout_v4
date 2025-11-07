// components/TreesTab.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Property, Tree, Section, Recommendation, RsaProgram } from '../types';
import { useStore, TreeFilters, pointInPolygon } from '../services/mockData';
import TreeList from './TreeListItem';
import TreeEditDrawer from './TreeEditDrawer';
import BulkActionBar from './BulkActionBar';
import BulkEditDrawer from './BulkEditDrawer';
import RsaAssignmentModal from './RsaAssignmentModal';
import BulkRsaAssignmentDrawer from './BulkRsaAssignmentDrawer';
import { PlusCircle, Search, MapPin, LocateFixed, Eye, EyeOff, X, Save, Layers, Filter, Trash2, Edit, Check, ChevronDown, MousePointer, Slash, Edit2, Palette, Star, Key, AlertTriangle, Scan } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { AnimatePresence, motion } from 'framer-motion';
import LidarModal from './LidarModal';

// --- ICONS ---
const tempIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const vertexIcon = new L.DivIcon({
    className: 'leaflet-div-icon leaflet-vertex-icon',
    html: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const xIcon = new L.DivIcon({ 
    html: '&#10005;', 
    className: 'original-location-marker', 
    iconSize: [24, 24],
    iconAnchor: [12, 12] 
});

const createMarkerIcon = (style: string, className: string = '', adornment: string = '') => {
    return new L.DivIcon({
        html: `<div class="custom-div-icon">
            <img src="https://cdn-icons-png.flaticon.com/512/484/484167.png" style="${style}"/>
            ${adornment}
        </div>`,
        className: `custom-div-icon-wrapper ${className}`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

const getCommonName = (species: string = '') => species.match(/\(([^)]+)\)/)?.[1] || species;


// --- MAP COMPONENTS ---

const DraggableTempMarker = ({ position, setPosition }) => {
    const markerRef = useRef<L.Marker>(null);
    const map = useMap();
    const eventHandlers = useMemo(() => ({
        dragend() {
             const marker = markerRef.current;
            if (marker != null) {
                const { lat, lng } = marker.getLatLng();
                setPosition({ lat, lng });
                map.panTo({ lat, lng });
            }
        }
    }), [setPosition, map]);

    useEffect(() => {
        if(position) map.flyTo(position, 18);
    }, [position, map])

    return position ? (
        <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} icon={tempIcon}>
            <Popup>Drag to set tree location</Popup>
        </Marker>
    ) : null;
};

const MapDrawHandler = ({ drawMode, points, setPoints, finishDrawing, drawColor='blue' }) => {
    useMapEvents({
        click(e) {
            if (drawMode !== 'none') {
                setPoints([...points, { lat: e.latlng.lat, lng: e.latlng.lng }]);
            }
        },
        dblclick() {
            if (drawMode !== 'none' && points.length > 2) {
                finishDrawing(points);
            }
        },
    });
    return points.length > 0 ? <Polygon positions={points} pathOptions={{ color: drawColor, dashArray: '5, 5' }} /> : null;
};

const EditablePolygon = ({ section, setCoords, onSave, onCancel }) => {
    const [localCoords, setLocalCoords] = useState(section.coords);

    const handleDrag = (index, event) => {
        const newCoords = [...localCoords];
        newCoords[index] = event.latlng;
        setLocalCoords(newCoords);
        setCoords(newCoords); // Propagate up for real-time view if needed
    };

    return <>
        <Polygon positions={localCoords} pathOptions={{ color: 'orange', weight: 3, dashArray: '5' }} />
        {localCoords.map((pos, index) => (
            <Marker
                key={index}
                position={pos}
                draggable
                icon={vertexIcon}
                eventHandlers={{ drag: (e) => handleDrag(index, e) }}
            />
        ))}
    </>;
};


const MapContents = ({ trees, sections, sectionsVisible, tempLocation, setTempLocation, selectedTreeId, onMarkerClick, onEditTree, onViewScan, drawMode, drawPoints, setDrawPoints, finishDrawing, drawColor, cartTreeIds, toggleTreeInCart, selectionPolygon, editingSectionShape, setEditingSectionShapeCoords, editingTree, originalEditLocation, treeIcons }) => {
    const map = useMap();
    const { setCartTreeIds, isBulkAssigningRsa } = useStore();

    useMapEvents({
        click(e) {
            if (cartTreeIds.length > 1 && !isBulkAssigningRsa) {
                setCartTreeIds([]);
            }
        }
    });

    useEffect(() => {
        const selectedTree = trees.find(t => t.id === selectedTreeId);
        if (selectedTree?.location && cartTreeIds.length <= 1) {
            map.flyTo(selectedTree.location, 18);
        }
    }, [selectedTreeId, trees, map]);

    useEffect(() => {
        if (cartTreeIds.length > 1) {
            map.eachLayer(layer => {
                if (layer instanceof L.Popup) {
                    map.closePopup(layer);
                }
            });
            const locations = trees
                .filter(t => cartTreeIds.includes(t.id) && t.location)
                .map(t => t.location!);
            if (locations.length > 0) {
                map.fitBounds(L.latLngBounds(locations), { padding: [50, 50] });
            }

        }
    }, [cartTreeIds, trees, map]);

    const sectionColors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c'];

    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                maxZoom={22}
            />
            {sectionsVisible && sections.map((section, index) => {
                if (section.id === editingSectionShape?.id) return null; // Don't render the static one while editing
                return section.coords && <Polygon key={section.id} positions={section.coords} pathOptions={{ color: sectionColors[index % sectionColors.length], weight: 2, fillOpacity: 0.2 }}>
                    <Popup>{section.name}</Popup>
                </Polygon>
            })}
             {editingSectionShape && (
                <EditablePolygon section={editingSectionShape} setCoords={setEditingSectionShapeCoords} onSave={() => {}} onCancel={() => {}} />
            )}
            {trees.map(tree => {
                if (tree.id === editingTree?.id) return null; // Hide standard marker while editing
                return tree.location && (
                    <Marker key={tree.id} position={tree.location} 
                        icon={treeIcons.get(tree.id)!} 
                        eventHandlers={{ click: (e) => onMarkerClick(tree, e) }}>
                        {cartTreeIds.length <= 1 &&
                            <Popup>
                                <div className="text-sm w-48">
                                    <h4 className="font-bold text-base mb-1">{tree.species}</h4>
                                    {tree.images && tree.images.length > 0 && (
                                      <div className="flex space-x-2 overflow-x-auto pb-2 my-2 scroll-smooth" style={{scrollSnapType: 'x mandatory'}}>
                                        {tree.images.map((img, idx) => (
                                          <img key={idx} src={img.url} alt={img.caption || `Tree ${tree.id}`} className="w-40 h-32 object-cover rounded-md flex-shrink-0" style={{scrollSnapAlign: 'start'}} />
                                        ))}
                                      </div>
                                    )}
                                    <p><span className="font-semibold">DBH:</span> {tree.dbh}"</p>
                                    <p><span className="font-semibold">Condition:</span> {tree.condition}</p>
                                    <button onClick={() => onEditTree(tree)} className="mt-2 text-sm w-full font-semibold text-green-600 hover:text-green-800">
                                        View / Edit Details
                                    </button>
                                    {tree.lidarScans && tree.lidarScans.length > 0 && (
                                        <div className="mt-2 pt-2 border-t">
                                            {[...tree.lidarScans].sort((a, b) => b.date.localeCompare(a.date)).map(scan => (
                                                <button key={scan.id} onClick={() => onViewScan(scan.url, `${getCommonName(tree.species)} - ${scan.date}`)} className="text-sm w-full font-semibold text-blue-600 hover:text-blue-800 text-left py-1">
                                                    View Scan ({scan.date})
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        }
                    </Marker>
                )
            })}
            {editingTree && originalEditLocation && <Marker position={originalEditLocation} icon={xIcon} />}
            {selectionPolygon && <Polygon positions={selectionPolygon} pathOptions={{ color: '#2ecc71', weight: 2, fillOpacity: 0.3 }} />}
            <DraggableTempMarker position={tempLocation} setPosition={setTempLocation} />
            <MapDrawHandler drawMode={drawMode} points={drawPoints} setPoints={setDrawPoints} finishDrawing={finishDrawing} drawColor={drawColor} />
        </>
    );
};

const TreeMap: React.FC<{ property: Property, trees: Tree[], sections: Section[], sectionsVisible: boolean, tempLocation: any, setTempLocation: any, selectedTreeId: string | null, onMarkerClick: (tree: Tree, e: L.LeafletMouseEvent) => void, onEditTree: (tree: Tree) => void, onViewScan: (url: string, title: string) => void, drawMode: 'none' | 'section' | 'bulkSelect', drawPoints: any[], setDrawPoints: (points: any[]) => void, finishDrawing: (points: any[]) => void, drawColor?: string, cartTreeIds: string[], toggleTreeInCart: (id: string) => void, selectionPolygon: any[] | null, editingSectionShape: any, setEditingSectionShapeCoords: (coords: any[]) => void, editingTree: Partial<Tree> | null, originalEditLocation: {lat: number, lng: number} | null, treeIcons: Map<string, L.DivIcon> }> = (props) => {
    const defaultCenter = props.property.location || { lat: 34.0522, lng: -118.2437 };
    return (
        <MapContainer center={defaultCenter} zoom={16} maxZoom={22} scrollWheelZoom={true} className={props.drawMode !== 'none' ? 'cursor-crosshair' : ''}>
            <MapContents {...props} />
        </MapContainer>
    );
};


// --- COLLAPSIBLE PANEL COMPONENT ---

const CollapsiblePanel: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode }> = ({ title, icon: Icon, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border rounded-lg bg-gray-50 flex-shrink-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 font-bold text-gray-700">
                <span className="flex items-center"><Icon className="w-5 h-5 mr-2" />{title}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 border-t">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- PANELS ---

const MapSectionsPanel: React.FC<{ sections: Section[], onEditShape: (section: Section) => void, sectionColors: string[] }> = ({ sections, onEditShape, sectionColors }) => {
    const { updateSection, deleteSection } = useStore();
    const [editingSectionId, setEditingSectionId] = useState<string|null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
    const [name, setName] = useState('');
    const confirmDeleteTimer = useRef<number>();

    const handleEdit = (section: Section) => {
        setEditingSectionId(section.id);
        setName(section.name);
    }

    const handleSave = () => {
        if (editingSectionId) {
            updateSection(editingSectionId, { name });
        }
        setEditingSectionId(null);
        setName('');
    }

    const handleDeleteClick = (sectionId: string) => {
        clearTimeout(confirmDeleteTimer.current);
        if (confirmDeleteId === sectionId) {
            deleteSection(sectionId);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(sectionId);
            confirmDeleteTimer.current = window.setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    }

    return (
        <div className="space-y-2">
            {sections.map((section, index) => (
                <div key={section.id} className="p-2 bg-white rounded-md border-l-4" style={{borderColor: sectionColors[index % sectionColors.length]}}>
                    <div className="flex items-center justify-between">
                        {editingSectionId === section.id ? (
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="text-sm p-1 border rounded w-full" autoFocus onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} />
                        ) : (
                            <span className="text-sm font-medium">{section.name}</span>
                        )}
                        <div className="flex items-center space-x-1">
                            {editingSectionId === section.id ? (
                                <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded"><Check className="w-4 h-4"/></button>
                            ) : (
                                <button onClick={() => handleEdit(section)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Edit Name"><Edit className="w-4 h-4"/></button>
                            )}
                            {section.coords && <button onClick={() => onEditShape(section)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit Shape"><Edit2 className="w-4 h-4"/></button>}
                            
                            {confirmDeleteId === section.id ? (
                                <button onClick={() => handleDeleteClick(section.id)} className="p-1 text-white bg-red-600 rounded flex items-center text-xs px-2" title="Confirm Delete"><AlertTriangle className="w-4 h-4 mr-1"/> Confirm?</button>
                            ) : (
                                <button onClick={() => handleDeleteClick(section.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete Section"><Trash2 className="w-4 h-4"/></button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            {sections.length === 0 && <p className="text-xs text-gray-500 text-center">No sections created yet.</p>}
        </div>
    )
}

const AdvancedFiltersPanel: React.FC<{ propertyId: string }> = ({ propertyId }) => {
    const { treeFilters, setTreeFilters, clearTreeFilters, recTemplates, planItems } = useStore();
    
    const { rsaPrograms, oneOffRecs } = useMemo(() => {
        const propertyPlanItems = planItems.filter(p => p.propertyId === propertyId);
        const rsaProgramsMap = new Map<string, {name: string, id: string}>();
        const oneOffRecsMap = new Map<string, {name: string, id: string}>();

        propertyPlanItems.forEach(item => {
            const template = recTemplates.find(t => t.id === item.recTemplateId);
            if (!template) return;
            if (item.schedule.type === 'rsa') {
                const programId = `rsa-${template.id}`;
                if (!rsaProgramsMap.has(programId)) {
                    rsaProgramsMap.set(programId, { name: template.name, id: programId });
                }
            } else {
                 if (!oneOffRecsMap.has(template.id)) {
                    oneOffRecsMap.set(template.id, { name: template.name, id: template.id });
                }
            }
        });
        return { rsaPrograms: Array.from(rsaProgramsMap.values()), oneOffRecs: Array.from(oneOffRecsMap.values()) };
    }, [propertyId, planItems, recTemplates]);
    
    const handleFilterChange = (key: keyof TreeFilters, value: any) => {
        setTreeFilters({ [key]: value });
    }

    const currentYear = new Date().getFullYear();
    const filterInputClass = "w-full text-sm p-1.5 border rounded-md bg-white text-gray-900 border-gray-300";

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <select value={treeFilters.rsaProgramId || ''} onChange={e => handleFilterChange('rsaProgramId', e.target.value)} className={filterInputClass}>
                    <option value="">Filter by RSA Program...</option>
                    {rsaPrograms.map(p => <option key={p.id} value={p.id.split('-')[1]}>{p.name}</option>)}
                </select>
                <select value={treeFilters.recTemplateId || ''} onChange={e => handleFilterChange('recTemplateId', e.target.value)} className={filterInputClass}>
                    <option value="">Filter by One-Off Rec...</option>
                    {oneOffRecs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                 <select value={treeFilters.year || ''} onChange={e => handleFilterChange('year', Number(e.target.value))} className={filterInputClass}>
                    <option value="">Any Year</option>
                    {[0,1,2,3].map(i => <option key={currentYear + i} value={currentYear + i}>{currentYear + i}</option>)}
                </select>
                 <select value={treeFilters.quarter || ''} onChange={e => handleFilterChange('quarter', Number(e.target.value) as any)} className={filterInputClass}>
                    <option value="">Any Quarter</option>
                    <option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option>
                </select>
            </div>
            <div>
                 <label className="text-xs font-semibold text-gray-600">DBH Range (inches)</label>
                 <div className="flex items-center space-x-2 mt-1">
                    <input type="number" placeholder="Min" value={treeFilters.dbhMin || ''} onChange={e => handleFilterChange('dbhMin', Number(e.target.value))} className={filterInputClass} />
                    <span className="text-gray-400">-</span>
                    <input type="number" placeholder="Max" value={treeFilters.dbhMax || ''} onChange={e => handleFilterChange('dbhMax', Number(e.target.value))} className={filterInputClass} />
                 </div>
            </div>
            <button onClick={clearTreeFilters} className="w-full flex items-center justify-center text-sm p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold">
                <Slash className="w-4 h-4 mr-2"/>Clear All Filters
            </button>
        </div>
    )
}


// --- MAIN TAB COMPONENT ---
type ColorMode = 'none' | 'species' | 'condition' | 'dbh' | 'recommendation';


const TreesTab: React.FC<{ property: Property }> = ({ property }) => {
  const { trees: allTrees, sections: allSections, editingTree, setEditingTree, addSection, cartTreeIds, setCartTreeIds, toggleTreeInCart, treeFilters, planItems, recTemplates, targetSets, updateSection, recommendations, isBulkEditing, isBulkAssigningRsa, bulkRsaWorkingTreeIds, toggleTreeInBulkRsaWorkingSet } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);
  const [originalEditLocation, setOriginalEditLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [expandedTreeId, setExpandedTreeId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<'none' | 'section' | 'bulkSelect'>('none');
  const [drawPoints, setDrawPoints] = useState<{lat: number, lng: number}[]>([]);
  const [sectionsVisible, setSectionsVisible] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [selectionPolygon, setSelectionPolygon] = useState<{lat: number, lng: number}[] | null>(null);
  
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionPoints, setSectionPoints] = useState<{lat: number, lng: number}[]>([]);
  const [editingSectionShape, setEditingSectionShape] = useState<{id: string, name: string, coords: any[]} | null>(null);

  const [assigningRsaTree, setAssigningRsaTree] = useState<Tree | null>(null);
  const [focusedRsaProgramForBulk, setFocusedRsaProgramForBulk] = useState<RsaProgram | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('none');
  const itemRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [lidarModalData, setLidarModalData] = useState<{ url: string, title: string } | null>(null);

  const handleViewScan = (url: string, title: string) => {
    setLidarModalData({ url, title });
  };


  const propertyTrees = useMemo(() => allTrees.filter(t => t.propertyId === property.id), [allTrees, property.id]);
  const propertySections = useMemo(() => allSections.filter(s => s.propertyId === property.id), [allSections, property.id]);
  const sectionColors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c'];
  
  const filteredAndSortedTrees = useMemo(() => {
      let filtered = propertyTrees.filter(tree => {
        // Search Term
        if (searchTerm && !(tree.species?.toLowerCase().includes(searchTerm.toLowerCase()) || tree.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))) {
            return false;
        }

        // DBH
        if (treeFilters.dbhMin && tree.dbh < treeFilters.dbhMin) return false;
        if (treeFilters.dbhMax && tree.dbh > treeFilters.dbhMax) return false;

        // Plan & Recommendation Filters
        const treePlanItems = planItems.filter(pi => {
            const targetSet = useStore.getState().targetSets.find(ts => ts.id === pi.targetSetId);
            return targetSet?.treeIds.includes(tree.id);
        });
        const treeRecs = recommendations.filter(r => r.treeIds?.includes(tree.id));

        if (treeFilters.rsaProgramId && !treePlanItems.some(pi => pi.schedule.type === 'rsa' && pi.recTemplateId === treeFilters.rsaProgramId)) return false;
        if (treeFilters.recTemplateId && !treePlanItems.some(pi => pi.schedule.type === 'oneOff' && pi.recTemplateId === treeFilters.recTemplateId)) return false;
        
        if (treeFilters.year) {
            const hasMatchingItem = treePlanItems.some(pi => pi.schedule.year === treeFilters.year) || treeRecs.some(rec => rec.proposedYear === treeFilters.year);
            if (!hasMatchingItem) return false;
        }
        if (treeFilters.quarter) {
            const hasMatchingItem = treePlanItems.some(pi => pi.schedule.quarter === treeFilters.quarter) || treeRecs.some(rec => rec.proposedQuarter === treeFilters.quarter);
            if (!hasMatchingItem) return false;
        }

        return true;
      });
      
      // Sort to bring selected trees to the top
      const cartSet = new Set(cartTreeIds);
      return [...filtered].sort((a, b) => {
        const aInCart = cartSet.has(a.id);
        const bInCart = cartSet.has(b.id);
        if (aInCart && !bInCart) return -1;
        if (!aInCart && bInCart) return 1;
        return a.species.localeCompare(b.species);
      });

  }, [propertyTrees, searchTerm, treeFilters, planItems, cartTreeIds, recommendations]);

  const handleEditTree = (tree: Tree) => {
    setEditingTree(tree);
    setTempLocation(tree.location || null);
    setOriginalEditLocation(tree.location || null);
    setSelectedTreeId(tree.id);
  };

  const handleAddNewTree = () => {
    const mapCenter = property.location || { lat: 34.0522, lng: -118.2437 };
    setEditingTree({ propertyId: property.id, condition: 'Fair' as const, recommendations: [], location: mapCenter });
    setTempLocation(mapCenter);
    setOriginalEditLocation(null);
  }

  const handleCloseDrawer = () => {
    setEditingTree(null);
    setTempLocation(null);
    setOriginalEditLocation(null);
  };

  const handleTreeCardClick = (treeId: string) => {
      setSelectedTreeId(treeId);
      setExpandedTreeId(prevId => prevId === treeId ? null : treeId);
  };

  const handleMarkerClick = (tree: Tree, e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    if (isBulkAssigningRsa) {
        toggleTreeInBulkRsaWorkingSet(tree.id);
        return;
    }
    if (e.originalEvent.metaKey || e.originalEvent.ctrlKey) {
        toggleTreeInCart(tree.id);
    } else {
        setSelectedTreeId(tree.id);
        setExpandedTreeId(tree.id);
        if (cartTreeIds.length > 1 || !cartTreeIds.includes(tree.id)) {
            setCartTreeIds([tree.id]);
        }
    }
  };
  
  const treeIcons = useMemo(() => {
    const icons = new Map<string, L.DivIcon>();
    
    // Bulk RSA Assignment Mode Highlighting
    if (isBulkAssigningRsa) {
        const workingSet = new Set(bulkRsaWorkingTreeIds);
        const programMemberIds = new Set(targetSets.find(ts => ts.id === focusedRsaProgramForBulk?.targetSetId)?.treeIds || []);

        allTrees.forEach(tree => {
            let specialFilter = '';
            let className = '';
            let adornment = '';

            if (workingSet.has(tree.id)) {
                if (programMemberIds.has(tree.id)) {
                    // Selected & In Program: Green glow + Checkmark
                    className = 'bulk-rsa-in-program-marker';
                    adornment = `<div class="adornment" style="background-color: #10B981;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                 </div>`;
                } else {
                    // Selected & NOT in Program: Blue glow + Plus sign
                    className = 'bulk-rsa-not-in-program-marker';
                     adornment = `<div class="adornment" style="background-color: #3B82F6;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                                 </div>`;
                }
            } else {
                // Not Selected (Dimmed)
                specialFilter = 'opacity(0.5)';
            }
             const finalStyle = `width: 32px; height: 32px; filter: ${specialFilter};`;
             icons.set(tree.id, createMarkerIcon(finalStyle, className, adornment));
        });
        return icons;
    }
    
    // Standard Mode Highlighting
    const speciesColorCache = new Map<string, number>();
    const recCategoryColorCache = new Map<string, number>([
        ['PHC', 260], ['Pruning', 30], ['Removal', 0], ['General', 180]
    ]);
    const conditionColorCache = new Map<string, number>([
        ['Excellent', 120], ['Good', 200], ['Fair', 50], ['Poor', 0]
    ]);
    
    const stringToHue = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash % 360;
    };

    const currentCartIds = new Set(cartTreeIds);

    filteredAndSortedTrees.forEach(tree => {
        const isSelected = currentCartIds.has(tree.id);
        const isActive = selectedTreeId === tree.id && cartTreeIds.length <= 1;
        
        let colorFilter = '';
        let specialFilter = '';
        let className = isActive ? 'selected-tree-marker' : isSelected ? 'carted-tree-marker' : '';

        if (colorMode !== 'none') {
            let hue: number | undefined;
            if (colorMode === 'species') {
                if (!speciesColorCache.has(tree.species)) {
                    speciesColorCache.set(tree.species, stringToHue(tree.species));
                }
                hue = speciesColorCache.get(tree.species);
            } else if (colorMode === 'condition') {
                hue = conditionColorCache.get(tree.condition);
            } else if (colorMode === 'dbh') {
                if (tree.dbh < 12) hue = 210; // blue
                else if (tree.dbh <= 24) hue = 60; // yellow
                else hue = 0; // red
            } else if (colorMode === 'recommendation') {
                const rec = recommendations.find(r => r.treeIds?.includes(tree.id));
                if (rec) {
                    const template = useStore.getState().recTemplates.find(t => t.id === rec.recTemplateId);
                    hue = recCategoryColorCache.get(template?.category || 'General');
                }
            }
            if (hue !== undefined) {
                 colorFilter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
            }
        }

        if (!isActive && !isSelected) { // Don't apply special glows if already selected/carted
            if (tree.isLandmark) {
                specialFilter = 'drop-shadow(0 0 4px #f59e0b) drop-shadow(0 0 1px #f59e0b)';
            } else if (tree.isKeystone) {
                specialFilter = 'drop-shadow(0 0 4px #8b5cf6) drop-shadow(0 0 1px #8b5cf6)';
            }
        }
        
        const iconSize = isActive ? '40px' : '32px';
        const finalStyle = `width: ${iconSize}; height: ${iconSize}; filter: ${specialFilter} ${colorFilter};`;
        
        const newIcon = createMarkerIcon(finalStyle, className);
        icons.set(tree.id, newIcon);
    });

    return icons;
}, [filteredAndSortedTrees, allTrees, colorMode, cartTreeIds, selectedTreeId, recommendations, isBulkAssigningRsa, bulkRsaWorkingTreeIds, focusedRsaProgramForBulk, targetSets]);


  const finishDrawing = (points: {lat: number, lng: number}[]) => {
      if (points.length <= 2) {
        setDrawMode('none');
        setDrawPoints([]);
        return;
      };

      if (drawMode === 'section') {
          setSectionPoints(points);
          setIsSectionModalOpen(true);
      } else if (drawMode === 'bulkSelect') {
          const selectedIds = propertyTrees.filter(t => t.location && pointInPolygon(t.location, points)).map(t => t.id);
          const currentCart = new Set(cartTreeIds);
          selectedIds.forEach(id => currentCart.add(id));
          setCartTreeIds(Array.from(currentCart));
          setToastMessage(`${selectedIds.length} trees added to selection.`);
          setSelectionPolygon(points);
          setTimeout(() => setSelectionPolygon(null), 2000);
      }

      setDrawMode('none');
      setDrawPoints([]);
  }
  
  const handleSaveSection = () => {
      if (sectionName && sectionPoints.length > 2) {
          addSection({ name: sectionName, propertyId: property.id, coords: sectionPoints });
          setToastMessage(`Section '${sectionName}' created!`);
      }
      handleCancelSection();
  };

  const handleCancelSection = () => {
      setIsSectionModalOpen(false);
      setSectionName('');
      setSectionPoints([]);
  };

  const handleEditSectionShape = (section: Section) => {
    if (section.coords) {
        setEditingSectionShape({ id: section.id, name: section.name, coords: section.coords });
    }
  };

  const handleSaveShape = () => {
    if (editingSectionShape) {
        updateSection(editingSectionShape.id, { coords: editingSectionShape.coords });
        setToastMessage(`Updated shape for ${editingSectionShape.name}.`);
        setEditingSectionShape(null);
    }
  }

  useEffect(() => {
    if (toastMessage) {
        const timer = setTimeout(() => setToastMessage(''), 3000);
        return () => clearTimeout(timer);
    }
  }, [toastMessage]);


  useEffect(() => {
      if (editingTree && tempLocation && (editingTree.location?.lat !== tempLocation.lat || editingTree.location?.lng !== tempLocation.lng)) {
          setEditingTree({ ...editingTree, location: tempLocation });
      }
  }, [tempLocation, editingTree, setEditingTree]);
  
  useEffect(() => {
    if (selectedTreeId) {
        const itemRef = itemRefs.current.get(selectedTreeId);
        if (itemRef) {
            itemRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [selectedTreeId]);

  return (
    <div className="relative h-[calc(100vh-210px)]">
      {isSectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">Create New Section</h3>
                <input 
                    type="text" 
                    value={sectionName} 
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="Enter section name"
                    className="w-full p-2 border rounded-md mb-4 bg-white text-gray-900"
                    autoFocus
                />
                <div className="flex justify-end space-x-2">
                    <button onClick={handleCancelSection} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSaveSection} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700">Save Section</button>
                </div>
            </motion.div>
        </div>
      )}

      <div className="flex gap-6 h-full">
        {/* Left Panel */}
        <div className="w-full md:w-1/3 h-full flex flex-col bg-gray-100 relative">
            <div className="p-4 flex-shrink-0">
                 <div className="flex justify-between items-center mb-4 gap-4">
                    <div className="w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search by species..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <button onClick={handleAddNewTree} className="flex items-center justify-center text-sm font-semibold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex-shrink-0">
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add
                    </button>
                </div>
                
                <div className="space-y-3">
                    <CollapsiblePanel title="Map Tools" icon={Layers}>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center text-sm p-2 rounded-md bg-white border shadow-sm col-span-2">
                                    <Palette className="w-4 h-4 mr-2"/>
                                    <span className="flex-1">Color By</span>
                                    <select value={colorMode} onChange={e => setColorMode(e.target.value as ColorMode)} className="flex-1 text-sm p-1 border-gray-200 rounded bg-white text-gray-900 focus:ring-green-500 focus:border-green-500">
                                        <option value="none">Default</option>
                                        <option value="species">Species</option>
                                        <option value="condition">Condition</option>
                                        <option value="dbh">DBH</option>
                                        <option value="recommendation">Recommendation</option>
                                    </select>
                                </label>
                                <button onClick={() => setSectionsVisible(!sectionsVisible)} className="flex items-center justify-center text-sm p-2 rounded-md bg-white border shadow-sm hover:bg-gray-100" title={sectionsVisible ? "Hide Sections" : "Show Sections"}>
                                    {sectionsVisible ? <EyeOff className="w-4 h-4 mr-2"/> : <Eye className="w-4 h-4 mr-2"/>}
                                    {sectionsVisible ? 'Hide' : 'Show'}
                                </button>
                                <button onClick={() => setDrawMode('section')} className="flex items-center justify-center text-sm p-2 rounded-md bg-white border shadow-sm hover:bg-gray-100" title="Draw New Section">
                                    <PlusCircle className="w-4 h-4 mr-2"/>
                                    Draw Area
                                </button>
                                <button onClick={() => setDrawMode('bulkSelect')} className="col-span-2 flex items-center justify-center text-sm p-2 rounded-md bg-white border shadow-sm hover:bg-gray-100" title="Bulk Select Trees with Polygon">
                                    <MousePointer className="w-4 h-4 mr-2"/>
                                    Polygon Select
                                </button>
                            </div>
                            <MapSectionsPanel sections={propertySections} onEditShape={handleEditSectionShape} sectionColors={sectionColors} />
                        </div>
                    </CollapsiblePanel>
                    <CollapsiblePanel title="Advanced Filters" icon={Filter}>
                        <AdvancedFiltersPanel propertyId={property.id} />
                    </CollapsiblePanel>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-1 pb-20">
                {filteredAndSortedTrees.length > 0 ? (
                    <TreeList 
                        trees={filteredAndSortedTrees} 
                        onEditTree={handleEditTree} 
                        onAssignRsa={(tree) => setAssigningRsaTree(tree)}
                        selectedTreeId={selectedTreeId}
                        expandedTreeId={expandedTreeId}
                        onTreeCardClick={handleTreeCardClick}
                        itemRefs={itemRefs}
                        onViewScan={handleViewScan}
                    />
                ) : (
                    <div className="text-center p-8 text-gray-500">
                        <p>No trees match filters.</p>
                    </div>
                )}
            </div>

            {editingTree && !isBulkAssigningRsa && (
                <TreeEditDrawer 
                    isOpen={!!editingTree}
                    onClose={handleCloseDrawer}
                    tree={editingTree}
                    isAddingNew={!editingTree.id}
                    setTempLocation={setTempLocation}
                    onViewScan={handleViewScan}
                />
            )}
            {isBulkEditing && <BulkEditDrawer />}
            {isBulkAssigningRsa && 
                <BulkRsaAssignmentDrawer 
                    propertyId={property.id}
                    onSetToast={setToastMessage}
                    onProgramFocus={setFocusedRsaProgramForBulk}
                />}
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-2/3 h-full rounded-lg overflow-hidden shadow-md relative">
            {(drawMode !== 'none' || editingSectionShape) && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white p-3 rounded-lg shadow-xl flex items-center space-x-4 border-2 border-blue-500">
                    <MousePointer className="w-6 h-6 text-blue-500 animate-pulse" />
                    <div>
                        <h4 className="font-bold text-gray-800">
                           {editingSectionShape ? `Editing ${editingSectionShape.name}` : (drawMode === 'section' ? 'Drawing Section' : 'Bulk Select Mode')}
                        </h4>
                        <p className="text-sm text-gray-600">
                            {editingSectionShape ? 'Drag points to edit shape.' : 'Click to add points. Double-click to finish.'}
                        </p>
                    </div>
                    {editingSectionShape ? (
                        <div className="flex items-center space-x-2">
                             <button onClick={() => setEditingSectionShape(null)} className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"><X className="w-5 h-5"/></button>
                             <button onClick={handleSaveShape} className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"><Save className="w-5 h-5"/></button>
                        </div>
                    ) : (
                        <button onClick={() => { setDrawMode('none'); setDrawPoints([]); }} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                            <X className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            )}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-green-600 text-white p-3 rounded-md shadow-lg text-sm font-semibold"
                    >
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>
            <TreeMap 
                property={property} 
                trees={filteredAndSortedTrees} 
                sections={propertySections} 
                sectionsVisible={sectionsVisible} 
                tempLocation={tempLocation} 
                setTempLocation={setTempLocation} 
                selectedTreeId={selectedTreeId} 
                onMarkerClick={handleMarkerClick}
                onEditTree={handleEditTree}
                onViewScan={handleViewScan}
                drawMode={drawMode}
                drawPoints={drawPoints} 
                setDrawPoints={setDrawPoints} 
                finishDrawing={finishDrawing}
                drawColor={drawMode === 'bulkSelect' ? '#2ecc71' : '#3498db'}
                cartTreeIds={cartTreeIds}
                toggleTreeInCart={toggleTreeInCart}
                selectionPolygon={selectionPolygon}
                editingSectionShape={editingSectionShape}
                setEditingSectionShapeCoords={(coords) => setEditingSectionShape(prev => prev ? {...prev, coords} : null)}
                editingTree={editingTree}
                originalEditLocation={originalEditLocation}
                treeIcons={treeIcons}
            />
        </div>
      </div>
      <BulkActionBar propertyId={property.id} />
       <RsaAssignmentModal
        isOpen={!!assigningRsaTree}
        tree={assigningRsaTree}
        onClose={() => setAssigningRsaTree(null)}
        onConfirm={(message) => setToastMessage(message)}
       />
       <LidarModal 
        isOpen={!!lidarModalData}
        onClose={() => setLidarModalData(null)}
        url={lidarModalData?.url || ''}
        title={lidarModalData?.title || ''}
       />
    </div>
  );
};

export default TreesTab;