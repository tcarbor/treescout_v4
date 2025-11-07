// pages/ClientDetailPage.tsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Building,
  User,
  Mail,
  Phone,
  ArrowRight,
  PlusCircle,
  X,
  MapPin,
  Edit,
  LocateFixed,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import ClientModal from '../components/ClientModal';
import type { Property } from '../services/data';
import {
  getClientById,
  getPropertiesByClientId,
  getTreesByPropertyIds,
  getPlanItemsByPropertyIds,
  getRecTemplates,
  addProperty as addPropertyFS,
  type RecTemplate,
  type PlanItem,
} from '../services/data';

// ---------- Mock Places Autocomplete (unchanged UI) ----------
const mockAddresses = [
  { description: '1600 Amphitheatre Parkway, Mountain View, CA', location: { lat: 37.422, lng: -122.084 } },
  { description: '1 Infinite Loop, Cupertino, CA', location: { lat: 37.3318, lng: -122.0312 } },
  { description: '350 5th Ave, New York, NY', location: { lat: 40.7484, lng: -73.9857 } },
  { description: '233 S Wacker Dr, Chicago, IL', location: { lat: 41.8789, lng: -87.6359 } },
  { description: '1060 W Addison St, Chicago, IL', location: { lat: 41.9484, lng: -87.6553 } },
];

// ---------- Small helpers ----------
const getCommonName = (species: string = '') =>
  species.match(/\(([^)]+)\)/)?.[1] || species || 'Unknown';

// ---------- Inline widgets (unchanged styling) ----------
const StatChart: React.FC<{
  title: string;
  data: { label: string; value: number }[];
  total: number;
  colorClass: string;
}> = ({ title, data, total, colorClass }) => {
  if (total === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-bold text-gray-600 uppercase mb-1">{title}</h4>
      <div className="space-y-1">
        {data.map(({ label, value }) => (
          <div key={label} className="flex items-center text-xs">
            <span className="w-24 truncate font-medium text-gray-700">{label}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2.5 mx-2">
              <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${(value / total) * 100}%` }} />
            </div>
            <span className="w-6 text-right font-mono text-gray-500">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MyLocationButton: React.FC = () => {
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
        console.error('Error getting location', error);
        alert('Could not get your location. Please ensure location services are enabled.');
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-200"
        title="Go to my location"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
        ) : (
          <LocateFixed className="w-5 h-5 text-gray-700" />
        )}
      </button>
    </div>
  );
};

const MapController: React.FC<{
  selectedPropertyId: string | null;
  properties: Property[];
  markerRefs: React.RefObject<Map<string, L.Marker | null>>;
}> = ({ selectedPropertyId, properties, markerRefs }) => {
  const map = useMap();
  useEffect(() => {
    if (!selectedPropertyId) return;
    const property = properties.find((p) => p.id === selectedPropertyId);
    const marker = markerRefs.current?.get(selectedPropertyId) ?? null;
    if (property?.location && marker) {
      map.flyTo(property.location as L.LatLngExpression, 17, { animate: true, duration: 1 });
      marker.openPopup();
    }
  }, [selectedPropertyId, properties, markerRefs, map]);
  return null;
};

const FitBounds: React.FC<{ bounds: L.LatLngBounds | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, bounds]);
  return null;
};

// ---------- Add Property Modal (writes to Firestore) ----------
const NewPropertyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSaved: () => void; // refresh callback
}> = ({ isOpen, onClose, clientId, onSaved }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<typeof mockAddresses>([]);
  const [saving, setSaving] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (address.length > 2) {
      setSuggestions(mockAddresses.filter((a) => a.description.toLowerCase().includes(address.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  }, [address]);

  const handleSelectAddress = (suggestion: (typeof mockAddresses)[number]) => {
    setAddress(suggestion.description);
    setLocation(suggestion.location);
    setSuggestions([]);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !location) {
      alert('Please fill out all fields and select an address from the suggestions.');
      return;
    }
    setSaving(true);
    try {
      await addPropertyFS({
        clientId,
        name: name.trim(),
        address: address.trim(),
        location,
      });
      onClose();
      setName('');
      setAddress('');
      setLocation(null);
      onSaved(); // let parent refetch properties
    } catch (e) {
      console.error('Failed to save property:', e);
      alert('Save failed. Please try again.');
    } finally {
      setSaving(false);
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
              <Building className="w-5 h-5 mr-2" />
              Add New Property
            </h2>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700">Property Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                placeholder="e.g., Main Campus, West Wing"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                ref={addressInputRef}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                placeholder="Start typing an address..."
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      onMouseDown={() => handleSelectAddress(s)}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center"
                    >
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {s.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md mr-3"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !location}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md disabled:bg-gray-400"
            >
              {saving ? 'Saving…' : 'Save Property'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ---------- Main Page ----------
const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  // Local UI state
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const propertyMarkerRefs = useRef(new Map<string, L.Marker | null>());

  // Firestore-backed data
  const [client, setClient] = useState<any | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [trees, setTrees] = useState<any[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [recTemplates, setRecTemplatesState] = useState<RecTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Index rec templates by serviceCode for quick lookup in charts
  const recIndex = useMemo(() => {
    const m = new Map<string, RecTemplate>();
    for (const t of recTemplates) if (t.serviceCode) m.set(t.serviceCode, t);
    return m;
  }, [recTemplates]);

  // Fetch everything for this client
  const loadAll = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const clientDoc = await getClientById(clientId);
      setClient(clientDoc || null);

      const props = await getPropertiesByClientId(clientId);
      setProperties(props);

      const propertyIds = props.map((p) => p.id);
      const [treesArr, planItemsArr, templates] = await Promise.all([
        getTreesByPropertyIds(propertyIds),
        getPlanItemsByPropertyIds(propertyIds),
        getRecTemplates(),
      ]);

      setTrees(treesArr);
      setPlanItems(planItemsArr);
      setRecTemplatesState(templates);
    } catch (e) {
      console.error('Client detail load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Map icon styles (unchanged)
  const speciesToHsl = (species: string) => {
    let hash = 0;
    for (let i = 0; i < species.length; i++) {
      hash = species.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 80%, 60%)`;
  };

  const createTreeIcon = (species: string) => {
    const color = speciesToHsl(species);
    return new L.DivIcon({
      html: `<div style="width:12px;height:12px;border-radius:50%;background-color:${color};box-shadow:0 0 8px 2px ${color};border:1px solid white;"></div>`,
      className: 'bg-transparent border-0',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  const propertyMapIcon = new L.DivIcon({
    html: `
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 21V9.5l8-6 8 6V21h-6v-6h-4v6H4z" fill="#4B5563" stroke="#FFFFFF" stroke-width="1.5"/>
      </svg>
    `,
    className: 'bg-transparent border-0',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  // Derived
  const propertyIds = useMemo(() => new Set(properties.map((p) => p.id)), [properties]);

  const clientTrees = useMemo(
    () => trees.filter((t) => propertyIds.has(t.propertyId)),
    [trees, propertyIds]
  );

  const mapBounds = useMemo(() => {
    const locations = [
      ...properties.map((p) => p.location),
      ...clientTrees.map((t) => t.location),
    ].filter(
      (loc): loc is { lat: number; lng: number } =>
        !!(loc && typeof (loc as any).lat === 'number' && typeof (loc as any).lng === 'number')
    );

    if (locations.length > 0) {
      return L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]) as [number, number][]);
    }
    return null;
  }, [properties, clientTrees]);

  const handlePropertyClick = (property: Property) => {
    if (selectedPropertyId === property.id) {
      navigate(`/properties/${property.id}`);
    } else {
      setSelectedPropertyId(property.id);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-bold text-red-600">Client not found</h2>
        <Link to="/clients" className="text-blue-600 hover:underline mt-4 inline-block">
          &larr; Back to all clients
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 font-medium"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Clients
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{client.name}</h1>
            </div>
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="flex items-center text-sm font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-gray-300"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Client
            </button>
          </div>

          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-500" />
              Contacts
            </h3>
            {Array.isArray(client.contacts) && client.contacts.length ? (
              client.contacts.map(
                (
                  contact: { name: string; email?: string; phone?: string },
                  index: number
                ) => (
                  <div key={index} className="flex items-center space-x-6 text-gray-600">
                    <p className="font-medium">{contact.name}</p>
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center hover:text-blue-600">
                        <Mail className="w-4 h-4 mr-1.5" /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center hover:text-blue-600">
                        <Phone className="w-4 h-4 mr-1.5" /> {contact.phone}
                      </a>
                    )}
                  </div>
                )
              )
            ) : (
              <p className="text-gray-500">No contacts listed.</p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <MapPin className="w-6 h-6 mr-3 text-gray-500" />
              Client Asset Map
            </h2>
            <button
              onClick={() => setIsPropertyModalOpen(true)}
              className="flex items-center bg-green-600 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Property
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[70vh] rounded-lg overflow-hidden shadow-md">
              <MapContainer
                center={mapBounds?.getCenter() || [38, -95]}
                zoom={mapBounds ? 12 : 4}
                scrollWheelZoom
                className="w-full h-full"
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {properties.map((prop) => {
                  const propertyTrees = clientTrees.filter((t) => t.propertyId === prop.id);
                  const propertyPlanItems = planItems.filter((i) => i.propertyId === prop.id);

                  // Top Species
                  const speciesData = (Object.entries(
                    propertyTrees.reduce<Record<string, number>>((acc, tree) => {
                      const name = getCommonName(tree.species);
                      acc[name] = (acc[name] || 0) + 1;
                      return acc;
                    }, {})
                  ) as Array<[string, number]>)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([label, value]) => ({ label, value }));

                  // Service Categories
                  const serviceData = (Object.entries(
                    propertyPlanItems.reduce<Record<string, number>>((acc, item) => {
                      const template = item.serviceCode ? recIndex.get(item.serviceCode) : undefined;
                      const category = (template?.category || 'Other').toString();
                      acc[category] = (acc[category] || 0) + 1;
                      return acc;
                    }, {})
                  ) as Array<[string, number]>)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([label, value]) => ({ label, value }));

                  // Contract Types
                  const contractData = (Object.entries(
                    propertyPlanItems.reduce<Record<string, number>>((acc, item) => {
                      const type = item.schedule?.type === 'rsa' ? 'RSA' : 'One-Off';
                      acc[type] = (acc[type] || 0) + 1;
                      return acc;
                    }, {})
                  ) as Array<[string, number]>)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, value]) => ({ label, value }));

                  return (
                    prop.location && (
                      <Marker
                        key={`prop-${prop.id}`}
                        position={prop.location as L.LatLngExpression}
                        icon={propertyMapIcon}
                        zIndexOffset={1000}
                        ref={(el) => propertyMarkerRefs.current.set(prop.id, el)}
                      >
                        <Popup>
                          <div className="font-sans w-64 space-y-3">
                            <h3 className="font-bold text-base mb-1">{prop.name}</h3>
                            <StatChart
                              title="Top Species"
                              data={speciesData}
                              total={propertyTrees.length}
                              colorClass="bg-green-500"
                            />
                            <StatChart
                              title="Service Categories"
                              data={serviceData}
                              total={propertyPlanItems.length}
                              colorClass="bg-blue-500"
                            />
                            <StatChart
                              title="Contract Types"
                              data={contractData}
                              total={propertyPlanItems.length}
                              colorClass="bg-purple-500"
                            />
                            <Link
                              to={`/properties/${prop.id}`}
                              className="block text-center mt-2 pt-2 border-t text-sm font-semibold text-green-600 hover:underline"
                            >
                              View Full Property &rarr;
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  );
                })}

                {clientTrees.map((tree) =>
                  tree.location ? (
                    <Marker
                      key={tree.id}
                      position={tree.location as L.LatLngExpression}
                      icon={createTreeIcon(tree.species)}
                      zIndexOffset={-1000}
                    />
                  ) : null
                )}

                <FitBounds bounds={mapBounds} />
                <MyLocationButton />
                <MapController
                  selectedPropertyId={selectedPropertyId}
                  properties={properties}
                  markerRefs={propertyMarkerRefs}
                />
              </MapContainer>
            </div>

            <div className="lg:col-span-1 h-[70vh] bg-white rounded-lg shadow-md flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-xl font-bold text-gray-800">Properties ({properties.length})</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {properties.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {properties.map((prop) => (
                      <li
                        key={prop.id}
                        onClick={() => handlePropertyClick(prop)}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedPropertyId === prop.id ? 'bg-green-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p
                              className={`font-bold text-gray-800 ${
                                selectedPropertyId === prop.id ? 'text-green-700' : ''
                              }`}
                            >
                              {prop.name}
                            </p>
                            <p className="text-gray-500 text-sm">{(prop as any).address || 'No address provided'}</p>
                          </div>
                          <ArrowRight
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              selectedPropertyId === prop.id ? 'translate-x-1 text-green-600' : ''
                            }`}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <p>No properties found for this client.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewPropertyModal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        clientId={clientId!}
        onSaved={loadAll}
      />

      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} clientToEdit={client} />
    </>
  );
};

export default ClientDetailPage;