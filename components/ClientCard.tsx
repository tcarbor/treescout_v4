import React from 'react';
import { Link } from 'react-router-dom';
import type { Client } from '../types';
import { Building, ChevronRight } from 'lucide-react';
import { useStore } from '../services/mockData';

interface ClientCardProps {
  client: Client;
}

const ClientCard: React.FC<ClientCardProps> = ({ client }) => {
  const propertyCount = useStore(state => state.properties.filter(p => p.clientId === client.id).length);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/clients/${client.id}`} className="block p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-green-700">{client.name}</p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <Building className="h-4 w-4 mr-1.5 text-gray-400" />
              <span>{propertyCount} {propertyCount === 1 ? 'property' : 'properties'}</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </Link>
    </div>
  );
};

export default ClientCard;
