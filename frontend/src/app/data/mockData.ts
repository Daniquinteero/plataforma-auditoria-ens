// Mock data for the ENS auditing tool

export interface Audit {
  id: string;
  name: string;
  organization: string;
  category: 'BÁSICA' | 'MEDIA' | 'ALTA';
  createdAt: string;
  progress: number;
}

export interface Control {
  id: string;
  code: string;
  name: string;
  description: string;
  aplica: boolean;
  nivelObjetivo: 'BÁSICA' | 'MEDIA' | 'ALTA';
  estado: 'Pendiente' | 'En progreso' | 'Auditado';
  resultado: 'No evaluado' | 'Cumple' | 'No cumple' | 'Parcial';
  categoria: 'Marco organizativo' | 'Marco operacional' | 'Medidas de protección';
  motivoExclusion?: string;
}

export interface Question {
  id: string;
  text: string;
  nivel: 'BÁSICA' | 'MEDIA' | 'ALTA';
  answer?: 'SI' | 'NO' | 'NA';
  comment?: string;
}

export interface Evidence {
  id: string;
  controlId: string;
  controlCode: string;
  tipo: 'URL' | 'Archivo';
  descripcion: string;
  fecha: string;
  url?: string;
}

export interface Activity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

export const audits: Audit[] = [
  {
    id: '1',
    name: 'Sistema Web Corporativo',
    organization: 'Ministerio de Transformación Digital',
    category: 'MEDIA',
    createdAt: '2026-03-01',
    progress: 45,
  },
  {
    id: '2',
    name: 'Plataforma Cloud de Servicios',
    organization: 'Agencia Tributaria',
    category: 'ALTA',
    createdAt: '2026-02-15',
    progress: 75,
  },
  {
    id: '3',
    name: 'Portal de Servicios al Ciudadano',
    organization: 'Ayuntamiento de Madrid',
    category: 'MEDIA',
    createdAt: '2026-02-20',
    progress: 30,
  },
  {
    id: '4',
    name: 'Sistema Interno de Gestión',
    organization: 'Consejería de Hacienda',
    category: 'BÁSICA',
    createdAt: '2026-03-05',
    progress: 60,
  },
];

export const controls: Control[] = [
  {
    id: 'c1',
    code: 'op.nub.1',
    name: 'Protección de servicios en la nube',
    description: 'Los sistemas de información que soportan servicios en la nube deben cumplir con las medidas de seguridad pertinentes',
    aplica: true,
    nivelObjetivo: 'MEDIA',
    estado: 'Auditado',
    resultado: 'Cumple',
    categoria: 'Marco operacional',
  },
  {
    id: 'c2',
    code: 'mp.if.1',
    name: 'Áreas separadas y con control de acceso',
    description: 'Las áreas de trabajo deben estar separadas y con control de acceso físico',
    aplica: true,
    nivelObjetivo: 'BÁSICA',
    estado: 'Auditado',
    resultado: 'Cumple',
    categoria: 'Medidas de protección',
  },
  {
    id: 'c3',
    code: 'mp.if.2',
    name: 'Identificación de personas',
    description: 'Las personas que accedan a las instalaciones deben ser identificadas',
    aplica: true,
    nivelObjetivo: 'BÁSICA',
    estado: 'Auditado',
    resultado: 'No cumple',
    categoria: 'Medidas de protección',
  },
  {
    id: 'c4',
    code: 'mp.if.3',
    name: 'Protección del cableado',
    description: 'El cableado de datos y energía debe estar protegido',
    aplica: true,
    nivelObjetivo: 'MEDIA',
    estado: 'En progreso',
    resultado: 'No evaluado',
    categoria: 'Medidas de protección',
  },
  {
    id: 'c5',
    code: 'org.1',
    name: 'Política de seguridad',
    description: 'La organización debe disponer de una política de seguridad aprobada',
    aplica: true,
    nivelObjetivo: 'BÁSICA',
    estado: 'Auditado',
    resultado: 'Cumple',
    categoria: 'Marco organizativo',
  },
  {
    id: 'c6',
    code: 'org.2',
    name: 'Normativa de seguridad',
    description: 'La organización debe disponer de normativa de seguridad desarrollada',
    aplica: true,
    nivelObjetivo: 'MEDIA',
    estado: 'Pendiente',
    resultado: 'No evaluado',
    categoria: 'Marco organizativo',
  },
  {
    id: 'c7',
    code: 'org.3',
    name: 'Procedimientos de seguridad',
    description: 'La organización debe disponer de procedimientos de seguridad documentados',
    aplica: true,
    nivelObjetivo: 'MEDIA',
    estado: 'Pendiente',
    resultado: 'No evaluado',
    categoria: 'Marco organizativo',
  },
  {
    id: 'c8',
    code: 'op.acc.1',
    name: 'Identificación',
    description: 'Los usuarios deben estar identificados de forma única',
    aplica: true,
    nivelObjetivo: 'BÁSICA',
    estado: 'Auditado',
    resultado: 'Cumple',
    categoria: 'Marco operacional',
  },
  {
    id: 'c9',
    code: 'op.acc.2',
    name: 'Requisitos de acceso',
    description: 'El acceso a los sistemas debe estar controlado según requisitos definidos',
    aplica: true,
    nivelObjetivo: 'MEDIA',
    estado: 'En progreso',
    resultado: 'Parcial',
    categoria: 'Marco operacional',
  },
  {
    id: 'c10',
    code: 'op.acc.3',
    name: 'Segregación de funciones',
    description: 'Las funciones y áreas de responsabilidad deben estar segregadas',
    aplica: true,
    nivelObjetivo: 'ALTA',
    estado: 'Pendiente',
    resultado: 'No evaluado',
    categoria: 'Marco operacional',
  },
  {
    id: 'c11',
    code: 'mp.com.1',
    name: 'Perímetro seguro',
    description: 'La red debe tener un perímetro de seguridad definido',
    aplica: true,
    nivelObjetivo: 'BÁSICA',
    estado: 'Auditado',
    resultado: 'Cumple',
    categoria: 'Medidas de protección',
  },
  {
    id: 'c12',
    code: 'mp.com.2',
    name: 'Protección de la confidencialidad',
    description: 'Las comunicaciones deben proteger la confidencialidad',
    aplica: true,
    nivelObjetivo: 'MEDIA',
    estado: 'Pendiente',
    resultado: 'No evaluado',
    categoria: 'Medidas de protección',
  },
];

