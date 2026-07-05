# Contrato backend — Módulo 2 (Despliegue / CI-CD)

Este documento fija los contratos de API que el **backend del Módulo 2**
(`AgentWatch-Backend`) expone y que los componentes del frontend
(`RegistroDespliegue`, `HistorialVersiones`, `PanelAmbientes`) consumen.

**Base URL:** `http://127.0.0.1:8000/api/v1` — configurable vía variable de
entorno `VITE_API_URL` (ver `.env.example`).

**Modo demo offline:** la variable `VITE_MODO_MOCK=true` activa fixtures
simulados en `despliegueServicio.ts` y `ambientesServicio.ts`, sin llamadas al
backend. El valor por defecto (`false` o ausente) usa el backend real. El
backend está **conectado y funcionando** desde la integración de mayo 2026.

---

## RF05 — Despliegue con log en vivo (SSE sobre POST)

```
POST /api/v1/agents/{id}/deploy
```

**Por qué POST + SSE leído con `fetch`:** el `EventSource` del navegador solo
hace `GET` (sin body ni headers). El frontend dispara el deploy con un único
`POST` y lee el stream del *response body* con `fetch` + `ReadableStream`,
parseando el framing SSE a mano. Por eso el backend debe responder al **mismo
POST** con un stream `text/event-stream` (no se usa un endpoint GET aparte).

**Request**

- Body opcional: `{}` (reservado para opciones de despliegue futuras).

**Response**

```
200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no      # CRÍTICO si hay nginx/proxy delante: sin esto el log NO sale en vivo
```

Cuerpo: frames SSE, **un evento por frame**, separados por una línea en blanco.
El cliente tolera tanto `\n\n` (LF) como `\r\n\r\n` (CRLF).

```
data: {"fase":"queued","mensaje":"Despliegue encolado."}

data: {"fase":"build","mensaje":"Construyendo imagen Docker..."}

data: {"fase":"push","mensaje":"Subiendo imagen al registry..."}

data: {"fase":"deploy","mensaje":"Desplegando contenedor..."}

data: {"fase":"healthcheck","mensaje":"Verificando salud..."}

data: {"fase":"done","mensaje":"Despliegue completo","url":"https://agente-xyz.run.app","salud":"healthy","estado":"success"}
```

En fallo terminal (el cliente lo trata como error y muestra "Reintentar"):

```
data: {"fase":"error","mensaje":"Build falló: ...","estado":"failed"}
```

o bien un frame final `done` con `estado: "failed"` (también tratado como fallo).

**Reglas que el backend debe cumplir**

- Hacer flush por línea (no bufferizar): `yield f"data: {json.dumps(evento)}\n\n"`.
  En FastAPI: `StreamingResponse(generador(), media_type="text/event-stream")`.
- Emitir **siempre** un frame terminal (`fase: "done"` o `fase: "error"`) antes
  de cerrar. Si el stream se cierra sin frame terminal, el frontend lo reporta
  como "la conexión se cerró antes de finalizar".
- El frame `done` trae `url` (string), `salud` (`"healthy" | "unhealthy"`) y
  `estado` (`"success" | "failed"`).

**Tipo TS (`src/types/Despliegue.ts`)**

```ts
type FaseDespliegue = "queued" | "build" | "push" | "deploy" | "healthcheck" | "done" | "error";
type EstadoSalud = "healthy" | "unhealthy";
type EstadoDespliegue = "success" | "failed";

interface EventoDespliegue {
  fase: FaseDespliegue;
  mensaje: string;
  timestamp?: string;
  url?: string;        // solo en "done"
  salud?: EstadoSalud; // solo en "done"
  estado?: EstadoDespliegue;
}
```

---

## RF07 — Historial de versiones

```
GET /api/v1/agents/{id}/versions
```

**Response** `200 OK`, JSON. La lista llega **envuelta** en la clave `versions`
(igual que `templates` / `agents` / `reports` en el resto del API):

```json
{
  "versions": [
    {
      "id": "v-3",
      "numero": 3,
      "fecha": "2026-05-30 14:22",
      "autor": "enzo.ordonez",
      "hash_sha256": "9f2c1a7b...81",
      "estado": "activa"
    }
  ]
}
```

Si el cuerpo no trae `versions` como array, el frontend degrada a lista vacía
(estado "sin versiones") en vez de romper.

**Tipo TS (`src/types/Version.ts`)** — snake_case para calzar con el JSON del backend:

```ts
type EstadoVersion = "activa" | "inactiva" | "rollback";

interface Version {
  id: string;
  numero: number;
  fecha: string;
  autor: string;
  hash_sha256: string;
  estado: EstadoVersion;
}
```

