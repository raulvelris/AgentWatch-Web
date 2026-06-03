# Contrato backend — Módulo 2 (Despliegue / CI-CD)

Este documento fija el contrato que el **backend del Módulo 2** (otro repo) debe
exponer para que el frontend (`RegistroDespliegue` / `HistorialVersiones`)
funcione sin cambios. Base URL: `http://127.0.0.1:8000/api/v1` (constante
`API_URL` en `src/servicios/despliegueServicio.ts`).

Mientras el backend no exista, el frontend corre con `MODO_MOCK = true` en
`despliegueServicio.ts` (log y versiones simulados). Cuando el backend esté
listo, poner `MODO_MOCK = false`.

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
