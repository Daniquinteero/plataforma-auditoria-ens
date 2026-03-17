import { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  User,
  Building2
} from 'lucide-react';
import { generateAuditReport, fetchAuditSummary } from '../../lib/api';


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


interface GenerateReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  audit: Audit;
}

export function GenerateReportDialog({ isOpen, onClose, audit }: GenerateReportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [sections, setSections] = useState({
    resumenEjecutivo: true,
    alcanceObjetivos: true,
    metodologia: true,
    resultadosGenerales: true,
    controlsPorCategoria: true,
    noConformidades: true,
    evidencias: true,
    recomendaciones: true,
    conclusiones: true,
    anexos: true,
  });

  const [reportConfig, setReportConfig] = useState({
    auditorName: 'Daniel Quintero',
    auditorRole: 'Auditor de Seguridad',
    reportDate: new Date().toISOString().split('T')[0],
    observations: '',
    includeDetailedControls: true,
    includeEvidence: true,
  });

  const handleSectionToggle = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleGenerate = async () => {
    try {
        setIsGenerating(true);

        const payload = {
        auditor_name: reportConfig.auditorName,
        auditor_role: reportConfig.auditorRole,
        report_date: reportConfig.reportDate,
        observations: reportConfig.observations,
        include_detailed_controls: reportConfig.includeDetailedControls,
        include_evidence: reportConfig.includeEvidence,
        sections,
        };

        const blob = await generateAuditReport(audit.id, payload);

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_auditoria_${audit.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        onClose();
    } catch (err) {
        console.error(err);
        alert('No se pudo generar el informe.');
    } finally {
        setIsGenerating(false);
    }
  };

  const selectedSectionsCount = Object.values(sections).filter(Boolean).length;

  const [summary, setSummary] = useState<any | null>(null);


  useEffect(() => {
    async function loadSummary() {
        try {
        const data = await fetchAuditSummary(audit.id);
        setSummary(data);
        } catch (err) {
        console.error(err);
        }
    }

    if (isOpen) {
        loadSummary();
    }
    }, [isOpen, audit.id]);



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-blue-600" />
            Generar informe de auditoría
          </DialogTitle>
          <DialogDescription>
            Configure las secciones y opciones del informe final de auditoría ENS
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Audit Information Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Información de la auditoría</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Sistema:</span>
                <span className="font-medium text-gray-900">{audit.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Organización:</span>
                <span className="font-medium text-gray-900">{audit.org}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Categoría:</span>
                <span className="font-medium text-gray-900">{audit.ens_category}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Progreso:</span>
                <span className="font-medium text-gray-900">{summary ? `${summary.progress_pct}%` : '...'}</span>
              </div>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Datos del informe</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auditorName" className="text-sm font-medium text-gray-700">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Auditor responsable
                </Label>
                <Input
                  id="auditorName"
                  value={reportConfig.auditorName}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, auditorName: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditorRole" className="text-sm font-medium text-gray-700">
                  Cargo
                </Label>
                <Input
                  id="auditorRole"
                  value={reportConfig.auditorRole}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, auditorRole: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportDate" className="text-sm font-medium text-gray-700">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Fecha del informe
              </Label>
              <Input
                id="reportDate"
                type="date"
                value={reportConfig.reportDate}
                onChange={(e) => setReportConfig(prev => ({ ...prev, reportDate: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>

          {/* Report Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Secciones del informe</h3>
              <span className="text-xs text-gray-500">{selectedSectionsCount} seleccionadas</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="resumenEjecutivo"
                  checked={sections.resumenEjecutivo}
                  onCheckedChange={() => handleSectionToggle('resumenEjecutivo')}
                />
                <div className="flex-1">
                  <Label htmlFor="resumenEjecutivo" className="text-sm font-medium cursor-pointer">
                    Resumen ejecutivo
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Síntesis de hallazgos principales</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="alcanceObjetivos"
                  checked={sections.alcanceObjetivos}
                  onCheckedChange={() => handleSectionToggle('alcanceObjetivos')}
                />
                <div className="flex-1">
                  <Label htmlFor="alcanceObjetivos" className="text-sm font-medium cursor-pointer">
                    Alcance y objetivos
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Definición del alcance de auditoría</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="metodologia"
                  checked={sections.metodologia}
                  onCheckedChange={() => handleSectionToggle('metodologia')}
                />
                <div className="flex-1">
                  <Label htmlFor="metodologia" className="text-sm font-medium cursor-pointer">
                    Metodología
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Procedimientos y técnicas aplicadas</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="resultadosGenerales"
                  checked={sections.resultadosGenerales}
                  onCheckedChange={() => handleSectionToggle('resultadosGenerales')}
                />
                <div className="flex-1">
                  <Label htmlFor="resultadosGenerales" className="text-sm font-medium cursor-pointer">
                    Resultados generales
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Vista general de resultados</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="controlsPorCategoria"
                  checked={sections.controlsPorCategoria}
                  onCheckedChange={() => handleSectionToggle('controlsPorCategoria')}
                />
                <div className="flex-1">
                  <Label htmlFor="controlsPorCategoria" className="text-sm font-medium cursor-pointer">
                    Controles por categoría
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Detalle de medidas evaluadas</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="noConformidades"
                  checked={sections.noConformidades}
                  onCheckedChange={() => handleSectionToggle('noConformidades')}
                />
                <div className="flex-1">
                  <Label htmlFor="noConformidades" className="text-sm font-medium cursor-pointer">
                    No conformidades
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Hallazgos de incumplimiento</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="evidencias"
                  checked={sections.evidencias}
                  onCheckedChange={() => handleSectionToggle('evidencias')}
                />
                <div className="flex-1">
                  <Label htmlFor="evidencias" className="text-sm font-medium cursor-pointer">
                    Evidencias
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Listado de evidencias recopiladas</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="recomendaciones"
                  checked={sections.recomendaciones}
                  onCheckedChange={() => handleSectionToggle('recomendaciones')}
                />
                <div className="flex-1">
                  <Label htmlFor="recomendaciones" className="text-sm font-medium cursor-pointer">
                    Recomendaciones
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Propuestas de mejora</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="conclusiones"
                  checked={sections.conclusiones}
                  onCheckedChange={() => handleSectionToggle('conclusiones')}
                />
                <div className="flex-1">
                  <Label htmlFor="conclusiones" className="text-sm font-medium cursor-pointer">
                    Conclusiones
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Conclusiones finales del auditor</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="anexos"
                  checked={sections.anexos}
                  onCheckedChange={() => handleSectionToggle('anexos')}
                />
                <div className="flex-1">
                  <Label htmlFor="anexos" className="text-sm font-medium cursor-pointer">
                    Anexos
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Documentación complementaria</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-900">Opciones adicionales</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDetailedControls"
                checked={reportConfig.includeDetailedControls}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, includeDetailedControls: checked as boolean }))
                }
              />
              <Label htmlFor="includeDetailedControls" className="text-sm cursor-pointer">
                Incluir detalle completo de cada control (preguntas y respuestas)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeEvidence"
                checked={reportConfig.includeEvidence}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, includeEvidence: checked as boolean }))
                }
              />
              <Label htmlFor="includeEvidence" className="text-sm cursor-pointer">
                Adjuntar referencias a evidencias en cada control
              </Label>
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations" className="text-sm font-medium text-gray-700">
              Observaciones finales
            </Label>
            <Textarea
              id="observations"
              placeholder="Añada cualquier observación final que desee incluir en el informe..."
              value={reportConfig.observations}
              onChange={(e) => setReportConfig(prev => ({ ...prev, observations: e.target.value }))}
              rows={4}
              className="text-sm"
            />
            <p className="text-xs text-gray-500">
              Estas observaciones aparecerán en la sección de conclusiones del informe.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isGenerating}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedSectionsCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generar informe PDF
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
