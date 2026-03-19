# ENS Audit Platform 🛡️

Plataforma web para la gestión y ejecución de auditorías conforme al **Esquema Nacional de Seguridad (ENS)**.

---

## 📌 Descripción

ENS Audit Platform es una aplicación que permite realizar auditorías de seguridad de forma estructurada, incluyendo:

- Evaluación de controles ENS
- Gestión de evidencias
- Seguimiento del progreso
- Generación automática de informes en PDF

---

## ✨ Funcionalidades

### 📋 Auditorías
- Creación y gestión de auditorías
- Configuración de categoría ENS (BÁSICA, MEDIA, ALTA)

### 🧩 Controles
- Declaración de aplicabilidad
- Estado de auditoría (Pendiente, En progreso, Auditado)
- Resultado (Cumple, No cumple, Parcial)
- Motivo obligatorio si no aplica

### ❓ Preguntas
- Evaluación por nivel ENS
- Respuestas y comentarios del auditor
- Cálculo de cumplimiento por control

### 📎 Evidencias
- Subida de archivos
- URLs y notas
- Asociación directa a controles

### 📊 Progreso
- Métricas en tiempo real
- Progreso por categorías ENS

### 📄 Informes
- Generación de PDF profesional
- Controles, preguntas, evidencias y conclusiones
- Estructura alineada con ENS

---

## 🏗️ Arquitectura

- **Frontend:** React + TypeScript + Tailwind + Radix UI  
- **Backend:** FastAPI  
- **Base de datos:** SQLite  
- **PDF:** ReportLab  

---

## 🚀 Instalación

### Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Estructura del proyecto

```
backend/
frontend/
data/
storage/
```

---

## 🎯 Objetivo

Facilitar el trabajo de:
- Auditores de seguridad
- Consultores ENS
- Equipos de cumplimiento

---

## ⚠️ Nota

Esta herramienta está diseñada como **soporte a auditorías ENS** y no sustituye certificaciones oficiales.

---

## 👨‍💻 Autor

Daniel Quintero
