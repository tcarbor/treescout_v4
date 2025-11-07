// components/BulkActionBar.tsx
import React from 'react';
import { useStore } from '../services/mockData';
import { motion } from 'framer-motion';
import { Trash2, Edit, PackagePlus } from 'lucide-react';

const BulkActionBar: React.FC<{ propertyId: string }> = ({ propertyId }) => {
    const { cartTreeIds, setCartTreeIds, setIsBulkEditing, setIsBulkAssigningRsa } = useStore();

    if (cartTreeIds.length <= 1) return null;

    const handleBulkEditClick = () => {
        setIsBulkEditing(true);
    };

    const handleAssignRsaClick = () => {
        setIsBulkAssigningRsa(true);
    };

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto bg-white border-t-2 border-green-500 shadow-lg p-3 z-[1002] rounded-t-lg"
        >
            <div className="flex justify-between items-center max-w-full mx-auto px-4 gap-4">
                <div>
                    <p className="font-bold text-gray-800">{cartTreeIds.length} {cartTreeIds.length === 1 ? 'tree' : 'trees'} selected</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleBulkEditClick} className="flex items-center text-sm font-semibold bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-gray-300">
                        <Edit className="w-4 h-4 mr-2" />
                        Bulk Edit
                    </button>
                    <button onClick={handleAssignRsaClick} className="flex items-center text-sm font-semibold bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-md hover:bg-indigo-200 border border-indigo-200">
                        <PackagePlus className="w-4 h-4 mr-2" />
                        Assign RSA Programs
                    </button>
                    <button onClick={() => setCartTreeIds([])} className="p-2 rounded-md hover:bg-red-100 text-red-600" aria-label="Clear selection">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default BulkActionBar;