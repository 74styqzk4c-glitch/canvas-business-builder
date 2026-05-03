
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Save,
  Copy,
  Wand2,
  RefreshCcw,
  Download,
  GitBranch,
  Trash2,
  Sparkles,
  ShieldCheck,
  HeartPulse,
  Network,
  TrendingUp,
  KanbanSquare,
  FileText,
  Settings2,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const STORAGE_KEY = "canvas-business-builder:v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("No se pudo leer localStorage", e);
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar en localStorage", e);
  }
}

function resetLocalStorage() {
  if (!window.confirm("Esto borrará todos los proyectos guardados en este navegador. ¿Continuar?")) {
    return;
  }
  localStorage.removeItem("canvas-business-builder:v1");
  window.location.reload();
}

function exportProjectsToJSON(projects, activeId) {
  const data = {
    exportedAt: new Date().toISOString(),
    version: "v1",
    projects,
    activeId,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `canvas-projects-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function importProjectsFromJSON(file, setProjects, setActiveId) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error("Formato inválido");
      }

      setProjects(data.projects);
      setActiveId(data.activeId ?? data.projects[0]?.id ?? null);
    } catch (err) {
      alert("El archivo no es válido o está corrupto.");
    }
  };

  reader.readAsText(file);
}
``

function exportSingleProjectToJSON(project) {
  const data = {
    exportedAt: new Date().toISOString(),
    version: "v1",
    type: "single-project",
    project,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `canvas-${project.name
    .toLowerCase()
    .replace(/\\s+/g, "-")}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function importSingleProjectFromJSON(
  file,
  projects,
  setProjects,
  setActiveId
) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (data.type !== "single-project" || !data.project) {
        throw new Error("Formato inválido");
      }

      const imported = {
        ...data.project,
        id: crypto.randomUUID(), // evita colisiones
        name: `${data.project.name} (importado)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setProjects([...projects, imported]);
      setActiveId(imported.id);
    } catch (err) {
      alert("El archivo no es un proyecto válido.");
    }
  };

  reader.readAsText(file);
}

/**
 * V2 PROTOTIPO
 * - Wizard de creación de proyecto: Título + texto largo + "Generar Canvas v1" o "vacío".
 * - Generación heurística (placeholder IA) + registro de criterios/rationale.
 * - Canvas + conexiones + panel de salud (Completitud/Coherencia/Riesgo) + score agregado configurable.
 * - Finanzas: 3 modelos (SaaS/Servicios/Industrial) con 3 estados simplificados + escenarios (Base/Upside/Downside).
 * - Actuals: carga de resultados reales y comparación vs forecast.
 * - Ejecución: mini Kanban de iniciativas.
 * - Outputs: deck/pitch/comercial/marketing + export TXT/JSON.
 */

const BLOCKS = [
  { key: "key_partners", name: "Socios clave" },
  { key: "key_activities", name: "Actividades clave" },
  { key: "value_propositions", name: "Propuesta de valor" },
  { key: "customer_relationships", name: "Relación con clientes" },
  { key: "customer_segments", name: "Segmentos de clientes" },
  { key: "channels", name: "Canales" },
  { key: "key_resources", name: "Recursos clave" },
  { key: "cost_structure", name: "Estructura de costos" },
  { key: "revenue_streams", name: "Fuentes de ingresos" },
];

const BUSINESS_TYPES = [
  { value: "saas", label: "SaaS / Suscripción" },
  { value: "services", label: "Servicios profesionales" },
  { value: "industrial_b2b", label: "B2B Industrial" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "marketplace", label: "Marketplace" },
  { value: "consumer_app", label: "App B2C" },
  { value: "other", label: "Otro" },
];

const GRID_ORDER = [
  "key_partners",
  "key_activities",
  "key_resources",
  "value_propositions",
  "customer_relationships",
  "channels",
  "customer_segments",
  "cost_structure",
  "revenue_streams",
];

const HEALTH_DIMENSIONS = [
  { key: "completitud", label: "Completitud", icon: HeartPulse, color: "text-emerald-700" },
  { key: "coherencia", label: "Coherencia", icon: Network, color: "text-blue-700" },
  { key: "riesgo", label: "Riesgo", icon: ShieldCheck, color: "text-amber-700" },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function toMonthLabel(i) {
  return `M${i}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, obj) {
  downloadText(filename, JSON.stringify(obj, null, 2));
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text);
}

function defaultWeights(type) {
  // Pesos sugeridos (editable) para score agregado 0–100
  const base = { completitud: 0.4, coherencia: 0.35, riesgo: 0.25 };
  if (type === "saas") return { completitud: 0.35, coherencia: 0.4, riesgo: 0.25 };
  if (type === "industrial_b2b") return { completitud: 0.4, coherencia: 0.3, riesgo: 0.3 };
  if (type === "services") return { completitud: 0.38, coherencia: 0.34, riesgo: 0.28 };
  return base;
}

function defaultAssumptions(type) {
  if (type === "services") {
    return {
      months: 12,
      currency: "USD",
      model: "services",
      hourlyRate: 120,
      billableHoursPerMonth: 240,
      utilization: 0.65,
      deliveryCostPct: 0.18,
      opexFixed: 9000,
      cash0: 15000,
      capex: 0,
    };
  }
  if (type === "industrial_b2b") {
    return {
      months: 12,
      currency: "USD",
      model: "industrial",
      volumePerMonth: 500,
      pricePerUnit: 220,
      variableCostPerUnit: 150,
      opexFixed: 25000,
      cash0: 50000,
      capex: 20000,
    };
  }
  // Default SaaS
  return {
    months: 12,
    currency: "USD",
    model: "subscription",
    price: 49,
    customers0: 20,
    mGrowth: 0.12,
    churn: 0.03,
    cogsPct: 0.18,
    opexFixed: 12000,
    capex: 0,
    cash0: 20000,
  };
}

function defaultProject(name = "Nuevo proyecto", businessType = "saas") {
  const canvas = Object.fromEntries(BLOCKS.map((b) => [b.key, []]));
  return {
    id: uid("proj"),
    name,
    businessType,
    description: "",
    longBrief: "", // texto libre largo de negocio
    canvas,
    connections: [],
    aiRationale: null, // registro de criterios/supuestos/reglas
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scoreWeights: defaultWeights(businessType),
    assumptions: defaultAssumptions(businessType),
    scenarios: {
      base: { name: "Base", delta: 0 },
      upside: { name: "Upside", delta: 0.15 },
      downside: { name: "Downside", delta: -0.15 },
    },
    actuals: [], // resultados reales por mes
    initiatives: {
      backlog: [
        { id: uid("tsk"), title: "Definir ICP (segmento) y dolor principal", owner: "", due: "" },
        { id: uid("tsk"), title: "Diseñar pricing y paquete inicial", owner: "", due: "" },
      ],
      doing: [{ id: uid("tsk"), title: "Borrador Canvas v1", owner: "", due: "" }],
      done: [],
    },
  };
}

/**
 * GENERADOR HEURÍSTICO (placeholder IA)
 * Toma el longBrief y tipo de negocio y propone items + conexiones.
 * Además guarda un rationale de reglas activadas.
 */
function generateCanvasV1(longBrief, businessType) {
  const text = (longBrief || "").toLowerCase();
  const rules = [];
  const addRule = (r) => rules.push({ id: uid("rule"), rule: r });

  const add = (arr, s) => {
    if (!s) return;
    const t = s.trim();
    if (!t) return;
    arr.push({ id: uid("item"), text: t, createdAt: new Date().toISOString(), source: "AI_v1" });
  };

  const canvas = Object.fromEntries(BLOCKS.map((b) => [b.key, []]));

  // Señales rápidas
  const hasSubscription = /suscrip|subscription|mensual|anual|arr|mrr/.test(text);
  const hasMarketplace = /marketplace|comisi|take rate|dos lados|oferta y demanda/.test(text);
  const hasB2B = /b2b|empresas|corporativo|gerencia|director|industr/i.test(text);
  const hasB2C = /b2c|usuarios|personas|familias|pacientes|consumidor/i.test(text);
  const hasRegulated = /regul|cumplim|norma|isapre|fonasa|art|seguro|auditor/i.test(text);
  const hasCapital = /inversion|vc|angel|ronda|equity|capit/.test(text);
  const hasAI = /ia|ai|copilot|llm|modelo|automat/.test(text);
  const hasOps = /logistic|plazo|otif|inventar|planta|capex|maipu|producci/.test(text);

  // Defaults por tipo
  if (businessType === "saas" || hasSubscription) {
    addRule("Detectado modelo de suscripción / SaaS");
    add(canvas.revenue_streams, "Suscripción mensual por usuario / empresa (planes escalonados)");
    add(canvas.customer_relationships, "Onboarding guiado + soporte self-serve + Customer Success (según plan)");
    add(canvas.key_activities, "Desarrollo continuo del producto + adquisición (growth) + soporte y retención");
    add(canvas.key_resources, "Plataforma SaaS + data/analytics + equipo producto/ingeniería");
    add(canvas.cost_structure, "Nube/hosting + equipo producto/ventas + soporte + marketing performance");
  }

  if (businessType === "marketplace" || hasMarketplace) {
    addRule("Detectado marketplace / comisiones");
    add(canvas.revenue_streams, "Comisión por transacción (take rate) + planes premium para oferentes");
    add(canvas.key_activities, "Construir liquidez (oferta/demanda) + trust & safety + pagos/operación");
    add(canvas.key_partners, "Pasarela de pagos + proveedores verificados + aliados de adquisición");
    add(canvas.cost_structure, "Adquisición de usuarios + verificación + costos de pagos + soporte");
  }

  if (businessType === "industrial_b2b" || hasOps) {
    addRule("Señales de operación industrial/logística");
    add(canvas.value_propositions, "Confiabilidad en plazos y calidad + cumplimiento normativo + soporte técnico");
    add(canvas.key_resources, "Capacidad instalada / logística + inventario crítico + certificaciones");
    add(canvas.key_partners, "Proveedores críticos + logística externa + certificadoras");
    add(canvas.cost_structure, "Costos variables por unidad + CAPEX + mantenimiento + logística");
  }

  // Segmentos / canales básicos
  if (hasB2B) {
    addRule("Señales B2B");
    add(canvas.customer_segments, "Empresas / unidades de negocio con un dolor operacional o de gestión claro");
    add(canvas.channels, "Outbound (LinkedIn/email) + partners + ventas consultivas / demos");
  }
  if (hasB2C) {
    addRule("Señales B2C");
    add(canvas.customer_segments, "Usuarios finales / familias / consumidores con necesidad recurrente");
    add(canvas.channels, "SEO/Content + comunidades + referidos + app stores");
  }

  if (hasRegulated) {
    addRule("Señales de industria regulada / compliance");
    add(canvas.key_activities, "Gestión de compliance y seguridad de datos + auditoría interna");
    add(canvas.key_partners, "Asesoría legal / compliance + proveedores certificados");
  }

  // Propuesta de valor si no existe
  if (canvas.value_propositions.length === 0) {
    addRule("Propuesta de valor genérica añadida (no detectada explícitamente)");
    add(canvas.value_propositions, "Reducir fricción y aumentar resultados mediante un flujo guiado y medible");
  }

  // Partners si no existe
  if (canvas.key_partners.length === 0) {
    add(canvas.key_partners, "Socios de distribución / integraciones relevantes");
  }

  // Añadir elemento de IA si corresponde
  if (hasAI) {
    addRule("Señales de IA/automatización");
    add(canvas.key_resources, "Motor IA para sugerencias, coherencia y generación de deliverables");
    add(canvas.key_activities, "Entrenamiento/afinamiento de prompts + evaluación de consistencia + trazabilidad");
  }

  if (hasCapital) {
    addRule("Señales de levantamiento de capital");
    add(canvas.value_propositions, "Evidencia y narrativa inversionista-ready (riesgos, KPIs, uso de fondos)");
  }

  // Conexiones base para coherencia
  const edges = [];
  const link = (from, to, reason, conf = 0.82) => {
    edges.push({
      id: uid("edge"),
      from,
      to,
      reason,
      confidence: conf,
      createdAt: new Date().toISOString(),
      source: "AI_v1",
    });
  };

  link("value_propositions", "customer_segments", "PV debe mapearse a segmentos específicos (persona/dolor/JTBD).", 0.86);
  link("value_propositions", "channels", "La PV requiere canales para adquisición/entrega/soporte.", 0.83);
  link("customer_segments", "customer_relationships", "Cada segmento requiere un tipo de relación/servicio.", 0.82);
  link("revenue_streams", "cost_structure", "Ingresos deben ser consistentes con costos y márgenes.", 0.84);
  link("revenue_streams", "key_activities", "Cada ingreso requiere actividades para vender/entregar/cobrar.", 0.81);
  link("key_activities", "key_resources", "Actividades necesitan recursos/capacidades habilitantes.", 0.82);
  link("key_partners", "key_resources", "Partners pueden reducir necesidad de recursos propios.", 0.78);

  // Rationale/criterios guardados
  const rationale = {
    generatedAt: new Date().toISOString(),
    mode: "AI_generate_v1",
    detectedSignals: {
      hasSubscription,
      hasMarketplace,
      hasB2B,
      hasB2C,
      hasRegulated,
      hasCapital,
      hasAI,
      hasOps,
    },
    rulesActivated: rules,
    connectionPrinciples: [
      "No dejar bloques huérfanos: PV ↔ Segmentos ↔ Canales ↔ Relación",
      "Balance financiero: Ingresos ↔ Costos ↔ Actividades/Recursos",
      "Trazabilidad: guardar reglas y conexiones para explicar el porqué",
    ],
    warnings: [],
  };

  // Warnings si hay poca claridad
  if ((longBrief || "").trim().length < 140) {
    rationale.warnings.push({ id: uid("warn"), text: "El texto inicial es corto; la IA podría generar un Canvas demasiado genérico." });
  }
  if (!hasB2B && !hasB2C) {
    rationale.warnings.push({ id: uid("warn"), text: "No se detectó claramente si es B2B o B2C; se agregaron supuestos genéricos." });
  }

  return { canvas, edges, rationale };
}

function kpiLibrary(type) {
  const common = [
    { group: "Crecimiento", items: ["Tasa de crecimiento (MoM/YoY)", "Pipeline / embudo", "Conversión por etapa"] },
    { group: "Finanzas", items: ["Margen bruto", "EBITDA", "Burn rate", "Runway", "Cash conversion cycle"] },
    { group: "Cliente", items: ["NPS / CSAT", "Retención", "Reclamos / tiempos de respuesta"] },
    { group: "Operación", items: ["OTIF (On-time-in-full)", "Productividad", "Costo unitario", "Calidad / defectos"] },
  ];

  const byType = {
    saas: [
      { group: "SaaS Unit Economics", items: ["MRR", "ARR", "Churn (logo y revenue)", "NRR", "CAC", "LTV", "LTV:CAC", "CAC payback"] },
      { group: "Producto", items: ["Activación", "DAU/WAU/MAU", "Feature adoption", "Time-to-value"] },
    ],
    services: [{ group: "Servicios", items: ["Utilización", "Rate efectivo", "Margen por proyecto", "Backlog", "DSO"] }],
    industrial_b2b: [{ group: "B2B Industrial", items: ["Mix (commodity vs valor agregado)", "Costo por unidad", "Merma", "Cumplimiento plazos", "Rotación inventario"] }],
    ecommerce: [{ group: "E-commerce", items: ["AOV", "Conversion rate", "ROAS", "CAC", "Repeat rate", "Cart abandonment"] }],
    marketplace: [{ group: "Marketplace", items: ["Liquidez (oferta/demanda)", "Take rate", "GMV", "Match rate", "Tiempo a match", "Churn por lado"] }],
    consumer_app: [{ group: "App B2C", items: ["Cohort retention", "K-factor", "CPI", "ARPU", "Engagement"] }],
    other: [],
  };

  return [...(byType[type] || []), ...common];
}

function pickTexts(canvas, key) {
  return (canvas?.[key] || []).map((x) => x.text).filter(Boolean);
}

function buildOutputs(project) {
  const c = project.canvas;
  const vp = pickTexts(c, "value_propositions");
  const seg = pickTexts(c, "customer_segments");
  const ch = pickTexts(c, "channels");
  const rev = pickTexts(c, "revenue_streams");
  const act = pickTexts(c, "key_activities");
  const res = pickTexts(c, "key_resources");
  const partners = pickTexts(c, "key_partners");

  const oneLiner = `${project.name}: ${vp[0] || "(propuesta de valor)"} para ${seg[0] || "(segmento)"} vía ${ch[0] || "(canal)"}.`;

  const elevator = `ELEVATOR PITCH (30–45s)\n` +
    `Somos ${project.name}. Ayudamos a ${seg[0] || "nuestros clientes"} a ${vp[0] || "resolver un problema crítico"}. ` +
    `Lo hacemos a través de ${ch[0] || "un canal principal"} y nos diferenciamos por: ${vp.slice(1, 4).join("; ") || "(diferenciadores)"}. ` +
    `Monetizamos con ${rev[0] || "(modelo de ingresos)"}. ` +
    `Hoy priorizamos ${act[0] || "(actividad clave)"} y escalamos con ${res[0] || "(recurso clave)"}.`;

  const investorDeck = `DECK PARA INVERSIONISTAS (estructura + notas)\n\n` +
    `1) Portada + tagline\n` +
    `2) Problema (1–3 pains)\n` +
    `3) Solución / Producto\n` +
    `4) Propuesta de valor (por segmento)\n` +
    `5) Mercado (TAM/SAM/SOM)\n` +
    `6) Go-to-market (canales + funnel + loops)\n` +
    `7) Modelo de ingresos (pricing / unit economics)\n` +
    `8) Competencia y diferenciación\n` +
    `9) Tracción / evidencia / pilotos\n` +
    `10) Operación (actividades/recursos/partners)\n` +
    `11) Financials (3 estados + supuestos + escenarios)\n` +
    `12) Ask + uso de fondos + hitos\n\n` +
    `Notas del Canvas actual:\n` +
    `- Segmentos: ${seg.slice(0, 6).join(" | ") || "(pendiente)"}\n` +
    `- Propuesta de valor: ${vp.slice(0, 6).join(" | ") || "(pendiente)"}\n` +
    `- Canales: ${ch.slice(0, 6).join(" | ") || "(pendiente)"}\n` +
    `- Ingresos: ${rev.slice(0, 6).join(" | ") || "(pendiente)"}\n` +
    `- Partners: ${partners.slice(0, 6).join(" | ") || "(pendiente)"}\n`;

  const commercialDeck = `PRESENTACIÓN COMERCIAL (estructura)\n\n` +
    `1) Quiénes somos + credenciales\n` +
    `2) Dolor del cliente (ejemplos)\n` +
    `3) Propuesta de valor (beneficios medibles)\n` +
    `4) Cómo funciona (3 pasos)\n` +
    `5) Prueba social (casos / pilotos / referencias)\n` +
    `6) Oferta (planes / alcance)\n` +
    `7) Objeciones típicas y respuestas\n` +
    `8) Próximos pasos (demo / piloto)\n`;

  const marketing = `MATERIAL DE MARKETING (prompts/lista)\n\n` +
    `- Claim principal: ${vp[0] || "(claim)"}\n` +
    `- 3 bullets de beneficios:\n${vp.slice(0, 3).map((x) => `  • ${x}`).join("\n") || "  (pendiente)"}\n` +
    `- Mensaje por segmento:\n${seg.slice(0, 3).map((x, i) => `  • ${x}: (mensaje/CTA ${i + 1})`).join("\n") || "  (pendiente)"}\n` +
    `- Objeciones típicas y respuestas:\n` +
    `  1) “¿Por qué ahora?” → (tendencia/dolor)\n` +
    `  2) “¿Por qué ustedes?” → (diferenciación)\n` +
    `  3) “¿Qué riesgo tengo?” → (piloto/garantía)\n`;

  return { oneLiner, elevator, investorDeck, commercialDeck, marketing };
}

/**
 * Salud (Completitud/Coherencia/Riesgo)
 */
function computeHealth(project) {
  const c = project.canvas;
  const filled = BLOCKS.map((b) => (c[b.key] || []).length > 0);
  const completitud = Math.round((filled.filter(Boolean).length / BLOCKS.length) * 100);

  // Coherencia: reglas mínimas
  const hasVP = (c.value_propositions || []).length > 0;
  const hasSeg = (c.customer_segments || []).length > 0;
  const hasCh = (c.channels || []).length > 0;
  const hasRev = (c.revenue_streams || []).length > 0;
  const hasCost = (c.cost_structure || []).length > 0;
  const hasAct = (c.key_activities || []).length > 0;
  const hasRes = (c.key_resources || []).length > 0;

  let coh = 0;
  let total = 6;
  if (hasVP && hasSeg) coh += 1;
  if (hasVP && hasCh) coh += 1;
  if (hasSeg && (c.customer_relationships || []).length > 0) coh += 1;
  if (hasRev && hasCost) coh += 1;
  if (hasRev && hasAct) coh += 1;
  if (hasAct && hasRes) coh += 1;
  const coherencia = Math.round((coh / total) * 100);

  // Riesgo: heurístico (más alto = mejor control, por eso lo invertimos para score)
  // aquí medimos "madurez de mitigación": si hay costos+ingresos+actividades+recursos y warnings bajos.
  let riskSignals = 0;
  if (hasRev) riskSignals += 1;
  if (hasCost) riskSignals += 1;
  if (hasAct) riskSignals += 1;
  if (hasRes) riskSignals += 1;
  if ((project.aiRationale?.warnings || []).length === 0) riskSignals += 1;
  if ((project.connections || []).length >= 5) riskSignals += 1;
  const riesgo = Math.round((riskSignals / 6) * 100);

  const w = project.scoreWeights || defaultWeights(project.businessType);
  const agg = Math.round(
    completitud * (w.completitud || 0) +
      coherencia * (w.coherencia || 0) +
      riesgo * (w.riesgo || 0)
  );

  const issues = [];
  if (!hasSeg) issues.push("Falta definir Segmentos de clientes.");
  if (!hasVP) issues.push("Falta definir Propuesta de valor.");
  if (!hasRev) issues.push("Falta definir Fuentes de ingresos.");
  if (!hasCost) issues.push("Falta definir Estructura de costos.");
  if (!hasCh) issues.push("Falta definir Canales.");

  return { completitud, coherencia, riesgo, score: agg, issues };
}

/**
 * Finanzas simplificadas: 3 estados (P&L, Cash Flow, Balance)
 * Modelos: subscription/services/industrial
 */
function forecast3Statements(assumptions, scenarioDelta = 0) {
  const months = clamp(Number(assumptions.months || 12), 3, 60);
  const currency = assumptions.currency || "USD";
  const model = assumptions.model || "subscription";

  let cash = Number(assumptions.cash0 || 0);
  let assets = cash;
  let equity = cash;
  let debt = 0;

  const rows = [];

  // Helpers por modelo
  let customers = Number(assumptions.customers0 || 0);
  const price = Number(assumptions.price || 0) * (1 + scenarioDelta);
  const mGrowth = Number(assumptions.mGrowth || 0) * (1 + scenarioDelta);
  const churn = Number(assumptions.churn || 0);
  const cogsPct = Number(assumptions.cogsPct || 0);

  const hourlyRate = Number(assumptions.hourlyRate || 0) * (1 + scenarioDelta);
  const billableHoursPerMonth = Number(assumptions.billableHoursPerMonth || 0) * (1 + scenarioDelta);
  const utilization = clamp(Number(assumptions.utilization || 0.6), 0, 1);
  const deliveryCostPct = Number(assumptions.deliveryCostPct || 0.2);

  const volumePerMonth = Number(assumptions.volumePerMonth || 0) * (1 + scenarioDelta);
  const pricePerUnit = Number(assumptions.pricePerUnit || 0) * (1 + scenarioDelta);
  const variableCostPerUnit = Number(assumptions.variableCostPerUnit || 0);

  const opexFixed = Number(assumptions.opexFixed || 0);
  const capex = Number(assumptions.capex || 0);

  for (let m = 1; m <= months; m++) {
    // Revenue
    let revenue = 0;
    let cogs = 0;

    if (model === "subscription") {
      const newCustomers = customers * mGrowth;
      const lost = customers * churn;
      customers = Math.max(0, customers + newCustomers - lost);
      revenue = customers * price;
      cogs = revenue * cogsPct;
    } else if (model === "services") {
      const delivered = billableHoursPerMonth * utilization;
      revenue = delivered * hourlyRate;
      cogs = revenue * deliveryCostPct;
    } else if (model === "industrial") {
      revenue = volumePerMonth * pricePerUnit;
      cogs = volumePerMonth * variableCostPerUnit;
    }

    const grossProfit = revenue - cogs;
    const ebitda = grossProfit - opexFixed;

    // Cash Flow
    const invest = m === 1 ? capex : 0;
    const netCashFlow = ebitda - invest;
    cash = cash + netCashFlow;

    // Balance (simplificado): assets=cash; equity acumula utilidades; deuda fija 0 (placeholder)
    equity = equity + ebitda;
    assets = cash;

    rows.push({
      mes: toMonthLabel(m),
      moneda: currency,
      ingresos: Math.round(revenue),
      cogs: Math.round(cogs),
      margenBruto: Math.round(grossProfit),
      opex: Math.round(opexFixed),
      ebitda: Math.round(ebitda),
      capex: Math.round(invest),
      flujoCaja: Math.round(netCashFlow),
      caja: Math.round(cash),
      activos: Math.round(assets),
      deuda: Math.round(debt),
      patrimonio: Math.round(equity),
      clientes: model === "subscription" ? Math.round(customers) : undefined,
    });
  }

  return rows;
}

function variance(actual, forecast) {
  if (forecast === 0) return actual === 0 ? 0 : 1;
  return (actual - forecast) / Math.abs(forecast);
}

export default function CanvasBusinessBuilderV2() {
  
  const [projects, setProjects] = useState(() => {
  const saved = loadState();
  if (saved?.projects?.length) {
    return saved.projects;
  }

  const p = defaultProject("Proyecto ejemplo", "saas");
  p.description = "Prototipo para jugar: crea Canvas v1 con IA o desde cero.";
  return [p];
});


  const [activeId, setActiveId] = useState(() => {
  const saved = loadState();
  return saved?.activeId ?? null;
});
  useEffect(() => {
  if (!activeId && projects.length > 0) {
    setActiveId(projects[0].id);
  }
}, [activeId, projects]);

  useEffect(() => {
  saveState({
    projects,
    activeId,
  });
}, [projects, activeId]);

  
  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizTitle, setWizTitle] = useState("");
  const [wizType, setWizType] = useState("saas");
  const [wizBrief, setWizBrief] = useState("");
  const [wizAutoGen, setWizAutoGen] = useState(true);

  // Canvas item dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addBlock, setAddBlock] = useState("value_propositions");
  const [addText, setAddText] = useState("");

  // UI state
  const [outputKey, setOutputKey] = useState("investorDeck");
  const [scenarioKey, setScenarioKey] = useState("base");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const active = useMemo(() => projects.find((p) => p.id === activeId) || projects[0], [projects, activeId]);
  const blockMeta = useMemo(() => Object.fromEntries(BLOCKS.map((b) => [b.key, b])), []);

  const health = useMemo(() => computeHealth(active), [active]);
  const outputs = useMemo(() => buildOutputs(active), [active]);
  const kpis = useMemo(() => kpiLibrary(active.businessType), [active.businessType]);

  const forecastRows = useMemo(() => {
    const delta = active.scenarios?.[scenarioKey]?.delta ?? 0;
    return forecast3Statements(active.assumptions, delta);
  }, [active.assumptions, active.scenarios, scenarioKey]);

  const baseRows = useMemo(() => forecast3Statements(active.assumptions, 0), [active.assumptions]);

  const updateActive = (patch) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === active.id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const openWizard = () => {
    setWizTitle(`Proyecto ${projects.length + 1}`);
    setWizType("saas");
    setWizBrief("");
    setWizAutoGen(true);
    setWizardOpen(true);
  };

  const createProjectFromWizard = () => {
    const p = defaultProject(wizTitle || `Proyecto ${projects.length + 1}`, wizType);
    p.longBrief = wizBrief;
    p.description = (wizBrief || "").slice(0, 160);

    if (wizAutoGen) {
      const { canvas, edges, rationale } = generateCanvasV1(wizBrief, wizType);
      p.canvas = canvas;
      p.connections = edges;
      p.aiRationale = rationale;
    }

    setProjects((prev) => [p, ...prev]);
    setActiveId(p.id);
    setWizardOpen(false);
  };

  const duplicateProject = () => {
    const copy = deepClone(active);
    copy.id = uid("proj");
    copy.name = `${active.name} (variante)`;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();
    copy.versions = [];
    setProjects((prev) => [copy, ...prev]);
    setActiveId(copy.id);
  };

  const saveVersion = () => {
    const v = {
      id: uid("ver"),
      name: `Versión ${active.versions.length + 1}`,
      at: new Date().toISOString(),
      snapshot: deepClone({
        name: active.name,
        businessType: active.businessType,
        description: active.description,
        longBrief: active.longBrief,
        canvas: active.canvas,
        connections: active.connections,
        aiRationale: active.aiRationale,
        scoreWeights: active.scoreWeights,
        assumptions: active.assumptions,
        scenarios: active.scenarios,
        actuals: active.actuals,
        initiatives: active.initiatives,
      }),
    };
    updateActive({ versions: [v, ...active.versions] });
  };

  const restoreVersion = (versionId) => {
    const v = active.versions.find((x) => x.id === versionId);
    if (!v) return;
    updateActive({ ...deepClone(v.snapshot) });
  };

  const deleteProject = (projectId) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== projectId);
      const fallback = next[0] || defaultProject("Nuevo proyecto", "saas");
      if (next.length === 0) return [fallback];
      if (activeId === projectId) setActiveId(fallback.id);
      return next;
    });
  };

  const addItem = () => {
    const text = addText.trim();
    if (!text) return;
    const item = { id: uid("item"), text, createdAt: new Date().toISOString(), source: "manual" };
    const canvas = deepClone(active.canvas);
    canvas[addBlock] = [...(canvas[addBlock] || []), item];
    updateActive({ canvas });
    setAddText("");
    setAddDialogOpen(false);
  };

  const removeItem = (blockKey, itemId) => {
    const canvas = deepClone(active.canvas);
    canvas[blockKey] = (canvas[blockKey] || []).filter((x) => x.id !== itemId);
    updateActive({ canvas });
  };

  const regenerateV1 = () => {
    const { canvas, edges, rationale } = generateCanvasV1(active.longBrief, active.businessType);
    updateActive({ canvas, connections: edges, aiRationale: rationale });
  };

  const setBusinessType = (t) => {
    updateActive({
      businessType: t,
      scoreWeights: defaultWeights(t),
      assumptions: defaultAssumptions(t),
    });
  };

  // Actuals
  const addActualRow = () => {
    const idx = (active.actuals || []).length + 1;
    const r = {
      id: uid("act"),
      mes: toMonthLabel(idx),
      ingresos: 0,
      ebitda: 0,
      caja: 0,
      kpi1: 0,
      note: "",
    };
    updateActive({ actuals: [...(active.actuals || []), r] });
  };

  const updateActual = (id, patch) => {
    updateActive({
      actuals: (active.actuals || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  // Kanban
  const moveTask = (taskId, from, to) => {
    const init = deepClone(active.initiatives);
    const task = init[from].find((t) => t.id === taskId);
    init[from] = init[from].filter((t) => t.id !== taskId);
    init[to] = [task, ...init[to]];
    updateActive({ initiatives: init });
  };

  const addTask = (col) => {
    const init = deepClone(active.initiatives);
    init[col] = [{ id: uid("tsk"), title: "Nueva iniciativa", owner: "", due: "" }, ...init[col]];
    updateActive({ initiatives: init });
  };

  const updateTask = (col, id, patch) => {
    const init = deepClone(active.initiatives);
    init[col] = init[col].map((t) => (t.id === id ? { ...t, ...patch } : t));
    updateActive({ initiatives: init });
  };

  // Score weights normalize
  const normalizeWeights = (w) => {
    const s = (w.completitud || 0) + (w.coherencia || 0) + (w.riesgo || 0);
    if (s <= 0) return defaultWeights(active.businessType);
    return { completitud: w.completitud / s, coherencia: w.coherencia / s, riesgo: w.riesgo / s };
  };

  const weightsPretty = (w) => ({
    completitud: Math.round((w.completitud || 0) * 100),
    coherencia: Math.round((w.coherencia || 0) * 100),
    riesgo: Math.round((w.riesgo || 0) * 100),
  });

  const varianceRows = useMemo(() => {
    const acts = active.actuals || [];
    if (!acts.length) return [];
    return acts.map((a) => {
      const f = baseRows.find((x) => x.mes === a.mes) || baseRows[baseRows.length - 1];
      const vRev = variance(Number(a.ingresos || 0), Number(f?.ingresos || 0));
      const vE = variance(Number(a.ebitda || 0), Number(f?.ebitda || 0));
      const vCash = variance(Number(a.caja || 0), Number(f?.caja || 0));
      return {
        mes: a.mes,
        forecastIngresos: f?.ingresos ?? 0,
        actualIngresos: a.ingresos,
        varIngresosPct: Math.round(vRev * 100),
        forecastEbitda: f?.ebitda ?? 0,
        actualEbitda: a.ebitda,
        varEbitdaPct: Math.round(vE * 100),
        forecastCaja: f?.caja ?? 0,
        actualCaja: a.caja,
        varCajaPct: Math.round(vCash * 100),
      };
    });
  }, [active.actuals, baseRows]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4 md:p-6">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-0">
          {/* Sidebar */}
          <Card className="rounded-2xl shadow-sm min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Proyectos</span>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" className="rounded-xl" onClick={openWizard}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Nuevo proyecto (wizard)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" className="rounded-xl" onClick={duplicateProject}>
                        <GitBranch className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicar como variante</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" className="rounded-xl" onClick={() => setSettingsOpen(true)}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configuración</TooltipContent>
                  </Tooltip>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                <Input
                  value={active.name}
                  onChange={(e) => updateActive({ name: e.target.value })}
                  className="rounded-xl"
                  placeholder="Nombre del proyecto"
                />
                <Select value={active.businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Tipo de negocio" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>


                <Textarea
                  value={active.longBrief}
                  onChange={(e) => updateActive({ longBrief: e.target.value, description: e.target.value.slice(0, 160) })}

                  className="
  rounded-xl
  w-full
  min-h-[120px]
  max-h-[220px]
  overflow-y-auto
  resize-none
  p-3
  text-sm
  leading-relaxed
"

                  
                  placeholder="Pega aquí tu descripción larga del negocio (brief)."
                />


                <div className="flex gap-2">
                  <Button className="rounded-xl flex-1" onClick={saveVersion}>
                    <Save className="h-4 w-4 mr-2" />Guardar versión
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => downloadJson(`${active.name}-proyecto.json`, active)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exportar proyecto (JSON)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => deleteProject(active.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar proyecto</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
                  <div>
                    <div className="text-xs text-slate-500">Score (0–100)</div>
                    <div className="text-2xl font-semibold">{health.score}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="rounded-xl">Completitud {health.completitud}%</Badge>
                    <Badge variant="secondary" className="rounded-xl">Coherencia {health.coherencia}%</Badge>
                    <Badge variant="secondary" className="rounded-xl">Riesgo {health.riesgo}%</Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl flex-1"
                    onClick={regenerateV1}
                    disabled={!active.longBrief?.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />Generar/Refrescar Canvas v1
                  </Button>
                </div>
                <div className="text-xs text-slate-500">
                  Nota: la generación es heurística (placeholder IA) y guarda criterios/conexiones.
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-xs text-slate-500 mb-2">Versiones (snapshots)</div>
                <ScrollArea className="h-[200px] pr-2">
                  <div className="space-y-2">
                    {active.versions.length === 0 ? (
                      <div className="text-sm text-slate-500">Aún no hay versiones guardadas.</div>
                    ) : (
                      active.versions.map((v) => (
                        <button
                          key={v.id}
                          className="w-full text-left p-2 rounded-xl border hover:bg-slate-50 transition"
                          onClick={() => restoreVersion(v.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{v.name}</div>
                            <Badge variant="secondary" className="rounded-xl">
                              {new Date(v.at).toLocaleString()}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Restaurar versión</div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              <div>
                <div className="text-xs text-slate-500 mb-2">Lista de proyectos</div>
                <ScrollArea className="h-[240px] pr-2">
                  <div className="space-y-2">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        className={`w-full text-left p-2 rounded-xl border transition ${
                          p.id === activeId ? "bg-slate-50 border-slate-300" : "hover:bg-slate-50"
                        }`}
                        onClick={() => setActiveId(p.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm truncate">{p.name}</div>
                          <Badge className="rounded-xl" variant={p.id === activeId ? "default" : "secondary"}>
                            {BUSINESS_TYPES.find((x) => x.value === p.businessType)?.label || ""}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 truncate">{p.description || "(sin descripción)"}</div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Main */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center justify-between">
                <span>Canvas + IA + Ejecución (Prototipo V2)</span>


                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-xl">
                    Actualizado: {new Date(active.updatedAt).toLocaleString()}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 min-h-0 flex flex-col">
              <Tabs defaultValue="canvas" className="w-full min-h-0 flex flex-col">
                <TabsList className="rounded-2xl inline-flex items-center gap-2 h-auto">
                  <TabsTrigger className="h-9 px-4" value="canvas">Canvas</TabsTrigger>
                  <TabsTrigger className="h-9 px-4" value="health">Salud</TabsTrigger>
                  <TabsTrigger className="h-9 px-4" value="connections">Conexiones</TabsTrigger>
                  <TabsTrigger className="h-9 px-4" value="outputs">Salidas</TabsTrigger>
                  <TabsTrigger className="h-9 px-4" value="financials">Finanzas</TabsTrigger>
                  <TabsTrigger className="h-9 px-4" value="actuals">Reality Check</TabsTrigger>
                  <TabsTrigger className="h-9 px-4" value="execution">Ejecución</TabsTrigger>
                  <TabsTrigger className="h-9 px-4" value="kpis">KPIs</TabsTrigger>
                </TabsList>

                {/* Canvas */}
<TabsContent value="canvas" className="mt-4 flex justify-center items-start">
  
<div className="w-full max-w-7xl">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {GRID_ORDER.map((k) => (
        <Card key={k} className="flex flex-col h-[300px]">
          <div className="border-b border-border px-4 py-2 flex items-center justify-between">
            <span className="font-medium text-sm">
              {blockMeta[k]?.name || k}
            </span>
            <Badge variant="secondary">
              {(active.canvas[k] || []).length}
            </Badge>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {(active.canvas[k] || []).length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                Sin elementos todavía.
              </div>
            ) : (
              (active.canvas[k] || []).map((it) => (
                <div
                  key={it.id}
                  className="rounded-md border border-border bg-background p-2 text-sm hover:bg-muted transition"
                >
                  {it.text}
                </div>
              ))
            )}
          </div>
        </Card>
      ))}
    </div>
  </div>

</TabsContent>

                {/* Health */}
                <TabsContent value="health" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {HEALTH_DIMENSIONS.map((d, idx) => {
                      const Icon = d.icon;
                      const val = health[d.key];
                      return (
                        <motion.div key={d.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                          <Card className="rounded-2xl">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${d.color}`} /> {d.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="text-3xl font-semibold">{val}%</div>
                              <div className="text-xs text-slate-500 mt-1">
                                {d.key === "completitud" && "Cobertura de bloques del Canvas."}
                                {d.key === "coherencia" && "Reglas mínimas de consistencia entre bloques."}
                                {d.key === "riesgo" && "Señales de mitigación (finanzas/actividades/recursos/conexiones)."}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-3">
                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Mapa de coherencia (issues)</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {health.issues.length === 0 ? (
                          <div className="text-sm text-emerald-700">Bien: no se detectan vacíos críticos obvios.</div>
                        ) : (
                          <div className="space-y-2">
                            {health.issues.map((x) => (
                              <div key={x} className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-sm">{x}</div>
                            ))}
                          </div>
                        )}
                        {active.aiRationale?.warnings?.length ? (
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-2">Warnings de IA</div>
                            <div className="space-y-2">
                              {active.aiRationale.warnings.map((w) => (
                                <div key={w.id} className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-sm">{w.text}</div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Score agregado (configurable)</span>
                          <Badge className="rounded-xl">{health.score}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="text-xs text-slate-500">Pesos por dimensión (suman 100%)</div>
                        {(() => {
                          const w = weightsPretty(active.scoreWeights || defaultWeights(active.businessType));
                          return (
                            <div className="space-y-2">
                              {(
                                [
                                  { k: "completitud", label: "Completitud" },
                                  { k: "coherencia", label: "Coherencia" },
                                  { k: "riesgo", label: "Riesgo" },
                                ]
                              ).map((x) => (
                                <div key={x.k} className="grid grid-cols-[110px_1fr_54px] items-center gap-2">
                                  <div className="text-sm">{x.label}</div>
                                  <Input
                                    type="number"
                                    className="rounded-xl"
                                    value={w[x.k]}
                                    onChange={(e) => {
                                      const next = { ...w, [x.k]: Number(e.target.value) };
                                      const norm = normalizeWeights({
                                        completitud: next.completitud / 100,
                                        coherencia: next.coherencia / 100,
                                        riesgo: next.riesgo / 100,
                                      });
                                      updateActive({ scoreWeights: norm });
                                    }}
                                  />
                                  <div className="text-xs text-slate-500">%</div>
                                </div>
                              ))}
                              <div className="text-xs text-slate-500">
                                Tip: ajusta pesos por tipo de negocio (ej. SaaS prioriza coherencia/unit economics).
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {active.aiRationale && (
                    <Card className="rounded-2xl mt-3">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Registro de criterios (IA) — trazabilidad</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs text-slate-500">Señales detectadas</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(active.aiRationale.detectedSignals || {}).map(([k, v]) => (
                            <Badge key={k} variant={v ? "default" : "secondary"} className="rounded-xl">{k}:{String(v)}</Badge>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-slate-500">Reglas activadas</div>
                        <div className="mt-2 space-y-2">
                          {(active.aiRationale.rulesActivated || []).map((r) => (
                            <div key={r.id} className="p-2 rounded-xl bg-slate-50 border text-sm">{r.rule}</div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-slate-500">Principios de conexión</div>
                        <div className="mt-2 space-y-1 text-sm">
                          {(active.aiRationale.connectionPrinciples || []).map((p) => (
                            <div key={p} className="p-2 rounded-xl bg-slate-50 border">{p}</div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Connections */}
                <TabsContent value="connections" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-600">Conexiones causa→efecto entre bloques. Útil para explicar por qué el Canvas está “balanceado”.</div>
                    <Button variant="outline" className="rounded-xl" onClick={() => updateActive({ connections: [] })} disabled={(active.connections || []).length === 0}>
                      <Trash2 className="h-4 w-4 mr-2" />Limpiar
                    </Button>
                  </div>
                  {(active.connections || []).length === 0 ? (
                    <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-slate-600">No hay conexiones aún. Genera v1 con IA o agrega manualmente en una versión posterior.</CardContent></Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {active.connections.map((e, idx) => (
                        <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.01 }}>
                          <Card className="rounded-2xl">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">{blockMeta[e.from]?.name} → {blockMeta[e.to]?.name}</div>
                                  <div className="text-xs text-slate-600 mt-1">{e.reason}</div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="secondary" className="rounded-xl">Confianza: {Math.round((e.confidence || 0) * 100)}%</Badge>
                                    <Badge variant="outline" className="rounded-xl">{e.source || "manual"}</Badge>
                                  </div>
                                </div>
                                <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => updateActive({ connections: active.connections.filter((x) => x.id !== e.id) })}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Outputs */}
                <TabsContent value="outputs" className="mt-4">
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Generar salidas</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <Select value={outputKey} onValueChange={setOutputKey}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oneLiner">One-liner</SelectItem>
                            <SelectItem value="elevator">Elevator pitch</SelectItem>
                            <SelectItem value="investorDeck">Deck inversores (outline)</SelectItem>
                            <SelectItem value="commercialDeck">Presentación comercial (outline)</SelectItem>
                            <SelectItem value="marketing">Marketing (lista)</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                          <Button variant="default" className="rounded-xl flex-1" onClick={() => copyToClipboard(outputs[outputKey])}>
                            <Copy className="h-4 w-4 mr-2" />Copiar
                          </Button>
                          <Button variant="outline" className="rounded-xl" onClick={() => downloadText(`${active.name}-${outputKey}.txt`, outputs[outputKey])}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-xs text-slate-500">
                          Nota: aquí generamos texto. En la app real, esto se exporta a PPTX/DOCX usando una plantilla (por ejemplo, una plantilla corporativa).
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Salida</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        <Textarea value={outputs[outputKey]} readOnly className="rounded-2xl min-h-[420px]" />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Financials */}
                <TabsContent value="financials" className="mt-4">
                  <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-3">
                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Supuestos + Escenarios</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Moneda</div>
                            <Select value={active.assumptions.currency} onValueChange={(v) => updateActive({ assumptions: { ...active.assumptions, currency: v } })}>
                              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="CLP">CLP</SelectItem>
                                <SelectItem value="UF">UF</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Horizonte (meses)</div>
                            <Input type="number" className="rounded-xl" value={active.assumptions.months} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, months: Number(e.target.value) } })} />
                          </div>
                        </div>

                        {active.assumptions.model === "subscription" && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Precio mensual</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.price} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, price: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Clientes iniciales</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.customers0} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, customers0: Number(e.target.value) } })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Crecimiento mensual</div>
                                <Input type="number" step="0.01" className="rounded-xl" value={active.assumptions.mGrowth} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, mGrowth: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Churn mensual</div>
                                <Input type="number" step="0.01" className="rounded-xl" value={active.assumptions.churn} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, churn: Number(e.target.value) } })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">COGS (% ingresos)</div>
                                <Input type="number" step="0.01" className="rounded-xl" value={active.assumptions.cogsPct} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, cogsPct: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">OPEX fijo mensual</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.opexFixed} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, opexFixed: Number(e.target.value) } })} />
                              </div>
                            </div>
                          </div>
                        )}

                        {active.assumptions.model === "services" && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Tarifa por hora</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.hourlyRate} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, hourlyRate: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Horas/mes (capacidad)</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.billableHoursPerMonth} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, billableHoursPerMonth: Number(e.target.value) } })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Utilización (0–1)</div>
                                <Input type="number" step="0.01" className="rounded-xl" value={active.assumptions.utilization} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, utilization: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Costo entrega (% ingresos)</div>
                                <Input type="number" step="0.01" className="rounded-xl" value={active.assumptions.deliveryCostPct} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, deliveryCostPct: Number(e.target.value) } })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">OPEX fijo mensual</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.opexFixed} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, opexFixed: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Caja inicial</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.cash0} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, cash0: Number(e.target.value) } })} />
                              </div>
                            </div>
                          </div>
                        )}

                        {active.assumptions.model === "industrial" && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Volumen/mes</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.volumePerMonth} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, volumePerMonth: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Precio por unidad</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.pricePerUnit} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, pricePerUnit: Number(e.target.value) } })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Costo variable/unidad</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.variableCostPerUnit} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, variableCostPerUnit: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">OPEX fijo mensual</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.opexFixed} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, opexFixed: Number(e.target.value) } })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-slate-500 mb-1">CAPEX (mes 1)</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.capex} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, capex: Number(e.target.value) } })} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-1">Caja inicial</div>
                                <Input type="number" className="rounded-xl" value={active.assumptions.cash0} onChange={(e) => updateActive({ assumptions: { ...active.assumptions, cash0: Number(e.target.value) } })} />
                              </div>
                            </div>
                          </div>
                        )}

                        <Separator />

                        <div>
                          <div className="text-xs text-slate-500 mb-1">Escenario</div>
                          <Select value={scenarioKey} onValueChange={setScenarioKey}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(active.scenarios || {}).map(([k, s]) => (
                                <SelectItem key={k} value={k}>{s.name} ({Math.round((s.delta || 0) * 100)}%)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="text-xs text-slate-500">
                          3 estados simplificados (P&L, Caja, Balance). En la app real: working capital, deuda/equity, reconciliación completa.
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      <Card className="rounded-2xl">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Proyección (Ingresos, EBITDA, Caja)</CardTitle></CardHeader>
                        <CardContent className="pt-0">
                          <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={forecastRows} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="mes" />
                                <YAxis />
                                <RTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="ingresos" stroke="#2563eb" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="ebitda" stroke="#16a34a" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="caja" stroke="#0f172a" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Tabla (primeros 12 meses)</CardTitle></CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-8 text-xs text-slate-500 mb-2 px-2">
                            <div>Mes</div><div>Ingresos</div><div>COGS</div><div>Margen</div><div>OPEX</div><div>EBITDA</div><div>Flujo</div><div>Caja</div>
                          </div>
                          <div className="space-y-1">
                            {forecastRows.slice(0, 12).map((r) => (
                              <div key={r.mes} className="grid grid-cols-8 text-sm bg-slate-50 border border-slate-200 rounded-xl px-2 py-2">
                                <div className="font-medium">{r.mes}</div>
                                <div>{r.ingresos}</div>
                                <div>{r.cogs}</div>
                                <div>{r.margenBruto}</div>
                                <div>{r.opex}</div>
                                <div className={r.ebitda < 0 ? "text-rose-600" : "text-emerald-700"}>{r.ebitda}</div>
                                <div className={r.flujoCaja < 0 ? "text-rose-600" : "text-slate-900"}>{r.flujoCaja}</div>
                                <div className={r.caja < 0 ? "text-rose-600" : "text-slate-900"}>{r.caja}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Actuals / Reality Check */}
                <TabsContent value="actuals" className="mt-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <div className="text-sm text-slate-600">Carga resultados reales por mes y compara contra el forecast Base.</div>
                    <div className="flex gap-2">
                      <Button className="rounded-xl" onClick={addActualRow}><Plus className="h-4 w-4 mr-2" />Agregar mes real</Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => downloadJson(`${active.name}-actuals.json`, active.actuals || [])}>
                        <Download className="h-4 w-4 mr-2" />Exportar
                      </Button>
                    </div>
                  </div>

                  {(active.actuals || []).length === 0 ? (
                    <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-slate-600">Aún no hay datos reales. Agrega un mes para comenzar.</CardContent></Card>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-3">
                      <Card className="rounded-2xl">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Carga de datos reales</CardTitle></CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {(active.actuals || []).map((r) => (
                            <div key={r.id} className="p-3 rounded-2xl border bg-slate-50">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{r.mes}</div>
                                <Badge variant="secondary" className="rounded-xl">Real</Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">Ingresos</div>
                                  <Input type="number" className="rounded-xl" value={r.ingresos} onChange={(e) => updateActual(r.id, { ingresos: Number(e.target.value) })} />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">EBITDA</div>
                                  <Input type="number" className="rounded-xl" value={r.ebitda} onChange={(e) => updateActual(r.id, { ebitda: Number(e.target.value) })} />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">Caja</div>
                                  <Input type="number" className="rounded-xl" value={r.caja} onChange={(e) => updateActual(r.id, { caja: Number(e.target.value) })} />
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="text-xs text-slate-500 mb-1">Nota</div>
                                <Input className="rounded-xl" value={r.note} onChange={(e) => updateActual(r.id, { note: e.target.value })} placeholder="Qué pasó este mes (drivers, eventos, cambios)" />
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <div className="space-y-3">
                        <Card className="rounded-2xl">
                          <CardHeader className="pb-2"><CardTitle className="text-sm">Variaciones vs Forecast (Base)</CardTitle></CardHeader>
                          <CardContent className="pt-0">
                            <div className="h-[280px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={varianceRows} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="mes" />
                                  <YAxis />
                                  <RTooltip />
                                  <Legend />
                                  <Bar dataKey="varIngresosPct" fill="#2563eb" name="Var Ingresos %" />
                                  <Bar dataKey="varEbitdaPct" fill="#16a34a" name="Var EBITDA %" />
                                  <Bar dataKey="varCajaPct" fill="#0f172a" name="Var Caja %" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                          <CardHeader className="pb-2"><CardTitle className="text-sm">Tabla de control</CardTitle></CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-7 text-xs text-slate-500 mb-2 px-2">
                              <div>Mes</div><div>F.Ing</div><div>R.Ing</div><div>Var%</div><div>F.EB</div><div>R.EB</div><div>Var%</div>
                            </div>
                            <div className="space-y-1">
                              {varianceRows.map((r) => (
                                <div key={r.mes} className="grid grid-cols-7 text-sm bg-slate-50 border border-slate-200 rounded-xl px-2 py-2">
                                  <div className="font-medium">{r.mes}</div>
                                  <div>{r.forecastIngresos}</div>
                                  <div>{r.actualIngresos}</div>
                                  <div className={r.varIngresosPct < 0 ? "text-rose-600" : "text-emerald-700"}>{r.varIngresosPct}%</div>
                                  <div>{r.forecastEbitda}</div>
                                  <div>{r.actualEbitda}</div>
                                  <div className={r.varEbitdaPct < 0 ? "text-rose-600" : "text-emerald-700"}>{r.varEbitdaPct}%</div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Execution */}
                <TabsContent value="execution" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-600">Mini tablero Kanban para iniciativas del modelo (ejecución).</div>
                    <Button variant="outline" className="rounded-xl" onClick={() => downloadJson(`${active.name}-kanban.json`, active.initiatives)}>
                      <Download className="h-4 w-4 mr-2" />Exportar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {(
                      [
                        { key: "backlog", title: "Backlog" },
                        { key: "doing", title: "En progreso" },
                        { key: "done", title: "Listo" },
                      ]
                    ).map((col) => (
                      <Card key={col.key} className="rounded-2xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2"><KanbanSquare className="h-4 w-4" />{col.title}</span>
                            <Button size="icon" variant="secondary" className="rounded-xl" onClick={() => addTask(col.key)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {(active.initiatives?.[col.key] || []).map((t) => (
                            <div key={t.id} className="p-3 rounded-2xl border bg-slate-50">
                              <Input className="rounded-xl" value={t.title} onChange={(e) => updateTask(col.key, t.id, { title: e.target.value })} />
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <Input className="rounded-xl" value={t.owner} onChange={(e) => updateTask(col.key, t.id, { owner: e.target.value })} placeholder="Owner" />
                                <Input className="rounded-xl" value={t.due} onChange={(e) => updateTask(col.key, t.id, { due: e.target.value })} placeholder="Due" />
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant="secondary" className="rounded-xl">{col.title}</Badge>
                                <div className="flex gap-2">
                                  {col.key !== "backlog" && (
                                    <Button variant="outline" className="rounded-xl" onClick={() => moveTask(t.id, col.key, col.key === "doing" ? "backlog" : "doing")}>←</Button>
                                  )}
                                  {col.key !== "done" && (
                                    <Button variant="outline" className="rounded-xl" onClick={() => moveTask(t.id, col.key, col.key === "backlog" ? "doing" : "done")}>→</Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(active.initiatives?.[col.key] || []).length === 0 && (
                            <div className="text-sm text-slate-500">Sin iniciativas.</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* KPIs */}
                <TabsContent value="kpis" className="mt-4">
                  <div className="text-sm text-slate-600 mb-3">Biblioteca sugerida por tipo de negocio (puedes copiar/descargar).</div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {kpis.map((g, idx) => (
                      <motion.div key={`${g.group}_${idx}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                        <Card className="rounded-2xl">
                          <CardHeader className="pb-2"><CardTitle className="text-sm">{g.group}</CardTitle></CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                              {g.items.map((it) => (
                                <Badge key={it} variant="secondary" className="rounded-xl">{it}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => copyToClipboard(kpis.map((g) => `# ${g.group}\n- ${g.items.join("\n- ")}`).join("\n\n"))}>
                      <Copy className="h-4 w-4 mr-2" />Copiar KPIs
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => downloadText(`${active.name}-kpis.txt`, kpis.map((g) => `# ${g.group}\n- ${g.items.join("\n- ")}`).join("\n\n"))}>
                      <Download className="h-4 w-4 mr-2" />Descargar
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Wizard dialog */}
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="rounded-2xl max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo proyecto (Wizard)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Título</div>
                  <Input className="rounded-xl" value={wizTitle} onChange={(e) => setWizTitle(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Tipo de negocio</div>
                  <Select value={wizType} onValueChange={setWizType}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Descripción larga (copiar/pegar)</div>
                <Textarea className="rounded-2xl min-h-[160px]" value={wizBrief} onChange={(e) => setWizBrief(e.target.value)} placeholder="Pega aquí el texto largo del negocio (contexto, hipótesis, propuesta, mercado, etc.)." />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl border bg-slate-50">
                <div>
                  <div className="font-medium">Generar Canvas v1 con IA</div>
                  <div className="text-xs text-slate-500">Si lo activas, la app crea las 9 cajas + conexiones y guarda criterios.</div>
                </div>


          

                <div
                 className="flex items-center gap-2 select-none"
  onClick={() => setWizAutoGen((v) => !v)}
>
  <Label
    className={`text-xs cursor-pointer ${wizAutoGen ? "text-slate-400" : "font-semibold"}`}
    onClick={(e) => {
      e.stopPropagation();
      setWizAutoGen(false);
    }}
  >
    Vacío
  </Label>

  <Switch
    checked={wizAutoGen}
    onCheckedChange={(checked) => setWizAutoGen(!!checked)}
    onClick={(e) => e.stopPropagation()}
  />

  <Label
    className={`text-xs cursor-pointer ${wizAutoGen ? "font-semibold" : "text-slate-400"}`}
    onClick={(e) => {
      e.stopPropagation();
      setWizAutoGen(true);
    }}
  >
    IA
  </Label>

  {/* Indicador (temporal) para comprobar estado sin dudas */}
  <span className="ml-2 text-[11px] text-slate-500">
    {wizAutoGen ? "IA" : "Vacío"}
  </span>
</div>




              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setWizardOpen(false)}>Cancelar</Button>
                <Button className="rounded-xl" onClick={createProjectFromWizard}>
                  <Sparkles className="h-4 w-4 mr-2" />Crear proyecto
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="rounded-2xl max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configuración del proyecto</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                Este prototipo incluye ideas conversadas: creación de proyecto con texto largo, Canvas v1 opcional con IA y trazabilidad, panel de salud por dimensiones y score agregado configurable.
              </div>
              <Separator />
              <div className="text-xs text-slate-500">Modelo financiero (selección automática por tipo)</div>
              <div className="p-3 rounded-2xl border bg-slate-50 text-sm">
                <div><span className="font-medium">Tipo:</span> {BUSINESS_TYPES.find((x) => x.value === active.businessType)?.label}</div>
                <div className="mt-1"><span className="font-medium">Modelo:</span> {active.assumptions.model}</div>
                <div className="mt-2 text-xs text-slate-500">Puedes cambiar el tipo de negocio para ver diferentes supuestos.</div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button className="rounded-xl" onClick={() => setSettingsOpen(false)}>Cerrar</Button>
              </div>
            </div>

            <Separator />

<div className="pt-3">
  <div className="text-xs text-slate-500 mb-2">
    Datos locales (este navegador)
  </div>

  <Button
    variant="destructive"
    className="rounded-xl w-full"
    onClick={resetLocalStorage}
  >
    Resetear datos locales
  </Button>

  <div className="text-xs text-slate-500 mt-2">
    Esto elimina proyectos, canvas y versiones guardadas en este computador.
  </div>
</div>

<Separator className="my-4" />

<div>
  <div className="text-xs text-slate-500 mb-2">
    Exportar / Importar
  </div>

  <Button
    variant="outline"
    className="rounded-xl w-full"
    onClick={() => exportProjectsToJSON(projects, activeId)}
  >
    Exportar proyectos (JSON)
  </Button>
</div>

<div className="mt-3">
  <label className="text-xs text-slate-500 mb-2 block">
    Importar proyectos desde archivo JSON
  </label>

  <input
    type="file"
    accept=".json"
    className="block w-full text-sm"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        if (window.confirm("Esto reemplazará los proyectos actuales. ¿Continuar?")) {
          importProjectsFromJSON(file, setProjects, setActiveId);
        }
      }
    }}
  />
</div>
<Button
  variant="outline"
  className="rounded-xl w-full"
  onClick={() => {
    const project = projects.find((p) => p.id === activeId);
    if (project) {
      exportSingleProjectToJSON(project);
    }
  }}
>
  Exportar proyecto activo (JSON)
</Button>

<div className="mt-3">
  <label className="text-xs text-slate-500 mb-2 block">
    Importar proyecto (JSON)
  </label>

  <input
    type="file"
    accept=".json"
    className="block w-full text-sm"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        importSingleProjectFromJSON(
          file,
          projects,
          setProjects,
          setActiveId
        );
      }
    }}
  />
</div>

          </DialogContent>
        </Dialog>

        <div className="mx-auto max-w-7xl mt-4 text-xs text-slate-500">
          Prototipo UI (sin backend). Incluye: Wizard + Canvas + Salud + Conexiones + Salidas + Finanzas + Reality Check + Kanban.
        </div>
      </div>
    </TooltipProvider>
  );
}
