import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Search, X, ChevronDown } from 'lucide-react';
import * as Select from "@radix-ui/react-select"

import { fetchAuditControls, fetchControlQuestions } from '../../../lib/api';
import { ControlDetail } from '../ControlDetail';

type BackendControl = {
  audit_id: string;
  control_id: string;
  control_title: string;
  applies: number;
  exclusion_reason: string | null;
  audit_status: string;
  result: string;
  implementation_grade: string | null;
  notes: string | null;
  updated_at: string;
  target_level: string | null;
};

type BackendQuestion = {
  id: string;
  texto: string;
  min_level: string;
  answer: string | null;
  comment: string | null;
  answered_at: string | null;
};

type UiControl = {
  id: string;
  code: string;
  name: string;
  aplica: boolean;
  nivelObjetivo: string;
  estado: string;
  resultado: string;
  notes?: string | null;
  exclusionReason?: string | null;
};

function mapLevel(level: string | null | undefined) {
  switch ((level || '').toUpperCase()) {
    case 'BASICA':
      return 'BÁSICA';
    case 'MEDIA':
      return 'MEDIA';
    case 'ALTA':
      return 'ALTA';
    default:
      return 'MEDIA';
  }
}

function mapAuditStatus(status: string | null | undefined) {
  switch ((status || '').toUpperCase()) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'EN_PROGRESO':
      return 'En progreso';
    case 'AUDITADO':
      return 'Auditado';
    default:
      return 'Pendiente';
  }
}

function mapResult(result: string | null | undefined) {
  switch ((result || '').toUpperCase()) {
    case 'NO_EVAL':
      return 'No evaluado';
    case 'CUMPLE':
      return 'Cumple';
    case 'NO_CUMPLE':
      return 'No cumple';
    case 'PARCIAL':
      return 'Parcial';
    default:
      return 'No evaluado';
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case 'BÁSICA':
      return 'bg-green-100 text-green-800';
    case 'MEDIA':
      return 'bg-yellow-100 text-yellow-800';
    case 'ALTA':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getResultColor(result: string) {
  switch (result) {
    case 'Cumple':
      return 'bg-green-100 text-green-800';
    case 'No cumple':
      return 'bg-red-100 text-red-800';
    case 'Parcial':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function normalizeControl(control: BackendControl): UiControl {
  return {
    id: control.control_id,
    code: control.control_id,
    name: control.control_title,
    aplica: control.applies === 1,
    nivelObjetivo: mapLevel(control.target_level),
    estado: mapAuditStatus(control.audit_status),
    resultado: mapResult(control.result),
    notes: control.notes,
    exclusionReason: control.exclusion_reason,
  };
}

function normalizeQuestions(questions: BackendQuestion[]) {
  return questions.map((q) => ({
    id: q.id,
    questionId: q.id,
    text: q.texto,
    texto: q.texto,
    level: mapLevel(q.min_level),
    minLevel: mapLevel(q.min_level),
    answer: q.answer,
    comment: q.comment,
    answeredAt: q.answered_at,
  }));
}

export function MedidasSeguridadTab() {
  const { auditId } = useParams();

  const [controls, setControls] = useState<UiControl[]>([]);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [resultadoFilter, setResultadoFilter] = useState('all');
  const [aplicabilidadFilter, setAplicabilidadFilter] = useState('all');

  async function loadControls() {
    if (!auditId) {
      setError('Missing auditId');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data: BackendControl[] = await fetchAuditControls(auditId, false);
      const normalized = data.map(normalizeControl);

      setControls(normalized);

      if (!selectedControlId && normalized.length > 0) {
        setSelectedControlId(normalized[0].id);
      }

      if (selectedControlId && !normalized.some((c) => c.id === selectedControlId)) {
        setSelectedControlId(normalized.length > 0 ? normalized[0].id : null);
      }
    } catch (err) {
      console.error('Error loading controls:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadControls();
  }, [auditId]);

  const filteredControls = useMemo(() => {
    return controls.filter((control) => {
      const matchesSearch =
        control.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstado =
        estadoFilter === 'all' || control.estado === estadoFilter;

      const matchesResultado =
        resultadoFilter === 'all' || control.resultado === resultadoFilter;

      const matchesAplicabilidad =
        aplicabilidadFilter === 'all' ||
        (aplicabilidadFilter === 'aplica' && control.aplica) ||
        (aplicabilidadFilter === 'no-aplica' && !control.aplica);

      return matchesSearch && matchesEstado && matchesResultado && matchesAplicabilidad;
    });
  }, [controls, searchTerm, estadoFilter, resultadoFilter, aplicabilidadFilter]);

  const selectedControl =
    filteredControls.find((c) => c.id === selectedControlId) ||
    controls.find((c) => c.id === selectedControlId) ||
    null;

  useEffect(() => {
    async function loadQuestions() {
      if (!auditId || !selectedControl) {
        setSelectedQuestions([]);
        return;
      }

      try {
        setDetailLoading(true);
        const data: BackendQuestion[] = await fetchControlQuestions(auditId, selectedControl.code);
        setSelectedQuestions(normalizeQuestions(data));
      } catch (err) {
        console.error('Error loading control questions:', err);
        setSelectedQuestions([]);
      } finally {
        setDetailLoading(false);
      }
    }

    loadQuestions();
  }, [auditId, selectedControl]);

  const hasActiveFilters =
    estadoFilter !== 'all' ||
    resultadoFilter !== 'all' ||
    aplicabilidadFilter !== 'all';

  const clearFilters = () => {
    setEstadoFilter('all');
    setResultadoFilter('all');
    setAplicabilidadFilter('all');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando controles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <p className="text-red-600">Error cargando controles: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Controls List */}
      <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col">
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar control..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Filtros:</div>
            
            

            <div className="flex items-center gap-2 flex-wrap">
              {/* Estado Filter */}
              <Select.Root value={estadoFilter} onValueChange={setEstadoFilter}>
                <Select.Trigger className="min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Select.Value placeholder="Estado" />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                  >
                    <Select.Viewport>
                      <Select.Item value="all" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Estado: Todos</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Pendiente" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Pendiente</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="En progreso" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>En progreso</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Auditado" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Auditado</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {/* Resultado Filter */}
              <Select.Root value={resultadoFilter} onValueChange={setResultadoFilter}>
                <Select.Trigger className="min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Select.Value placeholder="Resultado" />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                  >
                    <Select.Viewport>
                      <Select.Item value="all" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Resultado: Todos</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="No evaluado" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>No evaluado</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Cumple" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Cumple</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="No cumple" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>No cumple</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Parcial" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Parcial</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {/* Aplicabilidad Filter */}
              <Select.Root value={aplicabilidadFilter} onValueChange={setAplicabilidadFilter}>
                <Select.Trigger className="min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Select.Value placeholder="Aplicabilidad" />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                  >
                    <Select.Viewport>
                      <Select.Item value="all" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Aplicabilidad: Todos</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="aplica" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>Aplica</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="no-aplica" className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>No aplica</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Limpiar filtros
                </button>
              )}
            </div>
            
            
          </div>
        </div>

        {/* Controls List */}
        <div className="flex-1 overflow-y-auto">
          {filteredControls.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No se encontraron controles.</div>
          ) : (
            filteredControls.map((control) => (
              <button
                key={control.id}
                onClick={() => setSelectedControlId(control.id)}
                className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedControl?.id === control.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-sm font-semibold text-gray-900">{control.code}</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(
                        control.nivelObjetivo
                      )}`}
                    >
                      {control.nivelObjetivo}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-medium text-gray-700 mb-2">{control.name}</div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      control.aplica ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {control.aplica ? 'Aplica' : 'No aplica'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs text-gray-600">{control.estado}</span>
                  <span className="text-gray-400">•</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getResultColor(
                      control.resultado
                    )}`}
                  >
                    {control.resultado}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Control Detail */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!selectedControl ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Selecciona un control</p>
          </div>
        ) : detailLoading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Cargando detalle del control...</p>
          </div>
        ) : (
          <ControlDetail
            control={selectedControl}
            questions={selectedQuestions}
            onControlUpdated={loadControls}
          />
        )}
      </div>
    </div>
  );
}