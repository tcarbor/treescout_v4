// components/LidarTab.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Property } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { UploadCloud, CheckCircle } from 'lucide-react';

declare var Potree: any;

// Component to handle the actual Potree viewer rendering
const PotreeViewer: React.FC<{ url: string }> = ({ url }) => {
    const potreeContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!url || !potreeContainerRef.current) {
            setError('No LiDAR data is available for this property.');
            setIsLoading(false);
            return;
        }

        let viewer: any;
        let animationFrameId: number;

        try {
            viewer = new Potree.Viewer(potreeContainerRef.current);
            viewer.setEDLEnabled(true);
            viewer.setFOV(60);
            viewer.setPointBudget(1_000_000);
            viewer.setBackground(null);
            viewer.setDescription('LiDAR Scan');
            
            Potree.loadPointCloud(url, "Point Cloud", (e: any) => {
                if (!e.pointcloud) {
                    setError(`Failed to load point cloud from ${url}`);
                    setIsLoading(false);
                    return;
                }
                
                viewer.scene.addPointCloud(e.pointcloud);
                viewer.fitToScreen();
                setIsLoading(false);
            });
            
            const loop = () => {
                if (viewer) {
                    viewer.update();
                    animationFrameId = requestAnimationFrame(loop);
                }
            };
            animationFrameId = requestAnimationFrame(loop);

        } catch (err: any) {
            console.error("Potree initialization failed:", err);
            setError("Failed to initialize LiDAR viewer. Potree library might not be loaded correctly.");
            setIsLoading(false);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (viewer) {
                viewer.scene.pointclouds.forEach((pc: any) => viewer.scene.removePointCloud(pc));
                if (potreeContainerRef.current) {
                    potreeContainerRef.current.innerHTML = '';
                }
                viewer = null;
            }
        };
    }, [url]);

    return (
        <div className="w-full h-full bg-gray-900 relative">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <LoadingSpinner />
                    <p className="mt-2">Loading LiDAR data...</p>
                </div>
            )}
            {error && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-10 p-4">
                    <p className="text-center text-red-400">{error}</p>
                </div>
            )}
            <div ref={potreeContainerRef} className="w-full h-full" />
        </div>
    );
};


// Component to handle file upload and conversion simulation
const LidarUploader: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationMessage, setSimulationMessage] = useState('');
    const [simulationComplete, setSimulationComplete] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');

    const startSimulation = useCallback(() => {
        setIsSimulating(true);
        setSimulationComplete(false);
        setError('');

        const messages = [
            "Uploading file...",
            "Upload complete. Initializing converter...",
            "Processing point cloud (this can take a few minutes)...",
            "Applying optimizations for web viewing...",
            "Finalizing conversion..."
        ];

        let messageIndex = 0;
        const intervalId = setInterval(() => {
            if (messageIndex < messages.length) {
                setSimulationMessage(messages[messageIndex]);
                messageIndex++;
            } else {
                clearInterval(intervalId);
                setIsSimulating(false);
                setSimulationComplete(true);
            }
        }, 2500); // Cycle messages every 2.5 seconds
    }, []);

    const handleFileSelect = useCallback((file: File | null) => {
        if (file && (file.name.endsWith('.laz') || file.name.endsWith('.las'))) {
            startSimulation();
        } else {
            setError('Invalid file type. Please upload a .laz or .las file.');
        }
    }, [startSimulation]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files?.[0] || null);
    };

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        handleFileSelect(e.dataTransfer.files?.[0] || null);
    }, [handleFileSelect]);

    if (isSimulating) {
        return (
            <div className="text-center p-8">
                <LoadingSpinner />
                <p className="text-lg font-semibold text-gray-700 mt-4">{simulationMessage}</p>
                <p className="text-sm text-gray-500 mt-2">Please keep this tab open.</p>
            </div>
        );
    }

    if (simulationComplete) {
        return (
            <div className="text-center p-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">Upload Successful!</h3>
                <p className="text-gray-600 mt-2 max-w-md mx-auto">
                    Your file is now queued for processing. The backend conversion service is currently under development. Once complete, your LiDAR scan will appear here automatically.
                </p>
                <button onClick={() => setSimulationComplete(false)} className="mt-6 font-semibold text-green-700 bg-green-100 px-4 py-2 rounded-lg hover:bg-green-200">
                    Upload another file
                </button>
            </div>
        );
    }

    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-full flex flex-col items-center justify-center p-8 border-4 border-dashed rounded-lg cursor-pointer transition-colors ${dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
        >
            <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept=".laz,.las" />
            <UploadCloud className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Upload LiDAR Scan</h3>
            <p className="text-gray-500 mt-2 text-center">Drag & drop a .laz or .las file here, or click to select</p>
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
    );
};

// Main component that decides what to render
const LidarTab: React.FC<{ property: Property }> = ({ property }) => {
    return (
        <div className="w-full h-[calc(100vh-270px)] bg-white rounded-lg shadow-md relative">
            {property.lidarUrl ? <PotreeViewer url={property.lidarUrl} /> : <LidarUploader />}
        </div>
    );
};

export default LidarTab;
