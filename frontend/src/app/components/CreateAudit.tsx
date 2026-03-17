import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import * as Select from '@radix-ui/react-select';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, ChevronDown, Lightbulb, ChevronRight } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';

import { fetchCatalogControls, createAudit } from '../../lib/api';

type CatalogControl = {
  control_id: string;
  control_title: string;
};

type ScopeControl = {
  control_id: string;
  control_title: string;
  applies: boolean;
  target_level: 'BASICA' | 'MEDIA' | 'ALTA';
  exclusion_reason: string;
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

export function CreateAudit() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [categoria, setCategoria] = useState<'BASICA' | 'MEDIA' | 'ALTA'>('MEDIA');

  const [controls, setControls] = useState<ScopeControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assistedScopeOpen, setAssistedScopeOpen] = useState(true);
  const [systemType, setSystemType] = useState<string>('');
  const [scopeAdjustments, setScopeAdjustments] = useState({
    sinInfraestructuraFisica: false,
    sinPuestosUsuario: false,
    sinSoportesFisicos: false,
    sinDesarrolloSoftware: false,
    sinComponenteWeb: false,
    sinServiciosNube: false,
    sinInterconexion: false,
    sinFirmaElectronica: false,
    sinDatosPersonales: false,
  });



  useEffect(() => {
    async function loadCatalogControls() {
      try {
        setLoading(true);
        setError(null);

        const data: CatalogControl[] = await fetchCatalogControls();

        const mapped: ScopeControl[] = data.map((control) => ({
          control_id: control.control_id,
          control_title: control.control_title,
          applies: true,
          target_level: categoria,
          exclusion_reason: '',
        }));

        setControls(mapped);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error loading catalog controls');
      } finally {
        setLoading(false);
      }
    }

    loadCatalogControls();
  }, []);

  useEffect(() => {
    setControls((prev) =>
      prev.map((control) => ({
        ...control,
        target_level: categoria,
      }))
    );
  }, [categoria]);


  const FILTER_EXCLUSIONS: Record<string, string[]> = {
    web: ['mp.if.1', 'mp.if.2', 'mp.if.3', 'mp.if.4', 'mp.if.5', 'mp.if.6', 'mp.if.7', 'mp.s.1', 'mp.s.3'],
    saas: ['mp.if.1', 'mp.if.2', 'mp.if.3', 'mp.if.4', 'mp.if.5', 'mp.if.6', 'mp.if.7'],
    internal: [],
    product: [
      'mp.if.1', 'mp.if.2', 'mp.if.3', 'mp.if.4', 'mp.if.5', 'mp.if.6', 'mp.if.7',
      'mp.per.1', 'mp.per.2', 'mp.per.3', 'mp.per.4',
      'mp.eq.1', 'mp.eq.2', 'mp.eq.3', 'mp.eq.4',
      'mp.si.1', 'mp.si.2', 'mp.si.3', 'mp.si.4', 'mp.si.5',
      'mp.s.1', 'mp.s.3'
    ],
    sinInfraestructuraFisica: ['mp.if.1', 'mp.if.2', 'mp.if.3', 'mp.if.4', 'mp.if.5', 'mp.if.6', 'mp.if.7'],
    sinPuestosUsuario: ['mp.eq.1', 'mp.eq.2', 'mp.eq.3', 'mp.eq.4', 'mp.per.1', 'mp.per.2', 'mp.per.3', 'mp.per.4'],
    sinSoportesFisicos: ['mp.si.1', 'mp.si.2', 'mp.si.3', 'mp.si.4', 'mp.si.5'],
    sinDesarrolloSoftware: ['mp.sw.1', 'mp.sw.2'],
    sinComponenteWeb: ['mp.s.2', 'mp.s.4'],
    sinServiciosNube: ['op.nub.1'],
    sinInterconexion: ['op.ext.4'],
    sinFirmaElectronica: ['mp.info.3', 'mp.info.4'],
    sinDatosPersonales: ['mp.info.1'],
  };

  const FILTER_LABELS: Record<string, string> = {
    web: 'Aplicación web',
    saas: 'SaaS / servicio en nube',
    internal: 'Sistema interno corporativo',
    product: 'Producto software entregable',
    sinInfraestructuraFisica: 'Sin infraestructura física propia',
    sinPuestosUsuario: 'Sin puestos de usuario en alcance',
    sinSoportesFisicos: 'Sin soportes físicos',
    sinDesarrolloSoftware: 'Sin desarrollo software',
    sinComponenteWeb: 'Sin componente web expuesto',
    sinServiciosNube: 'Sin uso de servicios en la nube',
    sinInterconexion: 'Sin interconexión con otros sistemas',
    sinFirmaElectronica: 'Sin firma electrónica',
    sinDatosPersonales: 'Sin datos personales',
  };

  function buildExcludedMap(
    selectedSystemType: string,
    adjustments: typeof scopeAdjustments
  ) {
    const reasonMap = new Map<string, string[]>();

    const addReason = (filterKey: string) => {
      const excludedControls = FILTER_EXCLUSIONS[filterKey] || [];
      const label = FILTER_LABELS[filterKey];
      excludedControls.forEach((controlId) => {
        const current = reasonMap.get(controlId) || [];
        reasonMap.set(controlId, [...current, label]);
      });
    };

    if (selectedSystemType) addReason(selectedSystemType);

    Object.entries(adjustments).forEach(([key, active]) => {
      if (active) addReason(key);
    });

    return reasonMap;
  }

  function applyScopeFilters(
    baseControls: ScopeControl[],
    selectedSystemType: string,
    adjustments: typeof scopeAdjustments
  ): ScopeControl[] {
    const excludedMap = buildExcludedMap(selectedSystemType, adjustments);

    return baseControls.map((control) => {
      const reasons = excludedMap.get(control.control_id) || [];
      const excluded = reasons.length > 0;

      return {
        ...control,
        applies: !excluded,
        exclusion_reason: excluded ? `Excluido por filtro: ${reasons.join(', ')}` : '',
      };
    });
  }


  
  const handleControlChange = (
    index: number,
    field: keyof ScopeControl,
    value: string | boolean
  ) => {
    const newControls = [...controls];
    newControls[index] = { ...newControls[index], [field]: value };
    setControls(newControls);
  };


  const handleSystemTypeChange = (value: string) => {
    setSystemType(value);
    setControls((prev) => applyScopeFilters(prev, value, scopeAdjustments));
  };

  const handleScopeAdjustmentChange = (key: keyof typeof scopeAdjustments) => {
    const newAdjustments = {
      ...scopeAdjustments,
      [key]: !scopeAdjustments[key],
    };

    setScopeAdjustments(newAdjustments);
    setControls((prev) => applyScopeFilters(prev, systemType, newAdjustments));
  };
  

  const handleCreate = async () => {


    const invalidExcludedControls = controls.filter(
      (control) => !control.applies && !control.exclusion_reason.trim()
    );

    if (invalidExcludedControls.length > 0) {
      setError(
        'Todas las medidas marcadas como "No aplica" deben tener un motivo de exclusión.'
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: nombre.trim(),
        org: organizacion.trim(),
        ens_category: categoria,
        controls: controls.map((control) => ({
          control_id: control.control_id,
          control_title: control.control_title,
          applies: control.applies,
          target_level: control.target_level,
          exclusion_reason: control.applies
            ? null
            : control.exclusion_reason.trim() || 'No aplica',
        })),
      };

      const created = await createAudit(payload);
      

      navigate(`/audit/${created.id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error creating audit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear nueva auditoría</h1>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la auditoría
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Sistema Web Corporativo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organización
              </label>
              <input
                type="text"
                value={organizacion}
                onChange={(e) => setOrganizacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Ministerio de Transformación Digital"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría ENS
              </label>
              <Select.Root
                value={categoria}
                onValueChange={(val: 'BASICA' | 'MEDIA' | 'ALTA') => setCategoria(val)}
              >
                <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <Select.Viewport>
                      <Select.Item value="BASICA" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>BASICA</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="MEDIA" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>MEDIA</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="ALTA" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none">
                        <Select.ItemText>ALTA</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>
        </div>




        <Collapsible.Root
          open={assistedScopeOpen}
          onOpenChange={setAssistedScopeOpen}
          className="bg-white rounded-lg shadow-sm mb-6 border-2 border-blue-100"
        >
          <Collapsible.Trigger className="w-full p-6 flex items-center justify-between hover:bg-blue-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-gray-900">Definición asistida del alcance</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Configure el tipo de sistema y condiciones para ajustar automáticamente los controles aplicables
                </p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${assistedScopeOpen ? 'rotate-90' : ''}`} />
          </Collapsible.Trigger>

          <Collapsible.Content className="border-t border-gray-200">
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">Tipo de sistema</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'web', title: 'Aplicación web', desc: 'Portal, app web, servicio HTTP/HTTPS' },
                    { id: 'saas', title: 'SaaS / servicio en nube', desc: 'Alojado completamente en cloud' },
                    { id: 'internal', title: 'Sistema interno corporativo', desc: 'Uso interno, red corporativa' },
                    { id: 'product', title: 'Producto software entregable', desc: 'Software que se distribuye a clientes' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSystemTypeChange(item.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        systemType === item.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">Ajustes de alcance</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-4">
                    Marque las condiciones que apliquen para excluir automáticamente controles no relevantes
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['sinInfraestructuraFisica', 'Sin infraestructura física propia'],
                      ['sinPuestosUsuario', 'Sin puestos de usuario en alcance'],
                      ['sinSoportesFisicos', 'Sin soportes físicos'],
                      ['sinDesarrolloSoftware', 'Sin desarrollo software'],
                      ['sinComponenteWeb', 'Sin componente web expuesto'],
                      ['sinServiciosNube', 'Sin uso de servicios en la nube'],
                      ['sinInterconexion', 'Sin interconexión con otros sistemas'],
                      ['sinFirmaElectronica', 'Sin firma electrónica'],
                      ['sinDatosPersonales', 'Sin datos personales'],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-start space-x-2">
                        <Checkbox.Root
                          id={key}
                          checked={scopeAdjustments[key as keyof typeof scopeAdjustments]}
                          onCheckedChange={() =>
                            handleScopeAdjustmentChange(key as keyof typeof scopeAdjustments)
                          }
                          className="w-4 h-4 mt-0.5 border-2 border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        >
                          <Checkbox.Indicator>
                            <Check className="w-3 h-3 text-white" />
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                        <label htmlFor={key} className="text-sm text-gray-700 cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Los controles se actualizarán automáticamente</p>
                  <p className="text-blue-700">
                    Al marcar las condiciones anteriores, los controles no aplicables se desmarcarán en la tabla inferior.
                    Podrá revisar y modificar manualmente cualquier control antes de crear la auditoría.
                  </p>
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>



        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Declaración de aplicabilidad
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Cargando controles del catálogo...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-[44%] text-left py-3 px-4 text-sm font-semibold text-gray-700 bg-gray-50">
                      Control
                    </th>
                    <th className="w-[8%] text-left py-3 px-4 text-sm font-semibold text-gray-700 bg-gray-50">
                      Aplica
                    </th>
                    <th className="w-[14%] text-left py-3 px-4 text-sm font-semibold text-gray-700 bg-gray-50">
                      Nivel objetivo
                    </th>
                    <th className="w-[34%] text-left py-3 px-4 text-sm font-semibold text-gray-700 bg-gray-50">
                      Motivo de exclusión
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map((control, index) => (
                    <tr
                      key={control.control_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono text-sm text-gray-900">{control.control_id}</div>
                        <div className="text-sm text-gray-600 mt-0.5">{control.control_title}</div>
                      </td>

                      <td className="py-3 px-4 align-middle">
                        <Checkbox.Root
                          checked={control.applies}
                          onCheckedChange={(checked) =>
                            handleControlChange(index, 'applies', checked === true)
                          }
                          className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        >
                          <Checkbox.Indicator>
                            <Check className="w-3 h-3 text-white" />
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                      </td>

                      <td className="py-3 px-4 align-middle">
                        <Select.Root
                          value={control.target_level}
                          onValueChange={(val: 'BASICA' | 'MEDIA' | 'ALTA') =>
                            handleControlChange(index, 'target_level', val)
                          }
                        >
                          <Select.Trigger
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getLevelColor(
                              control.target_level
                            )}`}
                          >
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                              <Select.Viewport>
                                <Select.Item value="BASICA" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none">
                                  <Select.ItemText>🟢 BASICA</Select.ItemText>
                                </Select.Item>
                                <Select.Item value="MEDIA" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none">
                                  <Select.ItemText>🟡 MEDIA</Select.ItemText>
                                </Select.Item>
                                <Select.Item value="ALTA" className="px-3 py-2 hover:bg-gray-100 cursor-pointer outline-none">
                                  <Select.ItemText>🔴 ALTA</Select.ItemText>
                                </Select.Item>
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={control.exclusion_reason}
                          onChange={(e) =>
                            handleControlChange(index, 'exclusion_reason', e.target.value)
                          }
                          disabled={control.applies}
                          className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 ${
                            !control.applies && !control.exclusion_reason.trim()
                              ? 'border-red-400'
                              : 'border-gray-300'
                          }`}
                          placeholder={control.applies ? '' : 'Indicar motivo...'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving || loading || !nombre.trim() || !organizacion.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Creando...' : 'Crear auditoría'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}