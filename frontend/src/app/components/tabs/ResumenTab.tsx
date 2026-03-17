import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { BarChart3, CheckCircle, ClipboardList, XCircle, FileText, CheckSquare } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as Progress from '@radix-ui/react-progress';
import { fetchAuditSummary, fetchAuditCategoriesSummary, fetchAuditProgressTimeseries } from '../../../lib/api';

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

type CategorySummary = {
  key: string;
  label: string;
  total: number;
  audited: number;
  progress_pct: number;
};

type ProgressPoint = {
  day: string;
  audited_count: number;
};



function KpiCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

export function ResumenTab() {
  const { auditId } = useParams();

  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    async function loadSummary() {
      if (!auditId) {
        setError('Missing auditId');
        setLoading(false);
        return;
      }

      try {
        const [summaryData, categoriesData, progressSeries] = await Promise.all([
          fetchAuditSummary(auditId),
          fetchAuditCategoriesSummary(auditId),
          fetchAuditProgressTimeseries(auditId, selectedDays),
        ]);

        setSummary(summaryData);
        setCategories(categoriesData);
        setProgressData(progressSeries);
      } catch (err) {
        console.error('Error loading audit summary:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [auditId, selectedDays]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <p className="text-gray-500">Cargando resumen...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <p className="text-red-600">
            {error ? `Error cargando resumen: ${error}` : 'No se pudo cargar el resumen'}
          </p>
        </div>
      </div>
    );
  }

  const progressValue = Number(summary.progress_pct ?? 0);

  return (
    <div className="p-8 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Controles aplicables"
          value={summary.total_applicable}
          icon={<ClipboardList className="w-5 h-5" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />

        <KpiCard
          title="Controles auditados"
          value={summary.audited}
          icon={<CheckCircle className="w-5 h-5" />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        <KpiCard
          title="No conformidades"
          value={summary.non_compliant}
          icon={<XCircle className="w-5 h-5" />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />

        <KpiCard
          title="Progreso de auditoría"
          value={`${progressValue}%`}
          icon={<BarChart3 className="w-5 h-5" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso general de auditoría</h3>
        <div className="space-y-2">
          <Progress.Root
            value={progressValue}
            className="h-4 bg-gray-200 rounded-full overflow-hidden"
          >
            <Progress.Indicator
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-transform duration-300"
              style={{ transform: `translateX(-${100 - progressValue}%)` }}
            />
          </Progress.Root>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900">{progressValue}% completado</p>
            <p className="text-sm text-gray-600">
              {summary.audited} de {summary.total_applicable} controles auditados
            </p>
          </div>
        </div>
      </div>

      {/* Progress Timeline - placeholder visual */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Evolución del progreso de auditoría</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDays(7)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                selectedDays === 7
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setSelectedDays(30)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                selectedDays === 30
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              30 días
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => {
                const d = new Date(value);
                return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
              }}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              allowDecimals={false}
              label={{
                value: 'Controles auditados',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: '#6b7280' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value}`, 'Controles auditados']}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="audited_count"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ fill: '#2563eb', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Progress by Category */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Progreso por categoría de medidas</h3>

        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">No hay categorías disponibles para esta auditoría.</p>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.key}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{category.label}</h4>
                  <span className="text-sm text-gray-600">
                    {category.audited} de {category.total} controles revisados — {category.progress_pct}% completado
                  </span>
                </div>
                <Progress.Root
                  value={category.progress_pct}
                  className="h-3 bg-gray-200 rounded-full overflow-hidden"
                >
                  <Progress.Indicator
                    className="h-full bg-green-500 transition-transform duration-300"
                    style={{ transform: `translateX(-${100 - category.progress_pct}%)` }}
                  />
                </Progress.Root>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}