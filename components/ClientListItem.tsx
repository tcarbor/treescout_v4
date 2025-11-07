
import React from 'react';
import { Link } from 'react-router-dom';
import type { Client } from '../types';
import { ChevronRight, Building } from 'lucide-react';
import { useStore } from '../services/mockData';

interface ClientListItemProps {
  client: Client;
}

const ClientListItem: React.FC<ClientListItemProps> = ({ client }) => {
  const propertyCount = useStore(state => state.properties.filter(p => p.clientId === client.id).length);

  return (
    <li>
      <Link to={`/clients/${client.id}`} className="block hover:bg-gray-50">
        <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-md font-semibold text-green-700 truncate">{client.name}</p>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <Building className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
              <span>{propertyCount} {propertyCount === 1 ? 'property' : 'properties'}</span>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </Link>
    </li>
  );
};

export default ClientListItem;
