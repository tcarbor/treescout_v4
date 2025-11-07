
// pages/DashboardPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import ClientListItem from '../components/ClientListItem';
import { PlusCircle, Users, TreePine, DollarSign, Repeat } from 'lucide-react';
import ClientModal from '../components/ClientModal';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';

// Firestore (emulator-friendly)
import { db, ready } from "../services/firebase";
import { collection, getDocs } from "firebase/firestore";

// --- Types that match your Firestore seed ---
type ClientDoc = {
  name: string;
  contacts?: { name?: string; email?: string; phone?: string }[];
};
type PropertyDoc = {
  clientId: string;
  name: string;
  address?: string;
  location?: { lat?: number; lng?: number };
};
type TreeDoc = {
  clientId: string;
  propertyId: string;
  species?: string;
  dbh?: number;
  condition?: string;
  location?: { lat?: number; lng?: number };
};
type RecommendationDoc = {
  clientId: string;
  propertyId: string;
  treeIds?: string[];
  serviceCode?: string;
  rsaProgramId?: string;
  status?: string;
  perVisitPrice?: number;
};

// A component to set map bounds correctly within the MapContainer context
const FitBounds: React.FC<{ bounds: L.LatLngBounds }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
};

const StatCard: React.FC<{ icon: React.ElementType; title: string; value: string | number; colorClass: string; }> = ({ icon: Icon, title, value, colorClass }) => (
  <div className="bg-white rounded-lg shadow-md p-4 flex items-center">
    <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Firestore-backed state (shaped like your UI expects)
  const [clients, setClients] = useState<Array<{ id: string; name: string; contacts?: ClientDoc['contacts'] }>>([]);
  const [properties, setProperties] = useState<Array<{ id: string; name: string; address?: string; location?: { lat?: number; lng?: number } }>>([]);
  const [trees, setTrees] = useState<Array<{ id: string } & TreeDoc>>([]);
  const [recommendations, setRecommendations] = useState<Array<{ id: string } & RecommendationDoc>>([]);

  // Load everything once Firebase is ready (resilient per-section)
  useEffect(() => {
    (async () => {
      await ready;

      // clients
      try {
        const snap = await getDocs(collection(db, "clients"));
        const c = snap.docs.map(d => {
          const data = d.data() as ClientDoc;
          return { id: d.id, name: data.name, contacts: data.contacts };
        });
        setClients(c);
      } catch (err) {
        console.error("[Dashboard] Failed to load clients:", err);
      }

      // properties
      try {
        const snap = await getDocs(collection(db, "properties"));
        const p = snap.docs.map(d => {
          const data = d.data() as PropertyDoc;
          return { id: d.id, name: data.name, address: data.address, location: data.location };
        });
        setProperties(p);
      } catch (err) {
        console.error("[Dashboard] Failed to load properties:", err);
      }

      // trees
      try {
        const snap = await getDocs(collection(db, "trees"));
        const t = snap.docs.map(d => ({ id: d.id, ...(d.data() as TreeDoc) }));
        setTrees(t);
      } catch (err) {
        console.error("[Dashboard] Failed to load trees:", err);
      }

      // recommendations
      try {
        const snap = await getDocs(collection(db, "recommendations"));
        const r = snap.docs.map(d => ({ id: d.id, ...(d.data() as RecommendationDoc) }));
        setRecommendations(r);
      } catch (err) {
        console.error("[Dashboard] Failed to load recommendations:", err);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    // Proposed Work Value: keep original logic (status === 'recommended')
    const proposedValue = recommendations
      .filter(r => r.status === 'recommended')
      .reduce((sum, r) => sum + (r.perVisitPrice || 0), 0);

    // RSA Coverage:
    // infer RSA when a recommendation has rsaProgramId and treeIds
    const rsaTreeIds = new Set<string>();
    recommendations.forEach(r => {
      if (r.rsaProgramId && Array.isArray(r.treeIds)) {
        r.treeIds.forEach(id => rsaTreeIds.add(id));
      }
    });
    const rawCoverage = trees.length > 0 ? Math.round((rsaTreeIds.size / trees.length) * 100) : 0;
    const rsaCoverage = Math.max(0, Math.min(100, rawCoverage)); // clamp 0–100

    return {
      totalClients: clients.length,
      totalTrees: trees.length,
      proposedWorkValue: proposedValue,
      rsaCoveragePercent: rsaCoverage,
    };
  }, [clients.length, trees.length, recommendations]);

  const bounds = useMemo(() => {
    const propertyLocations = properties
      .map(p => p.location)
      .filter((loc): loc is { lat: number, lng: number } => !!(loc && typeof loc.lat === 'number' && typeof loc.lng === 'number'));

    if (propertyLocations.length > 0) {
      return L.latLngBounds(propertyLocations.map(loc => [loc.lat, loc.lng]));
    }
    // Fallback (kept same as your original)
    return L.latLngBounds([[34.0522, -118.2437], [40.7128, -74.0060]]);
  }, [properties]);

  // Custom, on-brand SVG icon for properties on the dashboard map (unchanged)
  const propertyIcon = new L.DivIcon({
    html: `
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.25c-4.28 0-7.75 3.47-7.75 7.75 0 4.28 7.75 12.75 7.75 12.75s7.75-8.47 7.75-12.75C19.75 5.72 16.28 2.25 12 2.25z" fill="#166534" stroke="#FFFFFF" stroke-width="1.5"/>
        <path d="M12 12a2 2 0 100-4 2 2 0 000 4z" fill="#FFFFFF"/>
      </svg>
    `,
    className: 'bg-transparent border-0',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500 mt-1">A high-level overview of your operations.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-green-600 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            New Client
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard icon={Users} title="Active Clients" value={stats.totalClients} colorClass="bg-blue-500" />
          <StatCard icon={TreePine} title="Trees Managed" value={stats.totalTrees} colorClass="bg-green-500" />
          <StatCard icon={DollarSign} title="Proposed Work" value={`$${stats.proposedWorkValue.toLocaleString()}`} colorClass="bg-yellow-500" />
          <StatCard icon={Repeat} title="RSA Coverage" value={`${stats.rsaCoveragePercent}%`} colorClass="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[60vh] rounded-lg overflow-hidden shadow-md">
            <MapContainer bounds={bounds} scrollWheelZoom={true} className="w-full h-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {properties.map(property => (
                property.location &&
                typeof property.location.lat === 'number' &&
                typeof property.location.lng === 'number' && (
                  <Marker
                    key={property.id}
                    position={[property.location.lat, property.location.lng]}
                    icon={propertyIcon}
                  >
                    <Popup>
                      <div className="font-sans">
                        <h3 className="font-bold text-base mb-1">{property.name}</h3>
                        <p className="text-sm text-gray-600">{property.address || ''}</p>
                        <Link
                          to={`/properties/${property.id}`}
                          className="block text-center mt-2 text-sm font-semibold text-green-600 hover:underline"
                        >
                          View Property &rarr;
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
              <FitBounds bounds={bounds} />
            </MapContainer>
          </div>

          <div className="lg:col-span-1 bg-white rounded-lg shadow-md flex flex-col h-[60vh]">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Clients ({clients.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {clients.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {clients.map(client => (
                    <ClientListItem
                      key={client.id}
                      client={client} // keep your existing component API
                    />
                  ))}
                </ul>
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <p>No clients found. Add one to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default DashboardPage;