---

## RF07 — Rollback

```
POST /api/v1/agents/{id}/rollback/{versionId}
```

**Response** `200 OK`, JSON: `{ "ok": true }`.

Tras un rollback exitoso el frontend recarga `GET /versions`, por lo que el
backend debe dejar la versión objetivo como `activa` y la anterior activa como
`rollback` (o `inactiva`, según la política del backend).

---

## RF06 — Ambientes, promotion y outbox de notificaciones

### Listar ambientes disponibles

```
GET /api/v1/agents/environments
```

**Response** `200 OK`:

```json
{ "environments": ["dev", "staging", "prod"] }
```

El frontend usa esta lista para renderizar las tres tarjetas de ambiente en
`PanelAmbientes`. El orden es siempre `dev → staging → prod`.

---

### Solicitar promoción entre ambientes

```
POST /api/v1/agents/{id}/promote
Content-Type: application/json
```

**Body:**

```json
{
  "ambiente_origen": "dev",
  "ambiente_destino": "staging",
  "solicitante": "usuario@demo.com",
  "rol_solicitante": "DEVELOPER"
}
```

`rol_solicitante` acepta `"ADMIN"` o cualquier otro valor (tratado como no-admin).
Este campo es un **stub temporal** (HU-06): cuando el Módulo 4 (RF13) emita JWT,
el rol saldrá de los claims del token en el header `Authorization: Bearer`. No
enviar un token inválido — sin el header, el backend usa `rol_solicitante` del
body; con un token inválido devuelve `401`.

**Reglas del backend:**

- `ambiente_destino` no en `{dev, staging, prod}` → `400`
- `ambiente_destino == "prod"` y rol ≠ `"ADMIN"` → `403` con `detail` en español
- Rol `"ADMIN"` → `estado: "aprobada"`, `aprobado_por` = solicitante
- Rol no-admin → `estado: "pendiente"`, encola notificación al ADMIN
- Una promoción `aprobada` mueve la config del agente: copia (upsert) sus
  variables de entorno del `ambiente_origen` al `ambiente_destino`. Sobrescribe
  las de igual nombre y conserva las que el destino tuviera aparte. El valor no
  se altera en el traslado (RF06, "mover la configuración sin modificaciones").
  Nota: la config base del agente (Módulo 1) no es por-ambiente y no se mueve
  aquí; lo que se mueve son las variables por ambiente del Módulo 2.

**Response** `200 OK`:

```json
{
  "ok": true,
  "promotion": {
    "agent_id": "uuid-del-agente",
    "ambiente_origen": "dev",
    "ambiente_destino": "staging",
    "solicitante": "usuario@demo.com",
    "aprobado_por": null,
    "estado": "pendiente",
    "fecha": "2026-06-14T17:24:35+00:00"
  }
}
```

**Atención:** `promotion` **no trae `id`**. El frontend usa índice de array como
key en la tabla del historial.

**Errores:** el cuerpo de error trae `{ "detail": "<mensaje>" }`. El frontend
muestra ese string directamente como error inline en el formulario.

**Tipo TS (`src/types/Ambiente.ts`):**

```ts
type EstadoPromocion = "aprobada" | "pendiente" | "expirada";

interface Promocion {
  agent_id: string;
  ambiente_origen: string;
  ambiente_destino: string;
  solicitante: string;
  aprobado_por: string | null;
  estado: EstadoPromocion;  // literales en español, exactos del backend
  fecha: string;            // ISO-8601 UTC
}
```

---

### Historial de promociones

```
GET /api/v1/agents/{id}/promotions
```

**Response** `200 OK`:

```json
{ "promotions": [ /* array de objetos Promocion, sin `id` */ ] }
```

Ordenado por `id` de DB (ascendente = cronológico). El backend evalúa
**expiración lazy** en esta llamada: cualquier promotion `pendiente` con más de
24 horas pasa a `expirada` antes de responder.

El frontend infiere el ambiente activo del agente desde el `ambiente_destino` de
la última promotion con `estado === "aprobada"` (la de mayor índice). Si no hay
ninguna aprobada, el agente está en `"dev"`.

---

### Outbox de notificaciones

```
GET /api/v1/notifications/?agent_id={id}
```

Query params opcionales adicionales: `destinatario_rol`, `tipo`.

**Response** `200 OK`:

```json
{
  "notifications": [
    {
      "id": 1,
      "tipo": "promotion_pendiente",
      "destinatario_rol": "ADMIN",
      "mensaje": "Promoción (dev -> staging) solicitada por ...; espera aprobación (expira en 24h).",
      "agent_id": "uuid-del-agente",
      "fecha": "2026-06-14T17:24:35+00:00"
    }
  ]
}
```

