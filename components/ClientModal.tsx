// components/ClientModal.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/mockData';
import type { Client } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusCircle, UserPlus, X, Trash2, Edit } from 'lucide-react';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientToEdit?: Client;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, clientToEdit }) => {
    const { addClient, updateClient } = useStore();
    const [clientName, setClientName] = useState('');
    const [contacts, setContacts] = useState([{ name: '', email: '', phone: '' }]);

    const isEditMode = !!clientToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setClientName(clientToEdit.name);
                setContacts(clientToEdit.contacts.length > 0 ? clientToEdit.contacts : [{ name: '', email: '', phone: '' }]);
            } else {
                setClientName('');
                setContacts([{ name: '', email: '', phone: '' }]);
            }
        }
    }, [isOpen, clientToEdit, isEditMode]);

    const handleContactChange = (index: number, field: 'name' | 'email' | 'phone', value: string) => {
        const newContacts = [...contacts];
        newContacts[index][field] = value;
        setContacts(newContacts);
    };

    const addContact = () => {
        setContacts([...contacts, { name: '', email: '', phone: '' }]);
    };

    const removeContact = (index: number) => {
        const newContacts = contacts.filter((_, i) => i !== index);
        setContacts(newContacts);
    };

    const handleSave = () => {
        if (clientName.trim()) {
            const finalContacts = contacts.filter(c => c.name.trim());
            if (isEditMode) {
                const updatedClient: Client = {
                    ...clientToEdit,
                    name: clientName,
                    contacts: finalContacts,
                };
                updateClient(updatedClient);
            } else {
                const newClient: Omit<Client, 'id'> = {
                    name: clientName,
                    contacts: finalContacts,
                };
                addClient(newClient);
            }
            onClose();
        }
    };
    
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[90vh]"
                >
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            {isEditMode ? <Edit className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                            {isEditMode ? 'Edit Client' : 'Add New Client'}
                        </h2>
                        <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                    </div>
                    
                    <div className="p-6 space-y-6 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Client Name</label>
                            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900" placeholder="e.g., Oak Valley Estates HOA" />
                        </div>
                        
                        <div>
                            <h3 className="text-md font-semibold text-gray-800 mb-2">Contacts</h3>
                            <div className="space-y-4">
                                {contacts.map((contact, index) => (
                                    <div key={index} className="p-3 border rounded-lg bg-gray-50 relative">
                                        {contacts.length > 1 && (
                                            <button onClick={() => removeContact(index)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><Trash2 className="w-3 h-3"/></button>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="text" value={contact.name} onChange={(e) => handleContactChange(index, 'name', e.target.value)} placeholder="Full Name" className="p-2 border rounded-md bg-white text-gray-900" />
                                            <input type="email" value={contact.email} onChange={(e) => handleContactChange(index, 'email', e.target.value)} placeholder="Email Address" className="p-2 border rounded-md bg-white text-gray-900" />
                                            <input type="tel" value={contact.phone} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} placeholder="Phone Number" className="p-2 border rounded-md col-span-2 bg-white text-gray-900" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addContact} className="mt-3 text-sm text-green-600 font-semibold flex items-center hover:text-green-800">
                                <PlusCircle className="w-4 h-4 mr-1"/> Add another contact
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3">Cancel</button>
                        <button onClick={handleSave} disabled={!clientName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md disabled:bg-gray-400">Save Client</button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ClientModal;