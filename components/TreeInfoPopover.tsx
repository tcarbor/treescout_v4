// components/TreeInfoPopover.tsx
import React, { useRef, useEffect } from 'react';
import type { Tree } from '../types';
import { motion } from 'framer-motion';
import { Trees } from 'lucide-react';

export const getCommonName = (species: string = '') => species.match(/\(([^)]+)\)/)?.[1] || species;

export const TreeInfoPopover: React.FC<{
    tree: Tree;
    sectionName?: string;
    onClose: () => void;
    position: { top: number, left: number };
}> = ({ tree, sectionName, onClose, position }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: position.top, left: position.left }}
            className="fixed z-[1007] w-96 bg-white rounded-lg shadow-2xl border p-4"
        >
            <h4 className="font-bold text-lg mb-2 flex items-baseline">
                <span className="text-base font-mono text-gray-500 mr-2">(#{tree.id.slice(-4)})</span>
                <span className="mr-2">{tree.dbh}"</span>
                <span>{getCommonName(tree.species)}</span>
            </h4>
            {tree.images && tree.images.length > 0 ? (
                <div className="flex space-x-2 overflow-x-auto pb-2 mb-2 scroll-smooth snap-x">
                    {tree.images.map((img, idx) => (
                        <img key={idx} src={img.url} alt={img.caption || `Tree ${tree.id}`} className="w-80 h-64 object-cover rounded-md flex-shrink-0 snap-start" />
                    ))}
                </div>
            ) : (
                 <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center text-sm text-gray-400">
                    <Trees className="w-12 h-12"/>
                 </div>
            )}
            <p className="text-base"><span className="font-semibold">Condition:</span> {tree.condition}</p>
            {sectionName && <p className="text-base"><span className="font-semibold">Section:</span> {sectionName}</p>}
        </motion.div>
    );
};
