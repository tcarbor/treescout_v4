// components/ScoutTab.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../services/mockData';
import type { Property, ScoutReport, ScoutItem, Section, ScoutImage } from '../types';
import { PlusCircle, Edit, Trash2, Mic, Bot, AlertTriangle, Save, X, Layers, ChevronDown, MapPin, Check, Edit2, Globe, Map as MapIcon, SlidersHorizontal, LocateFixed, Camera, Image, Wrench, Leaf, FileText } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import { AnimatePresence, motion } from 'framer-motion';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import LoadingSpinner from './LoadingSpinner';
import ImageEditorModal from './ImageEditorModal';


// --- HELPER FUNCTIONS & COMPONENTS---

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const simpleId = () => `id_${Math.random().toString(36).substr(2, 9)}`;
const draftId = () => `draft_${Math.random().toString(36).substr(2, 9)}`;


const vertexIcon = new L.DivIcon({
    className: 'leaflet-div-icon leaflet-vertex-icon',
    html: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const photoMarkerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/860/860467.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});


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

const EditablePolygon = ({ section, setCoords }) => {
    const [localCoords, setLocalCoords] = useState(section.coords);

    const handleDrag = (index, event) => {
        const newCoords = [...localCoords];
        newCoords[index] = event.latlng;
        setLocalCoords(newCoords);
        setCoords(newCoords);
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

// --- MAP COMPONENT ---
const MyLocationButton = () => {
    const map = useMap();
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.flyTo([latitude, longitude], 18);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error getting location", error);
                alert("Could not get your location. Please ensure location services are enabled.");
                setIsLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className="absolute bottom-4 left-4 z-[1000]">
            <button
                onClick={handleClick}
                disabled={isLoading}
                className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-200"
                title="Go to my location"
            >
                {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                ) : (
                    <LocateFixed className="w-5 h-5 text-gray-700" />
                )}
            </button>
        </div>
    );
};

const ScoutMapContents: React.FC<{
    property: Property;
    sections: Section[];
    items: ScoutItem[];
    activeSectionId: string | null;
    onSectionSelect: (id: string, latlng?: L.LatLng | null) => void;
    drawMode: 'none' | 'section';
    drawPoints: any[];
    setDrawPoints: (points: any[]) => void;
    finishDrawing: (points: any[]) => void;
    drawColor?: string;
    editingSectionShape: any;
    setEditingSectionShapeCoords: (coords: any[]) => void;
    mapView: 'street' | 'satellite';
    onAddItemFromMap: (sectionId: string) => void;
    onAddPhotoFromMap: (sectionId: string) => void;
    onVoiceScoutFromMap: (sectionId: string) => void;
}> = ({ property, sections, items, activeSectionId, onSectionSelect, drawMode, drawPoints, setDrawPoints, finishDrawing, drawColor, editingSectionShape, setEditingSectionShapeCoords, mapView, onAddItemFromMap, onAddPhotoFromMap, onVoiceScoutFromMap }) => {
    const map = useMap();
    const sectionColors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c'];
    
    useEffect(() => {
        const activeSection = sections.find(s => s.id === activeSectionId);
        if (activeSection?.coords) {
            const bounds = L.latLngBounds(activeSection.coords);
            if(bounds.isValid()) {
                map.flyToBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [activeSectionId, sections, map]);

    const itemsWithLocation = useMemo(() => items.filter(item => item.location), [items]);

    return (
        <>
            {mapView === 'street' && (
                <TileLayer
                    key="street"
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    maxZoom={22}
                />
            )}
             {mapView === 'satellite' && (
                <TileLayer
                    key="satellite"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    maxZoom={22}
                />
            )}
            {sections.map((section, index) => {
                 if (section.id === editingSectionShape?.id) return null;
                 return section.coords && (
                    <Polygon
                        key={section.id}
                        positions={section.coords}
                        pathOptions={{
                            color: sectionColors[index % sectionColors.length],
                            weight: activeSectionId === section.id ? 4 : 2,
                            fillOpacity: activeSectionId === section.id ? 0.4 : 0.2,
                        }}
                        eventHandlers={{
                            click: (e) => {
                                onSectionSelect(section.id, e.latlng);
                                L.DomEvent.stopPropagation(e);
                                e.target.openPopup(e.latlng);
                            }
                        }}
                    >
                        <Popup>
                            <div className="p-1 space-y-2 w-40">
                                <h4 className="font-bold text-gray-800">{section.name}</h4>
                                <div className="space-y-1">
                                    <button onClick={() => onAddItemFromMap(section.id)} className="w-full text-left text-sm p-1 rounded hover:bg-gray-100 flex items-center"><PlusCircle className="w-4 h-4 mr-2"/> Add Item</button>
                                    <button onClick={() => onAddPhotoFromMap(section.id)} className="w-full text-left text-sm p-1 rounded hover:bg-gray-100 flex items-center"><Camera className="w-4 h-4 mr-2"/> Photo Note</button>
                                    <button onClick={() => onVoiceScoutFromMap(section.id)} className="w-full text-left text-sm p-1 rounded hover:bg-gray-100 flex items-center"><Mic className="w-4 h-4 mr-2"/> Voice Scout</button>
                                </div>
                            </div>
                        </Popup>
                    </Polygon>
                )
            })}
             {editingSectionShape && (
                <EditablePolygon section={editingSectionShape} setCoords={setEditingSectionShapeCoords} />
            )}
            {itemsWithLocation.map(item => (
                <Marker key={item.id} position={item.location!} icon={photoMarkerIcon}>
                    <Popup>
                        <div className="w-48">
                            <h4 className="font-bold text-base mb-2">{item.title}</h4>
                            {item.images && item.images.length > 0 && (
                                <img src={item.images[0].markupUrl || item.images[0].url} alt={item.title} className="w-full h-auto rounded-md mb-2" />
                            )}
                            <p className="text-sm">{item.images?.[0]?.notes}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
            <MapDrawHandler drawMode={drawMode} points={drawPoints} setPoints={setDrawPoints} finishDrawing={finishDrawing} drawColor={drawColor} />
            <MyLocationButton />
        </>
    );
};


// --- UI COMPONENTS ---
const SearchableInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    suggestions: string[];
    className: string;
}> = ({ value, onChange, placeholder, suggestions, className }) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const filteredSuggestions = useMemo(() => {
        if (!inputValue) return suggestions;
        return suggestions.filter(s =>
            s.toLowerCase().includes(inputValue.toLowerCase())
        );
    }, [inputValue, suggestions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (!showSuggestions) {
            setShowSuggestions(true);
        }
        onChange(e.target.value);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInputValue(suggestion);
        onChange(suggestion);
        setShowSuggestions(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onMouseDown={() => handleSuggestionClick(suggestion)}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const DraftScoutItemCard: React.FC<{
    item: ScoutItem;
    onSave: (item: ScoutItem) => void;
    onDiscard: (id: string) => void;
    onUpdate: (id: string, updates: Partial<ScoutItem>) => void;
    recommendationTitles: string[];
}> = ({ item, onSave, onDiscard, onUpdate, recommendationTitles }) => {
    return (
        <div className="p-4 bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-lg space-y-3">
            <SearchableInput
                value={item.title || ''}
                onChange={(value) => onUpdate(item.id, { title: value })}
                suggestions={recommendationTitles}
                placeholder="Item Title"
                className="w-full font-semibold text-gray-800 bg-transparent border-b border-yellow-300 focus:outline-none focus:border-yellow-500 bg-white text-gray-900"
            />
            <textarea
                value={item.notes || ''}
                onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
                rows={3}
                className="w-full text-sm text-gray-600 bg-transparent border-b border-yellow-300 focus:outline-none focus:border-yellow-500 bg-white text-gray-900"
                placeholder="Notes..."
            />
            <div className="flex justify-between items-center">
                 <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input type="number" value={item.estimatedBudget || ''} onChange={e => onUpdate(item.id, { estimatedBudget: Number(e.target.value) || 0 })} className="w-32 pl-6 p-1 border rounded-md text-sm font-semibold border-yellow-300 bg-white text-gray-900" />
                </div>
                <div className="space-x-2">
                    <button onClick={() => onDiscard(item.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                    <button onClick={() => onSave(item)} className="p-2 text-gray-500 hover:text-green-600"><Save className="w-4 h-4"/></button>
                </div>
            </div>
        </div>
    )
};

const ScoutItemEditor: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    item: ScoutItem | null;
    recommendationTitles: string[];
}> = ({ isOpen, onClose, item, recommendationTitles }) => {
    const [localItem, setLocalItem] = useState<ScoutItem | null>(item);
    const { addScoutItem, updateScoutItem } = useStore();

    useEffect(() => {
        setLocalItem(item);
    }, [item]);

    if (!isOpen || !localItem) return null;
    
    const isNew = localItem.id.startsWith('new_');

    const handleChange = (field: keyof ScoutItem, value: any) => {
        setLocalItem(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = () => {
        if (!localItem.title) {
            alert("Title is required.");
            return;
        }
        if (isNew) {
            const {id, ...newItem} = localItem;
            addScoutItem(newItem);
        } else {
            updateScoutItem(localItem.id, localItem);
        }
        onClose();
    };
    
    const priorityOptions: { name: ScoutItem['priority'], icon: React.ElementType, color: string }[] = [
        { name: 'Critical', icon: AlertTriangle, color: 'border-red-500 hover:bg-red-50' },
        { name: 'Maintenance', icon: Wrench, color: 'border-yellow-500 hover:bg-yellow-50' },
        { name: 'Lower Priority', icon: Leaf, color: 'border-blue-500 hover:bg-blue-50' }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
                        <h3 className="text-lg font-bold">{isNew ? 'Add Budget Item' : 'Edit Budget Item'}</h3>
                        <SearchableInput
                            value={localItem.title}
                            onChange={value => handleChange('title', value)}
                            placeholder="Title"
                            suggestions={recommendationTitles}
                            className="w-full p-2 border rounded bg-white text-gray-900"
                        />
                        <textarea value={localItem.notes || ''} onChange={e => handleChange('notes', e.target.value)} placeholder="Notes..." rows={4} className="w-full p-2 border rounded bg-white text-gray-900"/>
                        <div className="grid grid-cols-2 gap-4">
                            <select value={localItem.category} onChange={e => handleChange('category', e.target.value)} className="w-full p-2 border rounded bg-white text-gray-900">
                                <option>General</option><option>PHC</option><option>Pruning</option><option>Removal</option>
                            </select>
                            <input type="number" value={localItem.estimatedBudget} onChange={e => handleChange('estimatedBudget', Number(e.target.value))} placeholder="Budget" className="w-full p-2 border rounded bg-white text-gray-900" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                            <div className="grid grid-cols-3 gap-2">
                                {priorityOptions.map(({name, icon: Icon, color}) => (
                                    <button
                                        key={name}
                                        onClick={() => handleChange('priority', name)}
                                        className={`p-2 border-2 rounded-md flex items-center justify-center text-sm font-semibold transition-colors ${localItem.priority === name ? `${color.replace('hover:','')} bg-opacity-20` : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {name === 'Lower Priority' ? 'Low' : name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700">Save</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const PriorityIndicator: React.FC<{ priority: ScoutItem['priority'] }> = ({ priority }) => {
    if (!priority) return null;

    const config = {
        'Critical': { icon: AlertTriangle, color: 'text-red-600 bg-red-100', label: 'Critical' },
        'Maintenance': { icon: Wrench, color: 'text-yellow-700 bg-yellow-100', label: 'Maintenance' },
        'Lower Priority': { icon: Leaf, color: 'text-blue-600 bg-blue-100', label: 'Lower Priority' }
    }[priority];

    return (
        <span className={`flex items-center text-xs font-semibold ${config.color} px-2 py-1 rounded-full`}>
            <config.icon className="w-3 h-3 mr-1.5" />
            {config.label}
        </span>
    );
};


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
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {sections.map((section, index) => (
                <div key={section.id} className="p-2 bg-white rounded-md border-l-4" style={{borderColor: sectionColors[index % sectionColors.length]}}>
                    <div className="flex items-center justify-between">
                        {editingSectionId === section.id ? (
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="text-sm p-1 border rounded w-full bg-white text-gray-900" autoFocus onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} />
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
};


// --- MAIN TAB COMPONENT ---

const ScoutTab: React.FC<{ property: Property }> = ({ property }) => {
    const { scoutReports, scoutItems, sections, addScoutReport, updateScoutReport, deleteScoutReport, addScoutItem, addScoutItems, deleteScoutItem, addSection, updateSection, recTemplates } = useStore();
    const [activeReport, setActiveReport] = useState<ScoutReport | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [draftItems, setDraftItems] = useState<ScoutItem[]>([]);
    
    // Editor State
    const [editingItem, setEditingItem] = useState<ScoutItem | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isEditingReportName, setIsEditingReportName] = useState(false);
    const [editedReportName, setEditedReportName] = useState('');


    // Image Capture State
    const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
    const [captureData, setCaptureData] = useState<any>(null);

    // Map Tools and View State
    const [isMapToolsOpen, setIsMapToolsOpen] = useState(false);
    const [mapView, setMapView] = useState<'street' | 'satellite'>('street');
    const [drawMode, setDrawMode] = useState<'none' | 'section'>('none');
    const [drawPoints, setDrawPoints] = useState<{lat: number, lng: number}[]>([]);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [newSectionPoints, setNewSectionPoints] = useState<{lat: number, lng: number}[]>([]);
    const [editingSectionShape, setEditingSectionShape] = useState<{id: string, name: string, coords: any[]} | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const sectionListRef = useRef<HTMLDivElement>(null);
    const sectionItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [openSectionId, setOpenSectionId] = useState<string | null>(null);

    const recommendationTitles = useMemo(() => recTemplates.map(t => t.name), [recTemplates]);
    const propertyReports = useMemo(() => [...scoutReports.filter(r => r.propertyId === property.id)].sort((a,b) => b.year - a.year), [scoutReports, property.id]);
    const propertySections = useMemo(() => sections.filter(s => s.propertyId === property.id), [sections, property.id]);
    
    const activeReportItems = useMemo(() => scoutItems.filter(i => i.scoutReportId === activeReport?.id), [scoutItems, activeReport]);

    const sectionData = useMemo(() => {
        return propertySections.map(section => {
            const items = activeReportItems.filter(item => item.sectionId === section.id);
            const total = items.reduce((sum, item) => sum + item.estimatedBudget, 0);
            return { ...section, items, total };
        });
    }, [propertySections, activeReportItems]);

    useEffect(() => {
        if (propertyReports.length > 0 && !activeReport) {
            setActiveReport(propertyReports[0]);
        } else if (propertyReports.length === 0) {
            setActiveReport(null);
        } else if (activeReport && !propertyReports.find(r => r.id === activeReport.id)) {
            setActiveReport(propertyReports[0] || null);
        }
    }, [propertyReports, activeReport]);

    useEffect(() => {
        if (propertySections.length > 0 && !activeSectionId) {
            setActiveSectionId(propertySections[0].id);
            setOpenSectionId(propertySections[0].id);
        }
    }, [propertySections, activeSectionId]);

    const handleSectionClick = (sectionId: string) => {
        setActiveSectionId(sectionId);
        setOpenSectionId(prev => (prev === sectionId ? null : sectionId));
    };
    
    useEffect(() => {
      if (openSectionId) {
        const sectionElement = sectionItemRefs.current.get(openSectionId);
        if (sectionElement) {
            sectionElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, [openSectionId]);

    const handleCreateReport = () => {
        const year = new Date().getFullYear() + 1;
        const newReport = addScoutReport({
            propertyId: property.id,
            name: `${year} Budget Scout`,
            year: year,
            status: 'draft',
            showGranularPricing: true,
        });
        setActiveReport(newReport);
    };
    
    const handleRenameReport = () => {
        if (activeReport && editedReportName.trim() && editedReportName !== activeReport.name) {
            updateScoutReport(activeReport.id, { name: editedReportName });
        }
        setIsEditingReportName(false);
    };

    const handleDeleteReport = () => {
        if (activeReport && window.confirm(`Are you sure you want to delete "${activeReport.name}"? This action cannot be undone.`)) {
            deleteScoutReport(activeReport.id);
        }
    };


    const handleOpenEditor = (item?: ScoutItem) => {
        if (item) {
            setEditingItem(item);
        } else {
            if (activeReport && activeSectionId) {
                 setEditingItem({
                    id: `new_${draftId()}`,
                    scoutReportId: activeReport.id,
                    sectionId: activeSectionId,
                    title: '',
                    category: 'General',
                    estimatedBudget: 0,
                    notes: '',
                    priority: 'Maintenance',
                });
            }
        }
        setIsEditorOpen(true);
    };

    const handleTakePhoto = () => {
        if (!activeReport || !activeSectionId) {
          alert('Please select a report and section first.');
          return;
        }
        fileInputRef.current?.click();
    };

    const handlePhotoCaptured = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && activeReport && activeSectionId) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setCaptureData({
                  imageUrl: URL.createObjectURL(file), 
                  location: { lat: position.coords.latitude, lng: position.coords.longitude },
                  sectionId: activeSectionId,
                  reportId: activeReport.id,
                });
                setIsImageEditorOpen(true);
              },
              (error) => {
                console.error("Geolocation error:", error);
                alert("Could not get location. Please enable location services.");
              },
              { enableHighAccuracy: true }
            );
        }
        if (event.target) {
            event.target.value = "";
        }
    };
    
    const handleActionFromMap = (sectionId: string, action: 'add' | 'photo' | 'voice') => {
        setActiveSectionId(sectionId);
        if(openSectionId !== sectionId) setOpenSectionId(sectionId);
        if (action === 'add') handleOpenEditor();
        if (action === 'photo') handleTakePhoto();
        if (action === 'voice') handleToggleListening();
    };


    const handleToggleListening = async () => {
        if (isListening) {
            mediaRecorderRef.current?.stop();
            setIsListening(false);
        } else {
            if (!activeSectionId) {
                alert("Please select a section before starting voice scout.");
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];
                mediaRecorderRef.current.ondataavailable = event => audioChunksRef.current.push(event.data);
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    processAudio(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error("Error accessing microphone:", error);
                alert("Could not access microphone. Please check permissions.");
            }
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        if (!activeReport || !activeSectionId) return;
        setIsProcessing(true);
        setDraftItems([]);
        try {
            const base64Audio = await blobToBase64(audioBlob);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const createScoutItemsFunction: FunctionDeclaration = {
                name: 'createScoutItems',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: 'A concise title for the task.'},
                                    notes: { type: Type.STRING, description: 'A brief description of the observation.'},
                                    category: { type: Type.STRING, enum: ['PHC', 'Pruning', 'Removal', 'General'], description: 'The category of work.' },
                                    estimatedBudget: { type: Type.NUMBER, description: 'The estimated cost in dollars. Omit if not mentioned.' }
                                }
                            }
                        }
                    }
                }
            };
            
            const systemInstruction = `You are an expert arborist's assistant...call the 'createScoutItems' function with all the identified tasks.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: "Analyze the following field notes..." }, { inlineData: { mimeType: 'audio/webm', data: base64Audio } }] }],
                config: { systemInstruction, tools: [{ functionDeclarations: [createScoutItemsFunction] }] }
            });

            const call = response.functionCalls?.[0];

            if (call) {
                const newDrafts = call.args.items.map((item: any) => ({
                    ...item, id: draftId(), scoutReportId: activeReport!.id, sectionId: activeSectionId!, isDraft: true, estimatedBudget: item.estimatedBudget ?? 0
                }));
                setDraftItems(newDrafts);
            }
        } catch (error) {
            console.error("Error processing with Gemini:", error);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSaveDraft = (item: ScoutItem) => {
        const { id, isDraft, ...itemToSave } = item;
        addScoutItem(itemToSave);
        setDraftItems(drafts => drafts.filter(d => d.id !== id));
    };

    const handleUpdateDraft = (id: string, updates: Partial<ScoutItem>) => {
        setDraftItems(drafts => drafts.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    const finishDrawing = (points: {lat: number, lng: number}[]) => {
      if (points.length <= 2) {
        setDrawMode('none');
        setDrawPoints([]);
        return;
      };
      if (drawMode === 'section') {
          setNewSectionPoints(points);
          setIsSectionModalOpen(true);
      }
      setDrawMode('none');
      setDrawPoints([]);
    };

    const handleSaveSection = () => {
      if (newSectionName && newSectionPoints.length > 2) {
          addSection({ name: newSectionName, propertyId: property.id, coords: newSectionPoints });
      }
      setIsSectionModalOpen(false);
      setNewSectionName('');
      setNewSectionPoints([]);
    };

    const handleSaveShape = () => {
        if (editingSectionShape) {
            updateSection(editingSectionShape.id, { coords: editingSectionShape.coords });
            setEditingSectionShape(null);
        }
    };

    const defaultCenter = property.location || { lat: 34.0522, lng: -118.2437 };
    const bounds = L.latLngBounds(propertySections.flatMap(s => s.coords || []));
    const mapBounds = bounds.isValid() ? bounds : L.latLngBounds([defaultCenter]);

    return (
        <div className="relative">
            {/* Print-only Header */}
            {activeReport && (
                <div className="hidden print:block mb-6">
                    <h1 className="text-3xl font-bold">{property.name}</h1>
                    <h2 className="text-2xl text-gray-600">{activeReport.name} - Scout Report</h2>
                    <p className="text-gray-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
                </div>
            )}
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4 print:hidden">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <h2 className="text-xl font-bold flex-shrink-0">Scout Field Sheet</h2>
                    {activeReport && (
                        isEditingReportName ? (
                             <input 
                                type="text"
                                value={editedReportName}
                                onChange={(e) => setEditedReportName(e.target.value)}
                                onBlur={handleRenameReport}
                                onKeyDown={e => e.key === 'Enter' && handleRenameReport()}
                                className="p-1 border border-green-500 bg-white rounded-md shadow-sm font-semibold text-lg"
                                autoFocus
                            />
                        ) : (
                            <div className="flex items-center group">
                                <h3 className="text-lg font-bold text-gray-800">{activeReport.name}</h3>
                                <button onClick={() => { setIsEditingReportName(true); setEditedReportName(activeReport.name); }} className="ml-2 p-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit report name"><Edit className="w-4 h-4"/></button>
                            </div>
                        )
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <select value={activeReport?.id || ''} onChange={e => setActiveReport(propertyReports.find(r => r.id === e.target.value) || null)} className="p-2 border border-gray-300 bg-white rounded-md shadow-sm font-semibold pr-8 appearance-none">
                            {propertyReports.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                    </div>
                    {activeReport && (
                        <>
                            <button onClick={handleDeleteReport} className="p-2 text-gray-500 hover:text-red-600" title="Delete Report"><Trash2 className="w-4 h-4" /></button>
                            <button onClick={() => window.print()} className="flex items-center text-sm font-semibold bg-white text-gray-700 px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 shadow-sm" title="Export as PDF">
                                <FileText className="w-4 h-4 mr-2"/> Export
                            </button>
                            <Link to={`/scout-portal/${activeReport.id}`} className="flex items-center text-sm font-semibold bg-white text-gray-700 px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 shadow-sm" title="Go to Client Portal view">
                                <Globe className="w-4 h-4 mr-2"/> Portal
                            </Link>
                        </>
                    )}
                    <button onClick={handleCreateReport} className="flex items-center text-sm font-semibold bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700">
                        <PlusCircle className="w-4 h-4 mr-2"/> New Report
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[calc(100vh-270px)]">
                {/* Left Panel: Map */}
                <div className="h-96 lg:h-full rounded-lg overflow-hidden shadow-md relative print:hidden">
                    <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
                        <button onClick={() => setIsMapToolsOpen(true)} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100" title="Map & Section Tools">
                            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                        </button>
                        <div className="bg-white rounded-full shadow-lg flex flex-col items-center">
                           <button onClick={() => setMapView('street')} className={`p-2.5 rounded-t-full w-10 h-10 flex items-center justify-center transition-colors ${mapView === 'street' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-gray-600'}`} title="Street View">
                               <MapIcon className="w-5 h-5"/>
                           </button>
                           <button onClick={() => setMapView('satellite')} className={`p-2.5 rounded-b-full w-10 h-10 flex items-center justify-center transition-colors ${mapView === 'satellite' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-gray-600'}`} title="Satellite View">
                               <Globe className="w-5 h-5"/>
                           </button>
                        </div>
                    </div>
                    
                    <AnimatePresence>
                        {isMapToolsOpen && (
                            <motion.div 
                                initial={{ y: '-100%', opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '-100%', opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="absolute top-0 left-0 right-0 z-[1000] bg-white/90 backdrop-blur-sm p-4 shadow-lg border-b rounded-b-lg"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-gray-700 flex items-center"><Layers className="w-5 h-5 mr-2" />Map & Section Tools</h3>
                                    <button onClick={() => setIsMapToolsOpen(false)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-600"/></button>
                                </div>
                                <div className="space-y-3">
                                    <button onClick={() => { setDrawMode('section'); setIsMapToolsOpen(false); }} className="w-full flex items-center justify-center text-sm p-2 rounded-md bg-white border shadow-sm hover:bg-gray-100"><PlusCircle className="w-4 h-4 mr-2"/>Draw New Section</button>
                                    <MapSectionsPanel sections={propertySections} onEditShape={(s) => { setEditingSectionShape({id:s.id, name:s.name, coords: s.coords!}); setIsMapToolsOpen(false); }} sectionColors={['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c']} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {(drawMode !== 'none' || editingSectionShape) && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white p-3 rounded-lg shadow-xl flex items-center space-x-4 border-2 border-blue-500">
                           <div>
                                <h4 className="font-bold text-gray-800">{editingSectionShape ? `Editing ${editingSectionShape.name}` : 'Drawing Section'}</h4>
                                <p className="text-sm text-gray-600">{editingSectionShape ? 'Drag points to edit.' : 'Click map to add points.'}</p>
                            </div>
                            {editingSectionShape ? (
                                <div className="flex space-x-1">
                                    <button onClick={() => setEditingSectionShape(null)} className="p-2 bg-gray-100 rounded-md"><X className="w-5 h-5"/></button>
                                    <button onClick={handleSaveShape} className="p-2 bg-green-100 rounded-md"><Save className="w-5 h-5"/></button>
                                </div>
                            ) : (
                                <button onClick={() => { setDrawMode('none'); setDrawPoints([]); }} className="p-2 bg-red-100 rounded-full"><X className="w-5 h-5"/></button>
                            )}
                        </div>
                    )}
                    <MapContainer bounds={mapBounds.pad(0.1)} maxZoom={22} scrollWheelZoom={true} zoomControl={false} className={`h-full w-full ${drawMode !== 'none' ? 'cursor-crosshair' : ''}`}>
                        <ScoutMapContents {...{property, sections: propertySections, items: activeReportItems, activeSectionId, onSectionSelect: (id, latlng) => setActiveSectionId(id), drawMode, drawPoints, setDrawPoints, finishDrawing, editingSectionShape, setEditingSectionShapeCoords: (coords) => setEditingSectionShape(prev => prev ? {...prev, coords} : null), mapView, onAddItemFromMap: (id) => handleActionFromMap(id, 'add'), onAddPhotoFromMap: (id) => handleActionFromMap(id, 'photo'), onVoiceScoutFromMap: (id) => handleActionFromMap(id, 'voice') }} />
                    </MapContainer>
                </div>

                {/* Right Panel: Workspace */}
                <div className="lg:h-full flex flex-col bg-white rounded-lg shadow-md print-container">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={sectionListRef}>
                        {sectionData.map(section => (
                            <div key={section.id} ref={el => sectionItemRefs.current.set(section.id, el)} className={`rounded-lg border-2 transition-colors ${activeSectionId === section.id ? 'border-green-500' : 'border-transparent'} print-no-break`}>
                                <div className={`p-4 flex justify-between items-center cursor-pointer rounded-t-lg ${activeSectionId === section.id ? 'bg-green-100' : 'bg-gray-100 hover:bg-gray-200'}`} onClick={() => handleSectionClick(section.id)}>
                                    <h3 className="text-lg font-bold text-gray-800 truncate">{section.name}</h3>
                                    <div className="flex items-center space-x-4 ml-4">
                                        <p className="font-bold text-green-700 text-lg">${section.total.toLocaleString()}</p>
                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openSectionId === section.id ? 'rotate-180' : ''} print:hidden`} />
                                    </div>
                                </div>
                                <AnimatePresence>
                                {openSectionId === section.id && (
                                    <motion.div
                                        key="content"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-white rounded-b-lg"
                                    >
                                        <div className={`px-4 pb-4 rounded-b-lg ${activeSectionId === section.id ? 'border-x-2 border-b-2 border-green-500' : ''}`}>
                                            <div className="mt-4 space-y-4">
                                                <div className="grid grid-cols-2 gap-4 print:hidden">
                                                    <button onClick={() => handleOpenEditor()} className="flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-800 px-3 py-2 rounded-md hover:bg-gray-200 border border-gray-300"><PlusCircle className="w-4 h-4 mr-2"/> Add Manually</button>
                                                    <button onClick={handleToggleListening} disabled={isProcessing} className={`flex items-center justify-center text-sm font-semibold text-white px-3 py-2 rounded-md transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:bg-gray-400`}>
                                                        {isProcessing ? <LoadingSpinner/> : (<><Mic className={`w-4 h-4 mr-2 ${isListening ? 'animate-pulse' : ''}`}/>{isListening ? 'Stop & Analyze' : 'Start Voice Scout'}</>)}
                                                    </button>
                                                </div>
                                                {draftItems.filter(i => i.sectionId === section.id).map(item => <DraftScoutItemCard key={item.id} item={item} onSave={handleSaveDraft} onDiscard={(id) => setDraftItems(drafts => drafts.filter(d => d.id !== id))} onUpdate={handleUpdateDraft} recommendationTitles={recommendationTitles} />)}
                                            </div>
                                            <div className="space-y-3 pt-4 mt-4 border-t border-gray-200">
                                                {section.items.map(item => (
                                                    <div key={item.id} className="p-3 bg-white rounded-md border flex flex-col md:flex-row items-start justify-between gap-4 print-no-break">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                                <p className="font-semibold text-gray-800 flex items-start truncate">{item.location && <MapPin className="w-4 h-4 mr-2 mt-1 text-gray-400 flex-shrink-0"/>}{item.title}</p>
                                                                <PriorityIndicator priority={item.priority} />
                                                            </div>
                                                            <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{item.notes}</p>
                                                            {item.images && item.images.length > 0 && (
                                                                <div className="mt-2 flex space-x-2 overflow-x-auto">
                                                                    {item.images.map(img => (
                                                                        <a key={img.id} href={img.markupUrl || img.url} target="_blank" rel="noopener noreferrer">
                                                                            <img src={img.markupUrl || img.url} alt={img.notes} className="w-24 h-24 object-cover rounded-md border hover:opacity-80"/>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="md:ml-4 text-left md:text-right flex-shrink-0 flex md:flex-col justify-between items-center w-full md:w-auto">
                                                            <p className="font-bold text-gray-800">${item.estimatedBudget.toLocaleString()}</p>
                                                            <div className="mt-1 print:hidden">
                                                                <button onClick={() => handleOpenEditor(item)} className="p-1 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                                                                <button onClick={() => window.confirm('Are you sure?') && deleteScoutItem(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {section.items.length === 0 && (
                                                    <p className="text-sm text-center text-gray-500 italic py-2">No items in this section.</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoCaptured}
                className="hidden"
            />

            <button onClick={handleTakePhoto} className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full h-16 w-16 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-[1003] print:hidden" aria-label="Take Geotagged Photo">
                <Camera className="w-8 h-8" />
            </button>

            <ScoutItemEditor isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} item={editingItem} recommendationTitles={recommendationTitles} />
            <ImageEditorModal
                isOpen={isImageEditorOpen}
                onClose={() => setIsImageEditorOpen(false)}
                captureData={captureData}
                propertySections={propertySections}
            />

            {isSectionModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Create New Section</h3>
                        <input type="text" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="Enter section name" className="w-full p-2 border rounded-md mb-4 bg-white text-gray-900" autoFocus/>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsSectionModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md">Cancel</button>
                            <button onClick={handleSaveSection} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md">Save Section</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ScoutTab;