`tipo` puede ser `"promotion_pendiente"`, `"promotion_expirada"` o
`"deploy_fallido"`. Este outbox es un **sustituto etiquetado** del sistema de
email/push real, que llegará con el Módulo 6. El frontend lo muestra como
sección colapsable "Notificaciones encoladas — pendientes de entrega por M6".

**Tipo TS (`src/types/Ambiente.ts`):**

```ts
type TipoNotificacion = "promotion_pendiente" | "promotion_expirada" | "deploy_fallido";

interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  destinatario_rol: string;
  mensaje: string;
  agent_id: string | null;
  fecha: string;
}
```

---

### Variables de entorno por ambiente (cifradas con Fernet)

RF06/ADR-02.6. Cada agente tiene variables independientes por ambiente,
**cifradas con Fernet** (stand-in local de Azure Key Vault). La BD solo almacena
ciphertext y la API solo devuelve valores **enmascarados** — nunca el texto
plano (EC-02.5). La clave de cifrado vive fuera de la BD en `ENVVARS_KEY`.

#### Listar variables (enmascaradas)

```
GET /api/v1/agents/{id}/environments/{env}/vars
```

`env` ∈ `{dev, staging, prod}` (otro valor → `400`).

**Response** `200 OK`:

```json
{ "vars": { "OPENAI_KEY": "sk-***", "DATABASE_URL": "post***" } }
```

Valores enmascarados (primeros 4 caracteres + `***`). Sin variables: `{ "vars": {} }`.

#### Guardar/actualizar variables (upsert, cifrado)

```
PUT /api/v1/agents/{id}/environments/{env}/vars
Content-Type: application/json
```

**Body:**

```json
{ "vars": { "OPENAI_KEY": "sk-valor-real", "DATABASE_URL": "postgresql://..." } }
```

Cada variable se guarda **cifrada con Fernet**; sobrescribe la combinación
`(agent_id, env, nombre)` si ya existe. `env` inválido o `vars` que no sea
objeto → `400`.

**Response** `200 OK`:

```json
{ "ok": true, "guardadas": 2 }
```

#### Eliminar una variable

```
DELETE /api/v1/agents/{id}/environments/{env}/vars/{nombre}
```

**Response** `200 OK`: `{ "ok": true }`. Variable inexistente → `404`.

**Tipo TS (`src/servicios/ambientesServicio.ts`):**

```ts
interface VarsAmbiente {
  [nombre: string]: string; // valor enmascarado: "sk-***"
}
```

> **EC-02.5 (demo):** un `SELECT valor_cifrado FROM agent_env_vars` en vivo
> devuelve un token Fernet (`gAAA...`), nunca el secreto en texto plano.

---

### Pendiente de implementación en backend (stubs honestos en UI)

Las siguientes funcionalidades de HU-06 son **infraestructura de producción** y
se muestran en el frontend como badges `⚠ STUB`:

- **Azure Key Vault** (HU-06 CA-02): el almacén gestionado de secretos de
  producción (ADR-02.4). En el prototipo, el cifrado de variables por ambiente
  ya está implementado con **Fernet local** (ver sección anterior); Key Vault
  reemplaza a Fernet cuando exista la suscripción, sin cambiar el contrato.
- **Kubernetes namespaces** (HU-06): los ambientes `dev/staging/prod` son hoy
  etiquetas en SQLite, no namespaces reales de K8s.

---

## RF08 — Pipeline CI/CD

Los workflows de GitHub Actions están definidos en
`AgentWatch-Backend/.github/workflows/` (el backend es su propio repositorio
git). Los 4 archivos existen y son YAML válido:

| Archivo | Disparador | Estado |
|---|---|---|
| `ci.yml` | PR y push a `develop` | lint (ruff) + tests + Semgrep + docker build — **pasos REALES** |
| `deploy-staging.yml` | Push a `develop` | docker build real; deploy Azure **SIMULADO** (`echo`) |
| `deploy-prod-canary.yml` | `workflow_dispatch` o tag `v*` | canary 10→50→100% **SIMULADO** (`echo`) |
| `demo-pipeline.yml` | `workflow_dispatch` (manual) | lint + tests — **REAL**, solo para demo grabada |

Los pasos SIMULADOS llevan el sufijo `(SIMULADO)` en su `name` y el comando
real `az`/`kubectl` comentado junto al `echo`, para que sea claro qué falta
cuando existan credenciales Azure.

Ver `AgentWatch-Backend/PIPELINE.md` para la documentación completa del flujo y
las decisiones de diseño (ADRs).
