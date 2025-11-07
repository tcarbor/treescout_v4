// components/ImageEditorModal.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../services/mockData';
import type { ScoutItem, ScoutImage, Section } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, Undo, AlertTriangle, Wrench, Leaf, Pen, ArrowUpRight, Square } from 'lucide-react';

const simpleId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    captureData: {
        imageUrl: string;
        location: { lat: number, lng: number };
        sectionId: string;
        reportId: string;
    } | null;
    propertySections: Section[];
}

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

type DrawingTool = 'pen' | 'arrow' | 'rect';

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, onClose, captureData, propertySections }) => {
    const { addScoutItem, recTemplates } = useStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#ef4444'); // red
    const [penWidth, setPenWidth] = useState(5);
    const imageRef = useRef<HTMLImageElement>(new Image());
    
    // New state for enhanced tools
    const [tool, setTool] = useState<DrawingTool>('pen');
    const [history, setHistory] = useState<ImageData[]>([]);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);


    const [itemDetails, setItemDetails] = useState<Partial<ScoutItem>>({
        title: '',
        category: 'General',
        estimatedBudget: 0,
        notes: '',
        priority: 'Maintenance',
        sectionId: '',
    });

    const recommendationTitles = useMemo(() => recTemplates.map(t => t.name), [recTemplates]);
    
    const saveState = () => {
        if (!contextRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const imageData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
        setHistory(prev => [...prev, imageData]);
    };

    const restoreState = (state: ImageData) => {
        if (!contextRef.current) return;
        contextRef.current.putImageData(state, 0, 0);
    };

    useEffect(() => {
        if (isOpen && captureData && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if(!context) return;
            contextRef.current = context;

            const img = imageRef.current;
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const parentWidth = canvas.parentElement?.clientWidth || 500;
                const aspectRatio = img.width / img.height;
                canvas.width = parentWidth;
                canvas.height = parentWidth / aspectRatio;
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                const initialState = context.getImageData(0, 0, canvas.width, canvas.height);
                setHistory([initialState]);
                URL.revokeObjectURL(img.src);
            };
            img.src = captureData.imageUrl;
            
            setItemDetails({
                title: '', category: 'General', estimatedBudget: 0, notes: '', priority: 'Maintenance',
                sectionId: captureData.sectionId,
            });
            setTool('pen');
            setPenColor('#ef4444');
        }
    }, [isOpen, captureData]);
    
    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            setHistory(newHistory);
            restoreState(newHistory[newHistory.length - 1]);
        }
    };

    const handleChange = (field: keyof ScoutItem, value: any) => {
        setItemDetails(prev => ({ ...prev, [field]: value }));
    };

    const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        setIsDrawing(true);
        setStartPos({ x: offsetX, y: offsetY });
        if (tool === 'pen') {
            contextRef.current.beginPath();
            contextRef.current.moveTo(offsetX, offsetY);
            contextRef.current.strokeStyle = penColor;
            contextRef.current.lineWidth = penWidth;
            contextRef.current.lineCap = 'round';
            contextRef.current.lineJoin = 'round';
        }
    };

    const finishDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !contextRef.current || !startPos) return;
        setIsDrawing(false);
        const { offsetX, offsetY } = nativeEvent;

        restoreState(history[history.length - 1]);

        if (tool === 'rect') {
            contextRef.current.strokeRect(startPos.x, startPos.y, offsetX - startPos.x, offsetY - startPos.y);
        } else if (tool === 'arrow') {
            drawArrow(contextRef.current, startPos.x, startPos.y, offsetX, offsetY, penWidth);
        }
        
        contextRef.current.closePath();
        saveState();
        setStartPos(null);
    };
    
    const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, arrowWidth: number) => {
        const headlen = arrowWidth * 3;
        const angle = Math.atan2(toy - fromy, tox - fromx);
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7), toy - headlen * Math.sin(angle - Math.PI / 7));
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 7), toy - headlen * Math.sin(angle + Math.PI / 7));
        ctx.stroke();
    };

    const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;

        contextRef.current.strokeStyle = penColor;
        contextRef.current.lineWidth = penWidth;
        contextRef.current.lineCap = 'round';
        contextRef.current.lineJoin = 'round';

        if (tool === 'pen') {
            contextRef.current.lineTo(offsetX, offsetY);
            contextRef.current.stroke();
        } else if (startPos) {
            restoreState(history[history.length - 1]);
            if (tool === 'rect') {
                contextRef.current.strokeRect(startPos.x, startPos.y, offsetX - startPos.x, offsetY - startPos.y);
            } else if (tool === 'arrow') {
                drawArrow(contextRef.current, startPos.x, startPos.y, offsetX, offsetY, penWidth);
            }
        }
    };
    
    const handleSave = () => {
        if (!captureData || !canvasRef.current || !itemDetails.title) {
            alert('A title is required to save a scout item.');
            return;
        }
        
        const markupUrl = canvasRef.current.toDataURL('image/png');
        const newImage: ScoutImage = {
            id: simpleId(),
            url: captureData.imageUrl,
            markupUrl,
            notes: itemDetails.notes,
        };

        const newItem: Omit<ScoutItem, 'id'> = {
            scoutReportId: captureData.reportId,
            sectionId: itemDetails.sectionId!,
            title: itemDetails.title!,
            category: itemDetails.category || 'General',
            notes: itemDetails.notes,
            estimatedBudget: itemDetails.estimatedBudget || 0,
            images: [newImage],
            location: captureData.location,
            priority: itemDetails.priority,
        };
        addScoutItem(newItem);
        onClose();
    };

    if (!isOpen) return null;

    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff'];
    const priorityOptions: { name: ScoutItem['priority'], label: string, icon: React.ElementType, color: string }[] = [
        { name: 'Critical', label: 'Critical', icon: AlertTriangle, color: 'border-red-500 hover:bg-red-50' },
        { name: 'Maintenance', label: 'Maintain', icon: Wrench, color: 'border-yellow-500 hover:bg-yellow-50' },
        { name: 'Lower Priority', label: 'Low', icon: Leaf, color: 'border-blue-500 hover:bg-blue-50' }
    ];
     const tools: { name: DrawingTool, icon: React.ElementType }[] = [
        { name: 'pen', icon: Pen },
        { name: 'arrow', icon: ArrowUpRight },
        { name: 'rect', icon: Square },
    ];


    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 z-[1001] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[95vh]"
                >
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Create Photo Note</h2>
                        <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Image & Markup */}
                        <div className="space-y-4">
                            <div className="w-full aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg overflow-hidden">
                                 <canvas
                                    ref={canvasRef}
                                    onMouseDown={startDrawing}
                                    onMouseUp={finishDrawing}
                                    onMouseMove={draw}
                                    onMouseLeave={finishDrawing}
                                    className="w-full h-full cursor-crosshair"
                                />
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 bg-white p-1 rounded-full border">
                                        {tools.map(({ name, icon: Icon }) => (
                                            <button key={name} onClick={() => setTool(name)} className={`p-1.5 rounded-full transition-colors ${tool === name ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-200'}`} title={name}>
                                                <Icon className="w-5 h-5"/>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {colors.map(color => (
                                            <button key={color} onClick={() => setPenColor(color)} className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                    <button onClick={handleUndo} disabled={history.length <= 1} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" title="Undo last action"><Undo className="w-5 h-5"/></button>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <label className="text-sm font-medium text-gray-700">Size:</label>
                                    <input type="range" min="2" max="20" value={penWidth} onChange={e => setPenWidth(Number(e.target.value))} className="w-full" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Right: Item Details */}
                        <div className="space-y-4">
                            <SearchableInput
                                value={itemDetails.title || ''}
                                onChange={value => handleChange('title', value)}
                                placeholder="* Title (e.g., Prune hazardous limb)"
                                suggestions={recommendationTitles}
                                className="w-full p-2 border rounded bg-white text-gray-900"
                            />
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Section</label>
                                <select
                                    value={itemDetails.sectionId || ''}
                                    onChange={e => handleChange('sectionId', e.target.value)}
                                    className="w-full p-2 border rounded bg-white text-gray-900 mt-1"
                                >
                                    {propertySections.map(section => (
                                        <option key={section.id} value={section.id}>{section.name}</option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                value={itemDetails.notes || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                rows={4}
                                placeholder="Notes about this observation..."
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                            />
                             <div className="grid grid-cols-2 gap-4">
                                <select value={itemDetails.category} onChange={e => handleChange('category', e.target.value)} className="w-full p-2 border rounded bg-white text-gray-900">
                                    <option>General</option><option>PHC</option><option>Pruning</option><option>Removal</option>
                                </select>
                                <input type="number" value={itemDetails.estimatedBudget || ''} onChange={e => handleChange('estimatedBudget', Number(e.target.value))} placeholder="Est. Budget ($)" className="w-full p-2 border rounded bg-white text-gray-900" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {priorityOptions.map(({name, label, icon: Icon, color}) => (
                                        <button
                                            key={name}
                                            onClick={() => handleChange('priority', name)}
                                            className={`p-2 border-2 rounded-md flex items-center justify-center text-sm font-semibold transition-colors ${itemDetails.priority === name ? `${color.replace('hover:','')} bg-opacity-20` : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                                        >
                                            <Icon className="w-4 h-4 mr-2" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md flex items-center"><Save className="w-4 h-4 mr-2" />Save Note</button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ImageEditorModal;