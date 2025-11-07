// pages/PropertyPage.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, MapPin } from "lucide-react";

import Tabs from "../components/TreeMapping";
import TreesTab from "../components/TreesTab";
import PlanTab from "../components/PlanTab";
import RsaBuilderTab from "../components/RsaBuilderTab";
import ScoutTab from "../components/ScoutTab";
import LidarTab from "../components/LidarTab"; // (kept import even if not used yet)
import type { Property } from "../services/data";

import { getPropertyById, getClientById } from "../services/data";

type TabId =
  | "trees"
  | "plan"
  | "scout"
  | "rsa-builder"
  | "recommendations"
  | "work-orders";

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: "trees", label: "Trees" },
  { id: "plan", label: "Plan" },
  { id: "scout", label: "Scout" },
  { id: "rsa-builder", label: "RSA Builder" },
  { id: "recommendations", label: "All Recs" },
  { id: "work-orders", label: "Work Orders" },
];

const isTabId = (v: string | undefined): v is TabId =>
  !!v && ALL_TABS.some((t) => t.id === v);

const PropertyPage: React.FC = () => {
  const params = useParams<{ propertyId: string; tab?: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Normalize active tab (fallback to "trees" if the param is invalid/missing)
  const activeTab: TabId = useMemo(
    () => (isTabId(params.tab) ? params.tab : "trees"),
    [params.tab]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!params.propertyId) return;
      setLoading(true);
      try {
        const p = await getPropertyById(params.propertyId);
        if (cancelled) return;
        setProperty(p ?? null);

        if (p?.clientId) {
          const c = await getClientById(p.clientId);
          if (!cancelled) setClient(c ?? null);
        } else {
          setClient(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.propertyId]);

  const handleTabChange = (tabId: string) => {
    if (!params.propertyId) return;
    // Only navigate if it’s a known tab
    if (isTabId(tabId)) {
      navigate(`/properties/${params.propertyId}/${tabId}`);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500 font-medium">Loading…</div>
    );

  if (!property || !client) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Property not found.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/clients/${client.id}`}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 font-medium"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to {client.name}
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">{property.name}</h1>
        <p className="text-gray-500 flex items-center mt-1">
          <MapPin className="w-4 h-4 mr-2" />
          {property.address || "No address on file"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs items={ALL_TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "trees" && <TreesTab property={property} />}
        {activeTab === "plan" && <PlanTab property={property} />}
        {activeTab === "scout" && <ScoutTab property={property} />}
        {activeTab === "rsa-builder" && <RsaBuilderTab property={property} />}

        {/* Shells until their internals are wired to Firestore */}
        {activeTab === "recommendations" && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Recommendations</h2>
            <p className="text-gray-500">
              Loaded via the property’s child tabs.
            </p>
          </div>
        )}
        {activeTab === "work-orders" && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Work Orders</h2>
            <p className="text-gray-500">
              Loaded via the property’s child tabs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPage;