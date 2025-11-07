// pages/RsaPresentationPage.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, Package, Trees, Globe, Map as MapIcon, LocateFixed, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type {
  Property,
  PlanItem,
  RecTemplate,
  Tree,
  Plan,
  TargetSet,
} from '../services/data';
import {
  getPropertyById,
  getTreesByPropertyId,
  getPlanItemsByPropertyIds,
  getRecTemplates,
  getPlanById,
  getTargetSetsByPropertyId,
} from '../services/data';

// ---------------- Icons / helpers (unchanged look) ----------------
const createTreeIcon = (className = '') =>
  new L.DivIcon({
    html: `<div class="custom-div-icon"><img src="https://cdn-icons-png.flaticon.com/512/484/484167.png" /></div>`,
    className: `custom-div-icon-wrapper ${className}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

const defaultIcon = createTreeIcon();
const dimmedIcon = createTreeIcon('rsa-pres-dimmed');
const programIcon = createTreeIcon('rsa-pres-program-glow');
const serviceIcon = createTreeIcon('rsa-pres-service-glow');
const focusedIcon = createTreeIcon('rsa-pres-tree-focus');

const getCommonName = (species: string = '') =>
  species.match(/\(([^)]+)\)/)?.[1] || species;

// ---------------- Small map button ----------------
const MyLocationButton: React.FC = () => {
  const map = useMap();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.flyTo([coords.latitude, coords.longitude], 18);
        setIsLoading(false);
      },
      () => {
        alert('Could not get your location.');
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-200"
      title="Go to my location"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
      ) : (
        <LocateFixed className="w-5 h-5 text-gray-700" />
      )}
    </button>
  );
};

// ---------------- Types for presentation model ----------------
type ProgramService = {
  template: RecTemplate;
  targetSet: TargetSet;
  visits: number;
  annualCost: number;
  perVisitPrice: number;
};

type DisplayProgram = {
  key: string;
  year: number;
  category: string;
  recTemplateIds: string[];
  services: ProgramService[];
  totalBudget: number;
  isOverridden: boolean;
};

// ---------------- Popup content ----------------
const TreePopupContent: React.FC<{
  tree: Tree;
  planId: string;
  year: number;
  planItems: PlanItem[];
  recTemplates: RecTemplate[];
  targetSets: TargetSet[];
}> = ({ tree, planId, year, planItems, recTemplates, targetSets }) => {
  const associatedServices = useMemo(() => {
    const services = new Set<string>();
    planItems.forEach((item) => {
      if (item.planId === planId && item.schedule?.year === year) {
        const ts = targetSets.find((t) => t.id === item.targetSetId);
        if (ts?.treeIds.includes(tree.id)) {
          const template = recTemplates.find((t) => t.id === item.recTemplateId);
          if (template?.name) services.add(template.name);
        }
      }
    });
    return Array.from(services);
  }, [tree.id, planId, year, planItems, recTemplates, targetSets]);

  return (
    <div className="w-64">
      <h4 className="font-bold text-base mb-2 flex items-baseline">
        <span className="text-sm font-mono text-gray-500 mr-2">(#{tree.id.slice(-4)})</span>
        {typeof tree.dbh === 'number' && <span className="mr-1">{tree.dbh}"</span>}
        <span>{getCommonName(tree.species)}</span>
      </h4>

      {Array.isArray((tree as any).images) && (tree as any).images.length > 0 ? (
        <div
          className="flex space-x-2 overflow-x-auto pb-2 mb-2 scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {(tree as any).images.map(
            (img: { url: string; caption?: string }, idx: number) => (
              <img
                key={idx}
                src={img.url}
                alt={img.caption || `Tree ${tree.id}`}
                className="w-40 h-32 object-cover rounded-md flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              />
            )
          )}
        </div>
      ) : null}

      <p className="text-sm">
        <span className="font-semibold">Condition:</span> {tree.condition}
      </p>

      {associatedServices.length > 0 && (
        <div className="mt-3 pt-2 border-t">
          <h5 className="font-semibold text-sm mb-1">Active {year} Services:</h5>
          <ul className="list-disc list-inside space-y-1 text-xs">
            {associatedServices.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ---------------- Map contents ----------------
const MapContents: React.FC<{
  trees: Tree[];
  selectedProgram: DisplayProgram | PlanItem | null;
  selectedService: ProgramService | PlanItem | null;
  selectedTreeId: string | null;
  planId: string;
  year: number;
  planItems: PlanItem[];
  recTemplates: RecTemplate[];
  targetSets: TargetSet[];
  markerRefs: React.MutableRefObject<Map<string, any>>;
}> = ({
  trees,
  selectedProgram,
  selectedService,
  selectedTreeId,
  planId,
  year,
  planItems,
  recTemplates,
  targetSets,
  markerRefs,
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedTreeId) {
      const tree = trees.find((t) => t.id === selectedTreeId);
      if (tree?.location) map.flyTo(tree.location as any, 19, { duration: 1.2 });
      return;
    }
    if (selectedService) {
      let ids: string[] = [];
      if ('targetSet' in selectedService) {
        ids = selectedService.targetSet.treeIds;
      } else {
        const ts = targetSets.find((ts) => ts.id === selectedService.targetSetId);
        ids = ts?.treeIds || [];
      }
      const locs = trees
        .filter((t) => ids.includes(t.id) && t.location)
        .map((t) => t.location!);
      if (locs.length)
        map.flyToBounds(L.latLngBounds(locs as any), {
          padding: [70, 70],
          duration: 1,
        });
      return;
    }
    if (selectedProgram) {
      const idSet = new Set<string>();
      if ('services' in selectedProgram) {
        selectedProgram.services.forEach((s) =>
          s.targetSet.treeIds.forEach((id) => idSet.add(id))
        );
      } else {
        planItems
          .filter((pi) => selectedProgram.containedItemIds?.includes(pi.id))
          .forEach((pi) =>
            targetSets
              .find((ts) => ts.id === pi.targetSetId)
              ?.treeIds.forEach((id) => idSet.add(id))
          );
      }
      const locs = trees
        .filter((t) => idSet.has(t.id) && t.location)
        .map((t) => t.location!);
      if (locs.length)
        map.flyToBounds(L.latLngBounds(locs as any), {
          padding: [50, 50],
          duration: 1,
        });
    }
  }, [selectedTreeId, selectedService, selectedProgram, trees, map, targetSets, planItems]);

  useEffect(() => {
    if (selectedTreeId) {
      const marker = markerRefs.current.get(selectedTreeId);
      if (marker) marker.openPopup();
    } else {
      map.closePopup();
    }
  }, [selectedTreeId, map, markerRefs]);

  const getTreeIcon = (tree: Tree) => {
    const isSelectedTree = tree.id === selectedTreeId;

    let isServiceTree = false;
    if (selectedService) {
      if ('targetSet' in selectedService) {
        isServiceTree = selectedService.targetSet.treeIds.includes(tree.id);
      } else {
        const ts = targetSets.find((ts) => ts.id === selectedService.targetSetId);
        isServiceTree = !!ts?.treeIds.includes(tree.id);
      }
    }

    let isProgramTree = false;
    if (selectedProgram) {
      if ('services' in selectedProgram) {
        isProgramTree = selectedProgram.services.some((s) =>
          s.targetSet.treeIds.includes(tree.id)
        );
      } else {
        const programTreeIds = new Set<string>();
        planItems
          .filter((pi) => selectedProgram.containedItemIds?.includes(pi.id))
          .forEach((pi) =>
            targetSets
              .find((ts) => ts.id === pi.targetSetId)
              ?.treeIds.forEach((id) => programTreeIds.add(id))
          );
        isProgramTree = programTreeIds.has(tree.id);
      }
    }

    if (selectedProgram || selectedService) {
      if (isSelectedTree) return focusedIcon;
      if (isServiceTree) return serviceIcon;
      if (isProgramTree) return programIcon;
      return dimmedIcon;
    }
    return defaultIcon;
  };

  return (
    <>
      {trees.map((tree) =>
        tree.location ? (
          <Marker
            key={tree.id}
            position={tree.location as any}
            icon={getTreeIcon(tree)}
            ref={(el) => markerRefs.current.set(tree.id, el)}
          >
            <Popup>
              <TreePopupContent
                tree={tree}
                planId={planId}
                year={year}
                planItems={planItems}
                recTemplates={recTemplates}
                targetSets={targetSets}
              />
            </Popup>
          </Marker>
        ) : null
      )}
    </>
  );
};

// ---------------- Cards (unchanged styling) ----------------
const RsaProgramCard: React.FC<{
  program: DisplayProgram;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ program, isSelected, onSelect }) => {
  const totalTrees = useMemo(
    () => new Set(program.services.flatMap((s) => s.targetSet.treeIds)).size,
    [program]
  );
  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-green-500 ring-2 ring-green-500/30'
          : 'border-transparent hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-xl text-gray-800">
              {program.category} Program
            </p>
            <p className="text-sm text-gray-500">{program.year}</p>
          </div>
          <ChevronDown
            className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${
              isSelected ? 'rotate-180' : ''
            }`}
          />
        </div>
        <div className="mt-4 flex justify-between items-end">
          <div>
            <p className="text-sm font-medium text-gray-500 flex items-center">
              <Package className="w-4 h-4 mr-2" /> {program.services.length} Services
            </p>
            <p className="text-sm font-medium text-gray-500 flex items-center mt-1">
              <Trees className="w-4 h-4 mr-2" /> {totalTrees} Trees
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">Total Budget</p>
            <p className="text-2xl font-bold text-green-700">
              ${program.totalBudget.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const BudgetProgramCard: React.FC<{
  program: PlanItem;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ program, isSelected, onSelect }) => (
  <div
    className={`bg-white rounded-xl shadow-md border-2 transition-all duration-300 cursor-pointer ${
      isSelected
        ? 'border-blue-500 ring-2 ring-blue-500/30'
        : 'border-transparent hover:border-gray-300'
    }`}
    onClick={onSelect}
  >
    <div className="p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-xl text-gray-800">Budget Program</p>
          <p className="text-sm text-gray-500">{program.schedule?.year}</p>
        </div>
        <ChevronDown
          className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${
            isSelected ? 'rotate-180' : ''
          }`}
        />
      </div>
      <div className="mt-4 flex justify-between items-end">
        <div>
          <p className="text-sm font-medium text-gray-500 flex items-center">
            <Package className="w-4 h-4 mr-2" /> {program.containedItemIds?.length || 0} Services
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-blue-700">
            ${(program.totalBudget || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ---------------- Main Page ----------------
const RsaPresentationPage: React.FC = () => {
  const { propertyId, planId } = useParams<{ propertyId: string; planId: string }>();

  const [property, setProperty] = useState<Property | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [recTemplates, setRecTemplates] = useState<RecTemplate[]>([]);
  const [targetSets, setTargetSets] = useState<TargetSet[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedProgramKey, setSelectedProgramKey] = useState<string | null>(null);
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'street' | 'satellite'>('street');

  const markerRefs = useRef(new Map<string, any>());

  useEffect(() => {
    (async () => {
      if (!propertyId || !planId) return;
      setLoading(true);
      try {
        const [p, pl, ts, pis, rts, t] = await Promise.all([
          getPropertyById(propertyId),
          getPlanById(planId),
          getTargetSetsByPropertyId(propertyId),
          getPlanItemsByPropertyIds([propertyId]),
          getRecTemplates(),
          getTreesByPropertyId(propertyId),
        ]);
        setProperty(p);
        setPlan(pl);
        setTargetSets(ts);
        setPlanItems(pis.filter((pi) => pi.planId === planId));
        setRecTemplates(rts);
        setTrees(t);
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId, planId]);

  // Build RSA/Budget “programs” off planItems
  const { rsaProgramsByYear, budgetProgramsByYear } = useMemo(() => {
    if (!plan) return { rsaProgramsByYear: {} as Record<number, DisplayProgram[]>, budgetProgramsByYear: {} as Record<number, PlanItem[]> };

    // RSA: schedule.type === 'rsa' OR visitsPerYear > 1 (and NOT unitBasis 'budget')
    const programsByKey = new Map<string, Omit<DisplayProgram, 'totalBudget' | 'isOverridden'>>();
    const scheduledRsaItems = planItems.filter((item) => {
      const template = recTemplates.find((t) => t.id === item.recTemplateId);
      const visits = template?.visitsPerYear ?? 0;
      const isBudgetUnit = template?.unitBasis === 'budget';
      const isRsa = item.schedule?.type === 'rsa' || (visits > 1 && !isBudgetUnit);
      return item.planId === plan.id && isRsa && item.status !== 'draft';
    });

    scheduledRsaItems.forEach((item) => {
      const template = recTemplates.find((t) => t.id === item.recTemplateId);
      if (!template || template.unitBasis === 'budget') return;
      const year = item.schedule?.year!;
      const key = `${year}-${String(template.category || 'Program')}`;
      if (!programsByKey.has(key)) {
        programsByKey.set(key, {
          key,
          year,
          category: String(template.category || 'Program'),
          recTemplateIds: [],
          services: [],
        });
      }
    });

    const finalRsaPrograms: DisplayProgram[] = Array.from(programsByKey.values()).map((base) => {
      const relevant = scheduledRsaItems.filter((item) => {
        const tmpl = recTemplates.find((t) => t.id === item.recTemplateId);
        return item.schedule?.year === base.year && String(tmpl?.category || 'Program') === base.category;
      });

      const serviceMap = new Map<string, ProgramService>();
      relevant.forEach((item) => {
        const template = recTemplates.find((t) => t.id === item.recTemplateId);
        const ts = targetSets.find((s) => s.id === item.targetSetId);
        if (!template || !ts) return;

        const serviceKey = `${template.id}-${ts.id}`;
        if (!serviceMap.has(serviceKey)) {
          const visits = template.visitsPerYear || 1;
          const annualCost = item.budget?.annualEstimate ?? 0;
          serviceMap.set(serviceKey, {
            template,
            targetSet: ts,
            visits,
            annualCost,
            perVisitPrice: annualCost / visits,
          });
        }
      });

      const services = Array.from(serviceMap.values()).sort((a, b) =>
        (a.template.name || '').localeCompare(b.template.name || '')
      );
      const recTemplateIds = services.map((s) => s.template.id);
      const isOverridden = !!plan.budgetOverrides?.[base.key];
      const totalBudget = isOverridden
        ? plan.budgetOverrides![base.key]
        : services.reduce((sum, s) => sum + s.annualCost, 0);

      return { ...base, services, recTemplateIds, totalBudget, isOverridden };
    });

    const groupedRsaByYear: Record<number, DisplayProgram[]> = {};
    finalRsaPrograms.forEach((p) => {
      (groupedRsaByYear[p.year] ||= []).push(p);
      groupedRsaByYear[p.year].sort((a, b) => a.category.localeCompare(b.category));
    });

    // Budget Programs
    const budgetPrograms = planItems.filter((item) => item.planId === plan.id && item.isBudgetProgram);
    const groupedBudgetsByYear: Record<number, PlanItem[]> = {};
    budgetPrograms.forEach((p) => {
      const y = p.schedule?.year!;
      (groupedBudgetsByYear[y] ||= []).push(p);
    });

    return { rsaProgramsByYear: groupedRsaByYear, budgetProgramsByYear: groupedBudgetsByYear };
  }, [plan, planItems, recTemplates, targetSets]);

  const availableYears = useMemo(() => {
    const s = new Set<number>([
      ...Object.keys(rsaProgramsByYear).map(Number),
      ...Object.keys(budgetProgramsByYear).map(Number),
    ]);
    return Array.from(s).sort((a, b) => a - b);
  }, [rsaProgramsByYear, budgetProgramsByYear]);

  useEffect(() => {
    if (availableYears.length && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    setSelectedProgramKey(null);
    setSelectedServiceKey(null);
    setSelectedTreeId(null);
  }, [selectedYear]);

  const displayedRsaPrograms = rsaProgramsByYear[selectedYear] || [];
  const displayedBudgetPrograms = budgetProgramsByYear[selectedYear] || [];

  const selectedProgram =
    [...displayedRsaPrograms, ...displayedBudgetPrograms].find((p) =>
      'key' in p ? p.key === selectedProgramKey : (p as PlanItem).id === selectedProgramKey
    ) || null;

  let selectedService: ProgramService | PlanItem | null = null;
  if (selectedProgram && 'services' in selectedProgram) {
    selectedService =
      selectedProgram.services.find(
        (s) => `${s.template.id}-${s.targetSet.id}` === selectedServiceKey
      ) || null;
  } else if (selectedProgram && 'containedItemIds' in selectedProgram) {
    selectedService = planItems.find((pi) => pi.id === selectedServiceKey) || null;
  }

  const propertyTrees = useMemo(
    () => trees.filter((t) => t.propertyId === propertyId),
    [trees, propertyId]
  );

  const serviceTrees = useMemo(() => {
    if (!selectedService) return [] as Tree[];
    let ids: string[] = [];
    if ('targetSet' in selectedService) {
      ids = selectedService.targetSet.treeIds;
    } else {
      const ts = targetSets.find((t) => t.id === selectedService.targetSetId);
      ids = ts?.treeIds || [];
    }
    return propertyTrees.filter((t) => ids.includes(t.id));
  }, [selectedService, propertyTrees, targetSets]);

  const budgetContainedItems = useMemo(() => {
    if (!selectedProgram || !('containedItemIds' in selectedProgram)) return [];
    return planItems.filter((pi) => selectedProgram.containedItemIds?.includes(pi.id));
  }, [selectedProgram, planItems]);

  const handleProgramSelect = (key: string) => {
    setSelectedProgramKey((prev) => (prev === key ? null : key));
    setSelectedServiceKey(null);
    setSelectedTreeId(null);
  };

  const handleServiceSelect = (key: string) => {
    setSelectedServiceKey((prev) => (prev === key ? null : key));
    setSelectedTreeId(null);
  };

  if (loading || !property || !plan) {
    return <div className="p-8 text-center">Loading presentation...</div>;
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-4 md:p-6 bg-gray-50">
      <header className="mb-4 flex-shrink-0">
        <Link
          to={`/properties/${propertyId}/rsa-builder`}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2 font-medium"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Builder
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-lg text-gray-500 font-medium">{plan.name}</p>
          </div>
          <div className="flex items-center space-x-2 bg-gray-200 p-1 rounded-lg">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${
                  selectedYear === year
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-300'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel */}
        <div className="w-full md:w-1/3 h-full flex flex-col space-y-4 overflow-y-auto pr-2">
          {displayedRsaPrograms.map((program) => (
            <div key={program.key}>
              <RsaProgramCard
                program={program}
                isSelected={selectedProgramKey === program.key}
                onSelect={() => handleProgramSelect(program.key)}
              />
              <AnimatePresence>
                {selectedProgramKey === program.key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pr-2 pt-3 space-y-2">
                      {program.services.map((s) => {
                        const key = `${s.template.id}-${s.targetSet.id}`;
                        const isSel = selectedServiceKey === key;
                        return (
                          <div key={key}>
                            <div
                              onClick={() => handleServiceSelect(key)}
                              className={`p-3 rounded-lg border cursor-pointer ${
                                isSel
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-semibold">{s.template.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {s.targetSet.treeIds.length} trees
                                  </p>
                                </div>
                                <p className="font-semibold text-gray-700">
                                  ${s.annualCost.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {isSel && serviceTrees.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pt-2 pl-4 max-h-48 overflow-y-auto"
                              >
                                <ul className="space-y-1">
                                  {serviceTrees.map((tree) => (
                                    <li
                                      key={tree.id}
                                      onClick={() =>
                                        setSelectedTreeId((prev) =>
                                          prev === tree.id ? null : tree.id
                                        )
                                      }
                                      className={`text-sm p-1.5 rounded-md cursor-pointer flex justify-between ${
                                        selectedTreeId === tree.id
                                          ? 'bg-green-100 font-bold text-green-800'
                                          : 'hover:bg-gray-100'
                                      }`}
                                    >
                                      <span className="truncate flex items-baseline">
                                        <span className="text-xs font-mono text-gray-500 mr-2">
                                          (#{tree.id.slice(-4)})
                                        </span>
                                        {typeof tree.dbh === 'number' && (
                                          <span className="mr-1">{tree.dbh}"</span>
                                        )}
                                        <span className="truncate">
                                          {getCommonName(tree.species)}
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {displayedBudgetPrograms.map((program) => (
            <div key={program.id}>
              <BudgetProgramCard
                program={program}
                isSelected={selectedProgramKey === program.id}
                onSelect={() => handleProgramSelect(program.id)}
              />
              <AnimatePresence>
                {selectedProgramKey === program.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pr-2 pt-3 space-y-2">
                      {budgetContainedItems.map((item) => {
                        const isSel = selectedServiceKey === item.id;
                        const template = recTemplates.find(
                          (t) => t.id === item.recTemplateId
                        );
                        const ts = targetSets.find((s) => s.id === item.targetSetId);

                        return (
                          <div key={item.id}>
                            <div
                              onClick={() => handleServiceSelect(item.id)}
                              className={`p-3 rounded-lg border cursor-pointer ${
                                isSel
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-semibold">{template?.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {ts?.treeIds.length || 0} trees
                                  </p>
                                </div>
                                <p className="font-semibold text-gray-700">
                                  ${(item.budget?.annualEstimate ?? 0).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {isSel && serviceTrees.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pt-2 pl-4 max-h-48 overflow-y-auto"
                              >
                                <ul className="space-y-1">
                                  {serviceTrees.map((tree) => (
                                    <li
                                      key={tree.id}
                                      onClick={() =>
                                        setSelectedTreeId((prev) =>
                                          prev === tree.id ? null : tree.id
                                        )
                                      }
                                      className={`text-sm p-1.5 rounded-md cursor-pointer flex justify-between ${
                                        selectedTreeId === tree.id
                                          ? 'bg-green-100 font-bold text-green-800'
                                          : 'hover:bg-gray-100'
                                      }`}
                                    >
                                      <span className="truncate flex items-baseline">
                                        <span className="text-xs font-mono text-gray-500 mr-2">
                                          (#{tree.id.slice(-4)})
                                        </span>
                                        {typeof tree.dbh === 'number' && (
                                          <span className="mr-1">{tree.dbh}"</span>
                                        )}
                                        <span className="truncate">
                                          {getCommonName(tree.species)}
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Right Panel (Map) */}
        <div className="w-full md:w-2/3 h-full rounded-xl overflow-hidden shadow-lg border relative">
          <MapContainer
            center={property.location as any}
            zoom={16}
            maxZoom={22}
            scrollWheelZoom
            className="h-full w-full"
          >
            {mapView === 'street' && (
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution="&copy; CARTO"
                maxZoom={22}
              />
            )}
            {mapView === 'satellite' && (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="&copy; Esri"
                maxZoom={22}
              />
            )}

            <MapContents
              trees={propertyTrees}
              selectedProgram={selectedProgram}
              selectedService={selectedService}
              selectedTreeId={selectedTreeId}
              planId={plan.id}
              year={selectedYear}
              planItems={planItems}
              recTemplates={recTemplates}
              targetSets={targetSets}
              markerRefs={markerRefs}
            />

            <div className="absolute top-4 left-4 z-[1000] flex flex-col space-y-2">
              <div className="bg-white rounded-full shadow-lg flex flex-col items-center">
                <button
                  onClick={() => setMapView('street')}
                  className={`p-2.5 rounded-t-full w-10 h-10 flex items-center justify-center transition-colors ${
                    mapView === 'street'
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Street View"
                >
                  <MapIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setMapView('satellite')}
                  className={`p-2.5 rounded-b-full w-10 h-10 flex items-center justify-center transition-colors ${
                    mapView === 'satellite'
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Satellite View"
                >
                  <Globe className="w-5 h-5" />
                </button>
              </div>
              <MyLocationButton />
            </div>
          </MapContainer>
        </div>
      </main>
    </div>
  );
};

export default RsaPresentationPage;