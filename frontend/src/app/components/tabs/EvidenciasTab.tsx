import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ExternalLink, FileText } from 'lucide-react';
import { fetchAuditEvidences } from '../../../lib/api';

type Evidence = {
  id: string;
  kind: string;
  description: string | null;
  uri: string;
  created_at: string;
  control_id: string;
};

function mapEvidenceType(kind: string) {
  switch ((kind || '').toLowerCase()) {
    case 'url':
      return 'URL';
    case 'file':
      return 'Archivo';
    case 'text':
      return 'Texto';
    default:
      return kind || 'Desconocido';
  }
}

export function EvidenciasTab() {
  const { auditId } = useParams();

  const [tipoFilter, setTipoFilter] = useState('all');
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvidences() {
      if (!auditId) {
        setError('Missing auditId');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await fetchAuditEvidences(auditId);
        setEvidences(data);
      } catch (err) {
        console.error('Error loading evidences:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadEvidences();
  }, [auditId]);

  const filteredEvidences = evidences.filter((evidence) => {
    if (tipoFilter === 'all') return true;
    return mapEvidenceType(evidence.kind) === tipoFilter;
  });

  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header with filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Todas las evidencias</h2>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="URL">URL</option>
              <option value="Archivo">Archivo</option>
              <option value="Texto">Texto</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando evidencias...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Error: {error}</div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Control</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Descripción</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvidences.map((evidence) => {
                    const evidenceType = mapEvidenceType(evidence.kind);

                    return (
                      <tr key={evidence.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {evidence.control_id}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              evidenceType === 'URL'
                                ? 'bg-blue-100 text-blue-800'
                                : evidenceType === 'Archivo'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {evidenceType}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700">
                          {evidence.description || 'Sin descripción'}
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-600">
                          {evidence.created_at}
                        </td>

                        <td className="py-3 px-4">
                          {evidenceType === 'URL' ? (
                            <a
                              href={evidence.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : evidenceType === 'Archivo' ? (
                            <button className="text-gray-600 hover:text-gray-700">
                              <FileText className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredEvidences.length === 0 && (
              <div className="p-8 text-center text-gray-500">No se encontraron evidencias</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}