export const controlQuestions: Record<string, Question[]> = {
  'op.nub.1': [
    {
      id: 'q1',
      text: '¿Los sistemas de información que soportan servicios en la nube cumplen con las medidas de seguridad pertinentes?',
      nivel: 'BÁSICA',
      answer: 'SI',
      comment: 'Todos los sistemas cumplen con el catálogo de medidas aplicables',
    },
    {
      id: 'q2',
      text: '¿Están certificados los servicios en la nube suministrados por terceros?',
      nivel: 'MEDIA',
      answer: 'SI',
      comment: 'El proveedor dispone de certificación ENS y ISO 27001',
    },
    {
      id: 'q3',
      text: '¿Se ha realizado una auditoría independiente del proveedor de servicios en la nube?',
      nivel: 'ALTA',
      answer: 'NA',
      comment: 'No aplica para categoría MEDIA',
    },
  ],
  'mp.if.1': [
    {
      id: 'q4',
      text: '¿Las áreas de trabajo están físicamente separadas?',
      nivel: 'BÁSICA',
      answer: 'SI',
      comment: 'Las áreas están claramente delimitadas',
    },
    {
      id: 'q5',
      text: '¿Existe control de acceso físico a las áreas sensibles?',
      nivel: 'BÁSICA',
      answer: 'SI',
      comment: 'Control de acceso mediante tarjeta y registro',
    },
  ],
  'mp.if.2': [
    {
      id: 'q6',
      text: '¿Se identifican todas las personas que acceden a las instalaciones?',
      nivel: 'BÁSICA',
      answer: 'NO',
      comment: 'No se registra el acceso de visitantes en todas las ocasiones',
    },
  ],
};

export const evidences: Evidence[] = [
  {
    id: 'e1',
    controlId: 'c1',
    controlCode: 'op.nub.1',
    tipo: 'URL',
    descripcion: 'Certificado ENS del proveedor',
    fecha: '2026-03-10 14:30',
    url: 'https://proveedor.example.com/certificacion-ens',
  },
  {
    id: 'e2',
    controlId: 'c1',
    controlCode: 'op.nub.1',
    tipo: 'Archivo',
    descripcion: 'Informe de auditoría ISO 27001',
    fecha: '2026-03-10 15:20',
  },
  {
    id: 'e3',
    controlId: 'c2',
    controlCode: 'mp.if.1',
    tipo: 'Archivo',
    descripcion: 'Fotografías de áreas separadas',
    fecha: '2026-03-09 10:15',
  },
  {
    id: 'e4',
    controlId: 'c5',
    controlCode: 'org.1',
    tipo: 'Archivo',
    descripcion: 'Política de Seguridad aprobada',
    fecha: '2026-03-08 12:00',
  },
];

export const activities: Activity[] = [
  {
    id: 'a1',
    action: 'Respuesta añadida a op.nub.1',
    user: 'Daniel Quintero',
    timestamp: '2026-03-11 10:30',
  },
  {
    id: 'a2',
    action: 'Evidencia subida para mp.if.1',
    user: 'Daniel Quintero',
    timestamp: '2026-03-11 09:15',
  },
  {
    id: 'a3',
    action: 'Control marcado como Cumple: op.nub.1',
    user: 'Daniel Quintero',
    timestamp: '2026-03-11 08:45',
  },
  {
    id: 'a4',
    action: 'Control marcado como No cumple: mp.if.2',
    user: 'Daniel Quintero',
    timestamp: '2026-03-10 16:20',
  },
  {
    id: 'a5',
    action: 'Evidencia subida para op.nub.1',
    user: 'Daniel Quintero',
    timestamp: '2026-03-10 15:20',
  },
  {
    id: 'a6',
    action: 'Estado cambiado a En progreso: mp.if.3',
    user: 'Daniel Quintero',
    timestamp: '2026-03-10 14:10',
  },
];

export const progressData = [
  { day: 'Día 1', progress: 0 },
  { day: 'Día 2', progress: 8 },
  { day: 'Día 3', progress: 17 },
  { day: 'Día 4', progress: 25 },
  { day: 'Día 5', progress: 33 },
  { day: 'Día 6', progress: 42 },
  { day: 'Día 7', progress: 45 },
];
