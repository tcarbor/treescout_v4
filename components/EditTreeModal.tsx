
// components/TargetSetDrawer.tsx
import React, { useState } from 'react';
import { useStore } from '../services/mockData';
import { ShoppingCart, Save, Trash2, X, PlusCircle } from 'lucide-react';

interface TargetSetDrawerProps {
  propertyId: string;
  onClose?: () => void; // For mobile
}

const TargetSetDrawer: React.FC<TargetSetDrawerProps> = ({ propertyId, onClose }) => {
  const { cartTreeIds, setCartTreeIds, targetSets, saveCartAsTargetSet, loadTargetSetIntoCart } = useStore();
  const trees = useStore(s => s.trees);

  const [newTargetSetName, setNewTargetSetName] = useState('');

  const propertyTargetSets = targetSets.filter(ts => ts.propertyId === propertyId);
  const cartTrees = trees.filter(t => cartTreeIds.includes(t.id));

  const handleSave = () => {
    if (newTargetSetName.trim()) {
      saveCartAsTargetSet(newTargetSetName, propertyId);
      setNewTargetSetName('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Target Cart
        </h2>
        {onClose && <button onClick={onClose} className="p-1"><X className="w-5 h-5"/></button>}
      </div>

      {/* Current Selection */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-700">Current Selection</h3>
          <span className="text-sm font-bold px-2 py-1 bg-green-100 text-green-800 rounded-md">{cartTreeIds.length} Trees</span>
        </div>
        <div className="max-h-40 overflow-y-auto text-sm space-y-1 pr-1">
          {cartTrees.map(t => <p key={t.id} className="text-gray-600 truncate">{t.species} (DBH: {t.dbh}")</p>)}
          {cartTreeIds.length === 0 && <p className="text-gray-400 italic">No trees selected.</p>}
        </div>
        {cartTreeIds.length > 0 && <button onClick={() => setCartTreeIds([])} className="text-xs text-red-600 hover:underline mt-2 flex items-center"><Trash2 className="w-3 h-3 mr-1"/>Clear Selection</button>}
      </div>

      {/* Save Selection */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-700 mb-2">Save Selection as Target Set</h3>
        <div className="flex space-x-2">
          <input 
            type="text" 
            placeholder="e.g., Front Yard Ash" 
            value={newTargetSetName}
            onChange={(e) => setNewTargetSetName(e.target.value)}
            className="flex-1 w-full p-2 border border-gray-300 rounded-md text-sm"
          />
          <button onClick={handleSave} disabled={cartTreeIds.length === 0 || !newTargetSetName.trim()} className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400">
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Existing Target Sets */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-700 mb-2">Existing Target Sets</h3>
        <div className="space-y-2">
          {propertyTargetSets.map(ts => (
            <button 
              key={ts.id} 
              onClick={() => loadTargetSetIntoCart(ts.id)}
              className="w-full text-left p-3 border rounded-md hover:bg-gray-100 transition-colors"
            >
              <p className="font-medium text-gray-800">{ts.name}</p>
              <p className="text-xs text-gray-500">{ts.treeIds.length} trees</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TargetSetDrawer;
