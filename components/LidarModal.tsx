// components/LidarModal.tsx
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface LidarModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
}

const LidarModal: React.FC<LidarModalProps> = ({ isOpen, onClose, url, title }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[1010] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col"
                    >
                        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <iframe
                                src={url}
                                title={title}
                                className="w-full h-full border-0"
                                allowFullScreen
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LidarModal;