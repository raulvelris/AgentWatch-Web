# AgentWatch

Plataforma para diseñar, gobernar, desplegar y observar agentes de IA dentro de
una empresa. Proyecto del curso Arquitectura de Software (Universidad de Lima,
Grupo 3, 2026).

Este repositorio es el **frontend web**. El sistema completo son tres
aplicaciones que se conectan a una misma API.

## El equipo (Grupo 3)

El proyecto se plantea como una empresa: cada integrante lleva un rol de negocio y
es dueño de un área técnica del sistema.

| Integrante | Rol | Área del sistema |
|---|---|---|
| Gabriel Crisóstomo | CEO | Observabilidad, Audit Trail y Métricas de Negocio (RF17–RF20) |
| Rodrigo Urquizo | CTO | Ejecución Serverless, Motor de Políticas y Costos (RF09–RF12) |
| José Huari | CISO | Seguridad, Identidad y Multi-Tenant (RF13–RF16) |
| Gerson León | Líder QA | Diseño, Configuración y Gobernanza de Agentes (RF01–RF04) |
| Enzo Ordóñez | COO | Despliegue, Ambientes y CI/CD (RF05–RF08) |
| Raúl Velazco | CFO | Cliente Móvil y Alertas Multicanal (RF21–RF24) |

## Arquitectura

Tres repositorios, una sola API:

- **AgentWatch-Backend** — la API (FastAPI + SQLite/SQLAlchemy). Monta todos los
  módulos en un proceso. Es el corazón del sistema.
- **AgentWatch-Web** — este repo. React + TypeScript + Vite.
- **AgentWatch-Mobile** — cliente móvil en Expo / React Native.

La documentación de arquitectura (caso de negocio, requisitos, QAW, ADD, diagramas
C4) vive aparte, en el repositorio `arqui261-grupo3`.

## Qué hay en este frontend

Dos páginas independientes:

- **Estudio de agentes** (`index.html`): creación de agentes con un wizard,
  plantillas, políticas de gobernanza, auditoría y vistas de observabilidad.
- **Despliegue y CI/CD** (`despliegue.html`): despliegue con log en vivo (SSE),
  historial de versiones con rollback, ambientes dev/staging/prod con promoción, y
  variables de entorno cifradas por ambiente.

Las acciones que cambian estado (desplegar, promover, guardar variables) exigen
iniciar sesión. El backend valida un JWT y aplica control de acceso por rol
(ADMIN / VIEWER): un ADMIN pasa, un VIEWER puede pedir promociones a staging pero
no a prod, y no puede tocar secretos.

## Cómo correrlo

Requisitos: Node 20 o superior. Para el sistema completo, además el backend
levantado.

Frontend:

```bash
npm install
npm run dev
```

Por defecto apunta al backend en `http://127.0.0.1:8000` (configurable con
`VITE_API_URL`). Para probar sin backend, con datos simulados, poné
`VITE_MODO_MOCK=true` en un archivo `.env`.

Backend (en el repo `AgentWatch-Backend`):

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Con el backend arriba y `VITE_MODO_MOCK=false`, entrá a la página de despliegue,
iniciá sesión con un usuario de demo (`admin_a` para ADMIN, `viewer_a` para
VIEWER) y probá el ciclo completo: desplegar, versionar, promover a prod y guardar
variables cifradas.

## Estado del proyecto

Es un prototipo académico. Varias piezas de infraestructura de producción están
simuladas y marcadas como tal en la propia interfaz (badges `STUB`, pasos
`SIMULADO`): el pipeline de despliegue real, Azure Key Vault (reemplazado por
cifrado Fernet local), los namespaces de Kubernetes. Lo que está implementado
funciona de punta a punta y tiene pruebas automatizadas en el backend.
