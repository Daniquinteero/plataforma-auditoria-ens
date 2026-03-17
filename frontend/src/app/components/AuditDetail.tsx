import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import * as Tabs from '@radix-ui/react-tabs';

import { fetchAuditById, fetchAuditSummary } from '../../lib/api';
import { ResumenTab } from './tabs/ResumenTab';
import { MedidasSeguridadTab } from './tabs/MedidasSeguridadTab';
import { EvidenciasTab } from './tabs/EvidenciasTab';
import { ActividadTab } from './tabs/ActividadTab';
import { GenerateReportDialog } from './GenerateReportDialog';

import { FileText } from 'lucide-react';

type Audit = {
  id: string;
  name: string;
  org: string;
  ens_category: string;
  status: string;
  context_json?: string;
  created_at?: string;
  updated_at?: string;
};

type AuditSummary = {
  audit_id: string;
  total_applicable: number;
  audited: number;
  with_result: number;
  non_compliant: number;
  total_evidences: number;
  total_yes_answers: number;
  progress_pct: number;
};

function getLevelColor(level: string) {
  switch (level) {
    case 'BASICA':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'MEDIA':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'ALTA':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

export function AuditDetail() {
  const { auditId } = useParams();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    async function loadAuditData() {
      if (!auditId) {
        setError('Missing auditId');
        setLoading(false);
        return;
      }

      try {
        const [auditData, summaryData] = await Promise.all([
          fetchAuditById(auditId),
          fetchAuditSummary(auditId),
        ]);

        console.log('AUDIT FROM API:', auditData);
        console.log('SUMMARY FROM API:', summaryData);

        setAudit(auditData);
        setSummary(summaryData);
      } catch (err) {
        console.error('API ERROR:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadAuditData();
  }, [auditId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Cargando auditoría...</p>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">
          {error ? `Error: ${error}` : 'Auditoría no encontrada'}
        </p>
      </div>
    );
  }

  

  return (
    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between">
          <div>


            <h1 className="text-3xl font-bold text-gray-900 mb-2">{audit.name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-gray-600">{audit.org}</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(
                  audit.ens_category
                )}`}
              >
                {audit.ens_category}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generar informe
          </button>
        </div>
      </div>


      {/* Tabs */}
      <Tabs.Root defaultValue="resumen" className="flex-1 flex flex-col overflow-hidden">
        <Tabs.List className="bg-white border-b border-gray-200 px-8 flex gap-6">
          <Tabs.Trigger
            value="resumen"
            className="py-3 px-1 text-sm font-medium text-gray-600 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 hover:text-gray-900 transition-colors"
          >
            Resumen
          </Tabs.Trigger>
          <Tabs.Trigger
            value="medidas"
            className="py-3 px-1 text-sm font-medium text-gray-600 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 hover:text-gray-900 transition-colors"
          >
            Medidas de seguridad
          </Tabs.Trigger>
          <Tabs.Trigger
            value="evidencias"
            className="py-3 px-1 text-sm font-medium text-gray-600 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 hover:text-gray-900 transition-colors"
          >
            Evidencias
          </Tabs.Trigger>
          <Tabs.Trigger
            value="actividad"
            className="py-3 px-1 text-sm font-medium text-gray-600 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 hover:text-gray-900 transition-colors"
          >
            Actividad
          </Tabs.Trigger>
        </Tabs.List>

        <div className="flex-1 overflow-hidden">
          <Tabs.Content value="resumen" className="h-full overflow-y-auto">
            <ResumenTab />
          </Tabs.Content>

          <Tabs.Content value="medidas" className="h-full overflow-hidden">
            <MedidasSeguridadTab />
          </Tabs.Content>

          <Tabs.Content value="evidencias" className="h-full overflow-y-auto">
            <EvidenciasTab />
          </Tabs.Content>

          <Tabs.Content value="actividad" className="h-full overflow-y-auto">
            <ActividadTab />
          </Tabs.Content>
        </div>
      </Tabs.Root>

      <GenerateReportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        audit={audit}
      />

    </div>
  );
}