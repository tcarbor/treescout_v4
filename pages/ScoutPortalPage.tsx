// pages/ScoutPortalPage.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Popup, useMap, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Flag, MessageSquare, Send, X, FileText, ChevronLeft, User, Star, Key } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type {
  LatLng,
  Property,
  Tree,
  Settings,
  Section,
  ScoutItem,
  ScoutReport,
  PortalMessage,
} from '../services/data';

import {
  getPropertyById,
  getTreesByPropertyId,
  getUserSettings,
  getScoutReportById,
  getSectionsByPropertyId,
  getScoutItemsByReportId,
  getPortalMessagesByReportId,
  addPortalMessage,
} from '../services/data';

// --- ICONS & HELPERS ---
const flagIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2107/2107931.png',
  iconSize: [32, 32],
  iconAnchor: [5, 30],
  popupAnchor: [0, -32],
});

const photoMarkerIcon = new L.DivIcon({
  html: `
    <div class="custom-div-icon">
      <img src="https://cdn-icons-png.flaticon.com/512/484/484167.png" alt="tree" style="opacity: 0.8;" />
      <div class="adornment" style="background-color: #3b82f6; width: 20px; height: 20px; right: -5px; bottom: -2px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      </div>
    </div>
  `,
  className: 'bg-transparent border-0',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// --- MAP CONTROLLER COMPONENTS ---
const MapController: React.FC<{ flyToLocation: L.LatLng | null; flyToBounds: L.LatLngBounds | null }> = ({ flyToLocation, flyToBounds }) => {
  const map = useMap();
  useEffect(() => {
    if (flyToLocation) {
      map.flyTo(flyToLocation, 18, { animate: true, duration: 1 });
    } else if (flyToBounds && flyToBounds.isValid()) {
      map.flyToBounds(flyToBounds, { padding: [50, 50], duration: 1 });
    }
  }, [flyToLocation, flyToBounds, map]);
  return null;
};

const NoteTaker: React.FC<{ onAddNote: (latlng: L.LatLng) => void }> = ({ onAddNote }) => {
  const map = useMap();
  useEffect(() => {
    map.getContainer().style.cursor = 'crosshair';
    return () => {
      map.getContainer().style.cursor = '';
    };
  }, [map]);

  useMapEvents({
    click(e) {
      onAddNote(e.latlng);
    },
  });
  return null;
};

// --- VIEW COMPONENTS ---
const ReportView: React.FC<{
  report: ScoutReport;
  property: Property;
  sections: Section[];
  trees: Tree[];
  scoutItems: ScoutItem[];
  portalMessages: PortalMessage[];
  flyToLocation: L.LatLng | null;
  flyToBounds: L.LatLngBounds | null;
  onAddNote: (latlng: L.LatLng) => void;
  onFlyToLocation: (location: L.LatLng) => void;
  onFlyToBounds: (bounds: L.LatLngBounds) => void;
}> = ({
  report,
  property,
  sections,
  trees: allTrees,
  scoutItems,
  portalMessages,
  flyToLocation,
  flyToBounds,
  onAddNote,
  onFlyToLocation,
  onFlyToBounds,
}) => {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [highlightGroup, setHighlightGroup] = useState<'none' | 'landmark' | 'keystone'>('none');

  const propertyTrees = useMemo(
    () => allTrees.filter((t) => t.propertyId === report.propertyId),
    [allTrees, report.propertyId]
  );

  const reportSections = useMemo(
    () => sections.filter((s) => s.propertyId === report.propertyId),
    [sections, report.propertyId]
  );

  const reportItems = useMemo(
    () => scoutItems.filter((i) => i.scoutReportId === report.id),
    [scoutItems, report.id]
  );

  const reportMessages = useMemo(
    () => portalMessages.filter((n) => n.reportId === report.id && n.location),
    [portalMessages, report.id]
  );

  const sectionData = useMemo(() => {
    const bySection = reportSections.map((section) => {
      const items = reportItems.filter((item) => item.sectionId === section.id);
      const total = items.reduce((sum, item) => sum + (item.estimatedBudget || 0), 0);
      return { ...section, items, total };
    });
    return bySection.filter((s) => (s as any).items.length > 0);
  }, [reportSections, reportItems]);

  const flyToSectionBounds = (section: (typeof sectionData)[0]) => {
    if ((section as any).coords && (section as any).coords.length) {
      const bounds = L.latLngBounds((section as any).coords.map((c: LatLng) => L.latLng(c.lat, c.lng)));
      if (bounds.isValid()) {
        onFlyToBounds(bounds);
      }
    }
  };

  const flyToItemLocation = (item: (typeof reportItems)[0]) => {
    if (item.location) {
      onFlyToLocation(L.latLng(item.location.lat, item.location.lng));
    }
  };

  const sectionColors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c'];
  const defaultCenter = property?.location || { lat: 34.0522, lng: -118.2437 };
  const bounds = L.latLngBounds(
    sectionData.flatMap((s: any) => (s.coords ? s.coords.map((c: LatLng) => L.latLng(c.lat, c.lng)) : []))
  );
  const mapBounds = bounds.isValid()
    ? bounds
    : L.latLngBounds([L.latLng(defaultCenter.lat, defaultCenter.lng)]);

  const mutedTreeIcon = new L.DivIcon({
    html: `<div style="width: 10px; height: 10px; border-radius: 50%; background-color: #9ca3af; opacity: 0.6; border: 1px solid white;"></div>`,
    className: 'bg-transparent border-0',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  const highlightedTreeIcon = new L.DivIcon({
    html: `<div style="width: 14px; height: 14px; border-radius: 50%; background-color: #f59e0b; box-shadow: 0 0 8px 3px #f59e0b; border: 2px solid white;"></div>`,
    className: 'bg-transparent border-0',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const ItemCard: React.FC<{ item: ScoutItem }> = ({ item }) => (
    <div
      onClick={item.location ? () => flyToItemLocation(item) : undefined}
      className={`p-4 flex flex-col md:flex-row gap-4 ${
        item.location ? 'cursor-pointer hover:bg-gray-50' : ''
      }`}
    >
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
          <h4 className="font-semibold text-gray-900">{item.title}</h4>
          {report.showGranularPricing && item.estimatedBudget > 0 && (
            <p className="text-md font-semibold text-gray-800 flex-shrink-0 sm:ml-4">
              ${item.estimatedBudget.toLocaleString()}
            </p>
          )}
        </div>
        {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
      </div>
      {item.images && item.images.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto flex-shrink-0">
          {item.images.map((img, idx) => (
            <a
              key={idx}
              href={img.markupUrl || img.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={img.markupUrl || img.url}
                alt={img.notes || `Image for ${item.title}`}
                className="w-32 h-24 object-cover rounded-md border hover:opacity-80 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
      <div className="lg:col-span-2 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
          <span className="text-sm font-semibold text-gray-600 flex-shrink-0">Highlight:</span>
          <div className="flex-grow grid grid-cols-3 gap-1">
            <button
              onClick={() => setHighlightGroup('none')}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                highlightGroup === 'none' ? 'bg-blue-500 text-white shadow-sm' : 'bg-white hover:bg-gray-200'
              }`}
            >
              None
            </button>
            <button
              onClick={() => setHighlightGroup('landmark')}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
                highlightGroup === 'landmark' ? 'bg-yellow-500 text-white shadow-sm' : 'bg-white hover:bg-gray-200'
              }`}
            >
              <Star className="w-3 h-3" /> Specimen
            </button>
            <button
              onClick={() => setHighlightGroup('keystone')}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
                highlightGroup === 'keystone' ? 'bg-purple-500 text-white shadow-sm' : 'bg-white hover:bg-gray-200'
              }`}
            >
              <Key className="w-3 h-3" /> Keystone
            </button>
          </div>
        </div>

        {sectionData.map((section: any) => {
          const photoNotes = section.items.filter(
            (i: ScoutItem) => i.images && i.images.length > 0 && (i.estimatedBudget || 0) === 0
          );
          const regularItems = section.items.filter(
            (i: ScoutItem) => !photoNotes.some((pn: ScoutItem) => pn.id === i.id)
          );

          return (
            <div key={section.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => flyToSectionBounds(section)}
                className="w-full text-left p-4 bg-gray-50 border-b flex flex-wrap justify-between items-center gap-2 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-bold">{section.name}</h3>
                <p className="text-lg font-bold text-green-700">${section.total.toLocaleString()}</p>
              </button>
              <div className="divide-y divide-gray-200">
                {regularItems.map((item: ScoutItem) => (
                  <ItemCard key={item.id} item={item} />
                ))}
                {regularItems.length > 0 && photoNotes.length > 0 && (
                  <div className="p-2 bg-gray-50 border-t border-b">
                    <h5 className="text-xs font-bold uppercase text-gray-500">Photo Notes</h5>
                  </div>
                )}
                {photoNotes.map((item: ScoutItem) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="lg:col-span-3">
        <div className="sticky top-24 z-10">
          <div className="h-[70vh] w-full rounded-lg shadow-md overflow-hidden border relative">
            <MapContainer
              bounds={mapBounds.pad(0.1)}
              maxZoom={22}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <MapController flyToLocation={flyToLocation} flyToBounds={flyToBounds} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; CARTO"
                maxZoom={22}
              />

              {isAddingNote && (
                <NoteTaker
                  onAddNote={(latlng) => {
                    onAddNote(latlng);
                    setIsAddingNote(false);
                  }}
                />
              )}

              {propertyTrees.map((tree) => {
                if (!tree.location) return null;
                let icon = mutedTreeIcon;
                if (
                  (highlightGroup === 'landmark' && (tree as any).isLandmark) ||
                  (highlightGroup === 'keystone' && (tree as any).isKeystone)
                ) {
                  icon = highlightedTreeIcon;
                }
                return (
                  <Marker
                    key={`tree-${tree.id}`}
                    position={tree.location as any}
                    icon={icon}
                    zIndexOffset={-1000}
                  />
                );
              })}

              {sectionData.map(
                (section: any, index: number) =>
                  section.coords && (
                    <Polygon
                      key={section.id}
                      positions={section.coords.map((c: LatLng) => [c.lat, c.lng]) as any}
                      pathOptions={{
                        color: sectionColors[index % sectionColors.length],
                        weight: 2,
                        fillOpacity: 0.3,
                      }}
                    >
                      <Popup>
                        <div className="p-1 w-48">
                          <h4 className="font-bold text-gray-800 text-base mb-1">{section.name}</h4>
                          <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                            <p className="flex justify-between">
                              <span>Items:</span>{' '}
                              <span className="font-semibold">{section.items.length}</span>
                            </p>
                            <p className="flex justify-between">
                              <span>Budget:</span>{' '}
                              <span className="font-semibold">${section.total.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Polygon>
                  )
              )}

              {reportItems
                .filter((i) => i.location)
                .map((item) => (
                  <Marker key={item.id} position={item.location as any} icon={photoMarkerIcon}>
                    <Popup>
                      <div className="w-48">
                        <h4 className="font-bold text-base mb-2">{item.title}</h4>
                        {item.images && item.images.length > 0 && (
                          <img
                            src={item.images[0].markupUrl || item.images[0].url}
                            alt={item.title}
                            className="w-full h-auto rounded-md mb-2"
                          />
                        )}
                        <p className="text-sm">{item.images?.[0]?.notes}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {reportMessages.map(
                (note) =>
                  note.location && (
                    <Marker key={note.id} position={note.location as any} icon={flagIcon}>
                      <Popup>
                        <p className="font-sans text-sm">{note.text}</p>
                      </Popup>
                    </Marker>
                  )
              )}
            </MapContainer>

            {isAddingNote && (
              <div className="absolute inset-0 bg-black/40 z-[1001] flex items-center justify-center pointer-events-none backdrop-blur-sm">
                <div className="bg-white p-6 rounded-lg shadow-2xl text-center animate-pulse">
                  <Flag className="w-10 h-10 mx-auto text-blue-600" />
                  <p className="font-bold text-lg mt-2">Click anywhere on the map to place your note.</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAddingNote((v) => !v)}
            className={`w-full mt-4 flex items-center justify-center font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors text-sm ${
              isAddingNote ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Flag className="w-4 h-4 mr-2" />
            {isAddingNote ? 'Cancel Pin Drop' : 'Pin a Note on Map'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MessagesView: React.FC<{
  report: ScoutReport;
  messages: PortalMessage[];
  onSend: (text: string) => Promise<void>;
  onViewOnMap: (location: L.LatLng) => void;
}> = ({ report, messages, onSend, onViewOnMap }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAtMs - b.createdAtMs),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sorted.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await onSend(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="mt-6 max-w-3xl mx-auto bg-white rounded-lg shadow-md flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {sorted.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.author === 'Client' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${msg.author === 'Client' ? 'bg-green-600' : 'bg-gray-500'}`}>
              {msg.author.charAt(0)}
            </div>
            <div className={`p-3 rounded-lg max-w-md ${msg.author === 'Client' ? 'bg-green-100' : 'bg-gray-100'}`}>
              <p className="text-sm text-gray-800">{msg.text}</p>
              {msg.location && (
                <button
                  onClick={() => onViewOnMap(L.latLng(msg.location!.lat, msg.location!.lng))}
                  className="text-xs font-semibold text-blue-600 hover:underline mt-2 flex items-center"
                >
                  <Flag className="w-3 h-3 mr-1" /> View on Map
                </button>
              )}
              <p className="text-xs text-gray-400 mt-2 text-right">
                {new Date(msg.createdAtMs).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-gray-50 border-t">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded-lg"
          />
          <button
            type="submit"
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            disabled={!newMessage.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

const InstructionsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 mb-6 relative shadow-sm">
    <button
      onClick={onClose}
      className="absolute top-2 right-2 p-1 text-blue-500 hover:bg-blue-100 rounded-full"
    >
      <X className="w-4 h-4" />
    </button>
    <h2 className="font-bold text-blue-800 text-lg">Welcome to Your Scout Report Portal!</h2>
    <ul className="list-disc list-inside mt-2 text-sm text-blue-700 space-y-1">
      <li>This is an interactive field report. Click on map sections or list items to explore.</li>
      <li>
        Use the <b className="font-semibold">Messages</b> tab to communicate with your arborist.
      </li>
      <li>
        Want to ask about a specific area? Click the{' '}
        <b className="font-semibold">Pin a Note on Map</b> button, then click anywhere on the map to leave a comment.
      </li>
    </ul>
  </div>
);

const ScoutPortalPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ScoutReport | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [scoutItems, setScoutItems] = useState<ScoutItem[]>([]);
  const [portalMessages, setPortalMessages] = useState<PortalMessage[]>([]);
  const [userSettings, setUserSettingsState] = useState<Settings>({
    arboristName: '',
    companyName: '',
    email: '',
    phone: '',
    digitalCardUrl: '',
  });

  const [activeTab, setActiveTab] = useState<'report' | 'messages'>('report');
  const [flyToLocation, setFlyToLocation] = useState<L.LatLng | null>(null);
  const [flyToBounds, setFlyToBounds] = useState<L.LatLngBounds | null>(null);
  const [noteModal, setNoteModal] = useState<{ location: L.LatLng } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Load everything
  useEffect(() => {
    (async () => {
      if (!reportId) return;
      setLoading(true);
      try {
        const r = await getScoutReportById(reportId);
        if (!r) {
          setReport(null);
          setLoading(false);
          return;
        }
        setReport(r);

        const [prop, secs, t, items, msgs] = await Promise.all([
          getPropertyById(r.propertyId),
          getSectionsByPropertyId(r.propertyId),
          getTreesByPropertyId(r.propertyId),
          getScoutItemsByReportId(r.id),
          getPortalMessagesByReportId(r.id),
        ]);
        if (prop) setProperty(prop);
        setSections(secs);
        setTrees(t);
        setScoutItems(items);
        setPortalMessages(msgs);

        const settings = await getUserSettings(r.arboristUid || 'public');
        setUserSettingsState(settings);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const totalBudget = useMemo(
    () =>
      scoutItems
        .filter((i) => i.scoutReportId === reportId)
        .reduce((sum, i) => sum + (i.estimatedBudget || 0), 0),
    [scoutItems, reportId]
  );

  const onFlyToLocation = (location: L.LatLng) => {
    setActiveTab('report');
    setFlyToLocation(location);
    setFlyToBounds(null);
    setTimeout(() => setFlyToLocation(null), 100);
  };

  const onFlyToBounds = (bounds: L.LatLngBounds) => {
    setActiveTab('report');
    setFlyToBounds(bounds);
    setFlyToLocation(null);
    setTimeout(() => setFlyToBounds(null), 100);
  };

  const handleSaveNote = async () => {
    if (!noteText || !noteModal || !report) {
      setNoteModal(null);
      setNoteText('');
      return;
    }
    await addPortalMessage({
      reportId: report.id,
      text: noteText,
      author: 'Client',
      location: { lat: noteModal.location.lat, lng: noteModal.location.lng },
    });
    const refreshed = await getPortalMessagesByReportId(report.id);
    setPortalMessages(refreshed);
    setNoteModal(null);
    setNoteText('');
  };

  const handleSendMessage = async (text: string) => {
    if (!report) return;
    await addPortalMessage({
      reportId: report.id,
      text,
      author: 'Client',
    });
    const refreshed = await getPortalMessagesByReportId(report.id);
    setPortalMessages(refreshed);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading…</div>;
  }
  if (!report || !property) {
    return <div className="p-8 text-center text-red-600 font-bold">Report Not Found.</div>;
  }

  return (
    <div className="p-4 md:p-6 relative">
      {noteModal && (
        <AnimatePresence>
          <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm"
            >
              <h3 className="text-lg font-bold mb-4">Add Note</h3>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note..."
                rows={3}
                className="w-full p-2 border rounded-md mb-4 bg-white text-gray-900"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setNoteModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      <div className="mb-6">
        <Link
          to={`/properties/${property?.id}/scout`}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 font-medium"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Scout Tab
        </Link>

        {showInstructions && <InstructionsPanel onClose={() => setShowInstructions(false)} />}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property?.name}</h1>
            <p className="text-md text-gray-500">{report.name} (Client View)</p>
            <p className="text-sm text-gray-500 mt-1">
              Prepared by{' '}
              <span className="font-semibold">
                {userSettings.arboristName}, {userSettings.companyName}
              </span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-semibold text-gray-500">Total Estimated Budget</p>
            <p className="text-2xl font-bold text-green-700">${totalBudget.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <main>
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('report')}
              className={`${
                activeTab === 'report'
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-bold text-sm flex items-center gap-2`}
            >
              <FileText className="w-4 h-4" /> Report
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`${
                activeTab === 'messages'
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-bold text-sm flex items-center gap-2`}
            >
              <MessageSquare className="w-4 h-4" /> Messages
            </button>
          </nav>
        </div>

        {activeTab === 'report' && (
          <ReportView
            report={report}
            property={property}
            sections={sections}
            trees={trees}
            scoutItems={scoutItems}
            portalMessages={portalMessages}
            flyToLocation={flyToLocation}
            flyToBounds={flyToBounds}
            onAddNote={(latlng) => setNoteModal({ location: latlng })}
            onFlyToLocation={onFlyToLocation}
            onFlyToBounds={onFlyToBounds}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesView
            report={report}
            messages={portalMessages}
            onSend={handleSendMessage}
            onViewOnMap={onFlyToLocation}
          />
        )}
      </main>

      {userSettings.digitalCardUrl && (
        <button
          onClick={() => setIsCardOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full h-16 w-16 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-[1003]"
          aria-label="Contact Arborist"
        >
          <User className="w-8 h-8" />
        </button>
      )}

      <AnimatePresence>
        {isCardOpen && (
          <div className="fixed inset-0 bg-black/60 z-[1002] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-lg shadow-xl w-full max-w-sm h-[80vh] overflow-hidden"
            >
              <iframe
                src={userSettings.digitalCardUrl}
                className="w-full h-full border-0"
                title="Arborist Business Card"
              />
              <button
                onClick={() => setIsCardOpen(false)}
                className="absolute top-2 right-2 p-1.5 bg-white/50 backdrop-blur-sm rounded-full text-gray-700 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScoutPortalPage;