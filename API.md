# API — referencia para el frontend

Contrato HTTP de la Portfolio API. Prefijo global: **`/api`**. Sin versionado.

Documentación interactiva (esquemas OpenAPI): **`GET /api/docs`**.

Base URL local típica: `http://localhost:4000/api` (`PORT` en `.env`; `env.example` usa `4000`).

---

## Convenciones globales

### CORS y cookies

- CORS con `credentials: true`.
- `CORS_ORIGIN` debe incluir el origen exacto del frontend (varios orígenes: separados por coma).
- Toda petición que deba enviar o recibir la cookie de refresh necesita **`credentials: 'include'`** (fetch) o **`withCredentials: true`** (Axios).

```ts
await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username, password }),
});
```

### Content-Type

Bodies JSON: `Content-Type: application/json`. Query params en listados y búsqueda.

### Respuesta de éxito

Todos los endpoints envuelven el payload así:

```json
{
  "status": "ok",
  "message": "string en español",
  "data": {}
}
```

`data` puede ser `null` (logout, delete). Fechas en ISO 8601 (`2026-08-19T18:00:00.000Z`).

### Respuesta de error

El filtro global **no** usa el wrapper `status/data`. Forma fija:

```json
{
  "statusCode": 404,
  "message": "Post con slug mi-post no encontrado",
  "error": "Not Found"
}
```

`message` puede ser `string` o `string[]` (validación de class-validator).

| HTTP | Cuándo                                                                  |
| ---- | ----------------------------------------------------------------------- |
| 400  | Body/query inválido, campos extra, post incompleto al publicar          |
| 401  | Credenciales, JWT ausente/inválido/expirado, sesión de refresh inválida |
| 403  | El post no pertenece al admin autenticado                               |
| 404  | Recurso inexistente                                                     |
| 409  | Slug de post duplicado                                                  |
| 429  | Rate limit                                                              |
| 500  | Error interno (`"Error interno del servidor"`)                          |

### Validación

Pipe global: se **eliminan** propiedades no declaradas en el DTO y se **rechazan** si vienen (`forbidNonWhitelisted`). Tipos de query se convierten (`page`/`limit` llegan como string y se transforman a número).

### Rate limit

Límites globales: 3 req/s, 20/min, 200/hora. Login es más estricto (5/min y 20 cada 15 min). Mensaje 429: `Demasiadas solicitudes, intenta de nuevo más tarde`.

---

## Autenticación

Solo administradores. Login por **`username`**, no email.

| Pieza              | Dónde                                 | Uso                                               |
| ------------------ | ------------------------------------- | ------------------------------------------------- |
| Access token (JWT) | `Authorization: Bearer <accessToken>` | Todas las rutas protegidas                        |
| Refresh token      | Cookie `refresh_token`                | Solo `POST /auth/refresh` y `DELETE /auth/logout` |

Cookie `refresh_token`:

| Atributo   | Valor                                                 |
| ---------- | ----------------------------------------------------- |
| `httpOnly` | `true` (el JS del frontend **no** puede leerla)       |
| `sameSite` | `strict`                                              |
| `secure`   | `true` si `NODE_ENV=production`                       |
| `expires`  | Fecha absoluta de la sesión (no se alarga en refresh) |

TTL por defecto: JWT **15 min**; sesión de refresh **48 h** desde el login. Varias pestañas/dispositivos = varias sesiones.

Flujo recomendado:

1. `POST /auth/login` → guardar `data.accessToken` en memoria (no en `localStorage` si se puede evitar). La cookie queda sola.
2. En cada request autenticada, enviar el Bearer.
3. Si un request autenticado responde **401**, llamar `POST /auth/refresh` (con credentials) y reintentar con el nuevo `accessToken`.
4. Si el refresh también es 401, redirigir a login.
5. Logout: `DELETE /auth/logout` con Bearer **y** cookie.

El JWT **no** se renueva en cada request: solo en login y refresh.

### Rutas públicas vs protegidas

| Público (sin Bearer)          | Protegido (`JwtAuthGuard`) |
| ----------------------------- | -------------------------- |
| `POST /auth/login`            | `DELETE /auth/logout`      |
| `POST /auth/refresh` (cookie) | `/admin/posts/*`           |
| `GET /blog/*`                 | `/admin/blog/*`            |
| `GET /songs/favorite`         | `GET /songs/search`        |
|                               | `POST /songs/favorite`     |

---

## Auth

### `POST /api/auth/login`

Autentica al admin, devuelve JWT y setea cookie de refresh.

**Auth:** no. **Status éxito:** `201`.

**Body**

| Campo      | Tipo   | Requerido | Notas |
| ---------- | ------ | --------- | ----- |
| `username` | string | sí        |       |
| `password` | string | sí        |       |

```json
{
  "username": "admin",
  "password": "Admin123!"
}
```

**Response `data`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid",
    "name": "John",
    "lastName": "Doe",
    "username": "admin",
    "email": "admin@test.com"
  }
}
```

`message`: `Usuario logueado con éxito`.

**Errores**

| Status | `message`                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------ |
| 400    | `El nombre de usuario es requerido`, `La contraseña es requerida`, o mensajes `must be a string` |
| 401    | `Usuario o contraseña incorrectos` (mismo texto si falla usuario o contraseña)                   |
| 429    | Rate limit                                                                                       |

---

### `POST /api/auth/refresh`

Rota el refresh token y emite un access token nuevo. **No alarga** la fecha de expiración de la sesión.

**Auth:** cookie `refresh_token`. **Status éxito:** `201`.

**Body:** ninguno.

**Response `data`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

`message`: `Token renovado con éxito`.

**Errores**

| Status | `message`                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------- |
| 401    | `Sesión inválida, por favor inicia sesión nuevamente` — cookie ausente o malformada                     |
| 401    | `Sesión expirada, por favor inicia sesión nuevamente` — fila inexistente, expirada o secreto incorrecto |

---

### `DELETE /api/auth/logout`

Borra la fila de whitelist y limpia la cookie. Idempotente: cookie ausente/malformada no es error.

**Auth:** Bearer **obligatorio** + cookie. **Status éxito:** `200`.

**Response `data`:** `null`.  
`message`: `Sesión cerrada con éxito`.

**Errores:** `401` si el JWT no es válido.

---

## Blog público

Solo posts con `published: true`. El detalle se busca por **slug**, no por id.

### `GET /api/blog/posts`

Listado paginado, orden por fecha de publicación descendente. Full-text en español (título + contenido).

**Query**

| Param          | Tipo     | Default | Notas                              |
| -------------- | -------- | ------- | ---------------------------------- |
| `page`         | int ≥ 1  | `1`     |                                    |
| `limit`        | int 1–50 | `10`    |                                    |
| `search`       | string   | —       | Palabras clave (`plainto_tsquery`) |
| `categorySlug` | string   | —       | Filtro por slug de categoría       |

**Status éxito:** `200`.  
`message`: `Listado de posts obtenido exitosamente`.

**Response `data`**

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Mi primer post",
      "slug": "mi-primer-post",
      "excerpt": "Resumen breve…",
      "published": true,
      "publishedAt": "2026-08-01T12:00:00.000Z",
      "updatedAt": "2026-08-02T12:00:00.000Z",
      "category": {
        "id": "uuid",
        "name": "Backend",
        "slug": "backend"
      },
      "admin": {
        "name": "John",
        "lastName": "Doe"
      }
    }
  ],
  "meta": {
    "itemCount": 10,
    "totalItems": 42,
    "itemsPerPage": 10,
    "totalPages": 5,
    "currentPage": 1
  }
}
```

`category` y `admin` pueden ser `null`. El listado **no** incluye `content`, tags ni campos SEO.

**Errores:** `400` si `page`/`limit` no son enteros válidos.

---

### `GET /api/blog/posts/:slug`

Detalle de un post **publicado**. Si el slug existe pero está en borrador → `404` (igual que si no existe).

**Status éxito:** `200`.  
`message`: `Post obtenido exitosamente`.

**Response `data`**

```json
{
  "id": "uuid",
  "title": "Mi primer post",
  "slug": "mi-primer-post",
  "content": "# Markdown…",
  "excerpt": "Resumen breve…",
  "metaTitle": "Mi primer post | Portfolio",
  "metaDescription": "Descripción para buscadores",
  "ogImageUrl": "https://example.com/og.png",
  "published": true,
  "publishedAt": "2026-08-01T12:00:00.000Z",
  "createdAt": "2026-07-30T12:00:00.000Z",
  "updatedAt": "2026-08-02T12:00:00.000Z",
  "category": {
    "name": "Backend",
    "slug": "backend"
  },
  "admin": {
    "name": "John",
    "lastName": "Doe"
  },
  "tags": [{ "name": "NestJS", "slug": "nestjs" }]
}
```

En el **detalle público**, categoría y tags **no** exponen `id` (sí lo hacen en el CMS). `metaTitle`, `metaDescription`, `ogImageUrl` y `publishedAt` pueden ser `null`. `content` es markdown: el frontend lo renderiza.

**Errores**

| Status | `message`                            |
| ------ | ------------------------------------ |
| 404    | `Post con slug {slug} no encontrado` |

---

### `GET /api/blog/categories`

Todas las categorías, ordenadas por nombre.

**Status éxito:** `200`.  
`message`: `Listado de categorías obtenido exitosamente`.

**Response `data`:** `Category[]`

```json
[{ "id": "uuid", "name": "Backend", "slug": "backend" }]
```

---

### `GET /api/blog/tags`

Todos los tags, ordenados por nombre.

**Status éxito:** `200`.  
`message`: `Listado de tags obtenido exitosamente`.

**Response `data`:** `Tag[]`

```json
[{ "id": "uuid", "name": "NestJS", "slug": "nestjs" }]
```

Usar estos `id` al crear/editar posts en el CMS (`categoryId`, `tagIds`). El listado de categorías y tags es **solo público**: no hay `GET` bajo `/admin/blog`.

---

## Admin — Blog (categorías y tags)

Base: **`/api/admin/blog`**. Todas las rutas: **`Authorization: Bearer`**. No hay ownership por admin: cualquier administrador autenticado puede crear, editar o borrar taxonomía.

No hay listado ni detalle por id en este controller. Para pintar selects del CMS, usar `GET /api/blog/categories` y `GET /api/blog/tags`.

### Tipos

**`Category`**

```json
{ "id": "uuid", "name": "Backend", "slug": "backend" }
```

**`Tag`**

```json
{ "id": "uuid", "name": "NestJS", "slug": "nestjs" }
```

**Body create** (categoría y tag): `name` y `slug`, ambos string requerido, max 255.

**Body PATCH**: parcial; se pueden enviar `name`, `slug` o ambos.

---

### `POST /api/admin/blog/categories`

**Status éxito:** `201`.  
`message`: `Categoría creada exitosamente`.  
**Response `data`:** `Category`.

**Body**

```json
{
  "name": "Backend",
  "slug": "backend"
}
```

**Errores**

| Status | `message`                                                              |
| ------ | ---------------------------------------------------------------------- |
| 400    | Validación (`El nombre es requerido`, `El slug es requerido`, max 255) |
| 409    | `Ya existe una categoría con ese nombre o slug`                        |

---

### `PATCH /api/admin/blog/categories/:id`

Actualización parcial.

**Status éxito:** `200`.  
`message`: `Categoría actualizada exitosamente`.  
**Response `data`:** `Category`.

**Errores**

| Status | `message`                                       |
| ------ | ----------------------------------------------- |
| 400    | Validación o `id` que no es UUID                |
| 404    | `Categoría con id {id} no encontrada`           |
| 409    | `Ya existe una categoría con ese nombre o slug` |

---

### `DELETE /api/admin/blog/categories/:id`

Falla si hay posts con esa categoría (`ON DELETE RESTRICT`).

**Status éxito:** `200`.  
**Response `data`:** `null`.  
`message`: `Categoría eliminada exitosamente`.

**Errores**

| Status | `message`                                                        |
| ------ | ---------------------------------------------------------------- |
| 404    | `Categoría con id {id} no encontrada`                            |
| 409    | `No se puede eliminar la categoría porque tiene posts asociados` |

Antes de borrar, reasignar o eliminar los posts de esa categoría.

---

### `POST /api/admin/blog/tags`

**Status éxito:** `201`.  
`message`: `Tag creado exitosamente`.  
**Response `data`:** `Tag`.

**Body**

```json
{
  "name": "NestJS",
  "slug": "nestjs"
}
```

**Errores**

| Status | `message`                                |
| ------ | ---------------------------------------- |
| 400    | Validación                               |
| 409    | `Ya existe un tag con ese nombre o slug` |

---

### `PATCH /api/admin/blog/tags/:id`

**Status éxito:** `200`.  
`message`: `Tag actualizado exitosamente`.  
**Response `data`:** `Tag`.

**Errores**

| Status | `message`                                |
| ------ | ---------------------------------------- |
| 400    | Validación o UUID inválido               |
| 404    | `Tag con id {id} no encontrado`          |
| 409    | `Ya existe un tag con ese nombre o slug` |

---

### `DELETE /api/admin/blog/tags/:id`

Falla si el tag sigue asociado a posts (`post_tag`, FK).

**Status éxito:** `200`.  
**Response `data`:** `null`.  
`message`: `Tag eliminado exitosamente`.

**Errores**

| Status | `message`                                                  |
| ------ | ---------------------------------------------------------- |
| 404    | `Tag con id {id} no encontrado`                            |
| 409    | `No se puede eliminar el tag porque está asociado a posts` |

---

## Admin — Posts (CMS)

Base: **`/api/admin/posts`**. Todas las rutas: **`Authorization: Bearer`**. El admin solo opera sobre **sus** posts.

Si el JWT falta o es inválido: `401`.

### Tipos compartidos del CMS

**`PostDetail`** (create, get, update, publish, unpublish):

```json
{
  "id": "uuid",
  "title": "Mi primer post",
  "slug": "mi-primer-post",
  "content": "# Markdown…",
  "excerpt": "Resumen…",
  "metaTitle": "string | null",
  "metaDescription": "string | null",
  "ogImageUrl": "string | null",
  "published": false,
  "publishedAt": null,
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "category": { "id": "uuid", "name": "Backend", "slug": "backend" },
  "admin": { "name": "John", "lastName": "Doe" },
  "tags": [{ "id": "uuid", "name": "NestJS", "slug": "nestjs" }]
}
```

A diferencia del detalle público, `category` y `tags` **incluyen `id`**.

**Body de creación / campos de edición**

| Campo             | Tipo           | Create    | Update (PATCH) | Constraints                                             |
| ----------------- | -------------- | --------- | -------------- | ------------------------------------------------------- |
| `title`           | string         | requerido | opcional       | max 255                                                 |
| `slug`            | string         | requerido | opcional       | max 255, único                                          |
| `content`         | string         | requerido | opcional       | markdown                                                |
| `excerpt`         | string         | opcional  | opcional       | max 160; si se omite en create, se genera del contenido |
| `categoryId`      | UUID v4        | requerido | opcional       | debe existir                                            |
| `tagIds`          | UUID[]         | opcional  | opcional       | únicos; cada uno UUID v4                                |
| `metaTitle`       | string \| null | opcional  | opcional       | max 255                                                 |
| `metaDescription` | string \| null | opcional  | opcional       | max 255                                                 |
| `ogImageUrl`      | string \| null | opcional  | opcional       | URL válida, max 2048                                    |

PATCH es **parcial**: solo se actualizan las claves enviadas.

---

### `POST /api/admin/posts`

Crea un **borrador** (`published: false`, `publishedAt: null`). El autor es el JWT (`sub`).

**Status éxito:** `201`.  
`message`: `Post creado exitosamente`.  
**Response `data`:** `PostDetail`.

**Errores**

| Status | `message`                                   |
| ------ | ------------------------------------------- |
| 400    | Validación (`El título es requerido`, etc.) |
| 404    | `La categoría especificada no existe`       |
| 409    | `El post con el slug {slug} ya existe`      |

---

### `GET /api/admin/posts`

Posts del admin autenticado (borradores y publicados), paginados. Soporta `search` full-text. **No** filtra por `categorySlug`.

**Query:** `page` (default 1), `limit` (default 10, max 50), `search` (opcional).

**Status éxito:** `200`.  
`message`: `Listado de posts obtenido exitosamente`.

**Response `data`:** mismo shape que el listado público (`items` + `meta`). Cada ítem puede tener `published: false` y `publishedAt: null`.

---

### `GET /api/admin/posts/:id`

Detalle para edición. Busca por **UUID**, no por slug.

**Status éxito:** `200`.  
`message`: `Post obtenido exitosamente`.  
**Response `data`:** `PostDetail`.

**Errores**

| Status | `message`                                    |
| ------ | -------------------------------------------- |
| 400    | `id` no es UUID                              |
| 403    | `No tienes permiso para acceder a este post` |
| 404    | `Post con id {id} no encontrado`             |

---

### `PATCH /api/admin/posts/:id`

Actualización parcial. Se puede editar un post ya publicado (título, contenido, etc.).

**Status éxito:** `200`.  
`message`: `Post actualizado exitosamente`.  
**Response `data`:** `PostDetail`.

**Errores:** 400 validación; 403 `No tienes permiso para editar este post`; 404 post o categoría; 409 slug duplicado.

---

### `DELETE /api/admin/posts/:id`

Elimina el post y sus filas en `post_tag`.

**Status éxito:** `200`.  
**Response `data`:** `null`.  
`message`: `Post eliminado exitosamente`.

**Errores:** 403 `No tienes permiso para eliminar este post`; 404.

---

### `PATCH /api/admin/posts/:id/publish`

Publicación **idempotente**. `publishedAt` solo se setea la **primera** vez; republicar no la cambia.

**Status éxito:** `200`.  
`message`: `Post publicado exitosamente`.  
**Response `data`:** `PostDetail` con `published: true`.

**Errores**

| Status | `message`                                   |
| ------ | ------------------------------------------- |
| 400    | `No se puede publicar un post incompleto`   |
| 403    | `No tienes permiso para publicar este post` |
| 404    | Post no encontrado                          |

Tras publicar, el post aparece en `GET /blog/posts` y `GET /blog/posts/:slug`.

---

### `PATCH /api/admin/posts/:id/unpublish`

Despublicación **idempotente**. Conserva `publishedAt` original. El post deja de ser visible en el API público.

**Status éxito:** `200`.  
`message`: `Post despublicado exitosamente`.  
**Response `data`:** `PostDetail` con `published: false`.

**Errores:** 403 `No tienes permiso para despublicar este post`; 404.

---

## Songs

Hay **como máximo una** canción favorita. `POST /songs/favorite` **reemplaza** el registro si ya existía.

La búsqueda y el guardado hablan con la API de Deezer. El listado público lee solo la BD.

### `GET /api/songs/search`

Busca en Deezer (máximo **8** resultados). Protegido.

**Query**

| Param   | Tipo            | Requerido |
| ------- | --------------- | --------- |
| `query` | string no vacío | sí        |

Ejemplo: `GET /api/songs/search?query=Bohemian%20Rhapsody`

**Status éxito:** `200`.  
`message`: `Búsqueda realizada con éxito`.

**Response `data`:** array (puede estar vacío).

```json
[
  {
    "id": 3135556,
    "title": "Lose Yourself",
    "artist": {
      "id": 13,
      "name": "Eminem",
      "link": "https://www.deezer.com/artist/13"
    },
    "album": {
      "id": 302127,
      "title": "8 Mile",
      "cover": "https://cdns-images.dzcdn.net/images/cover/.../250x250-000000-80-0-0.jpg"
    },
    "link": "https://www.deezer.com/track/3135556",
    "preview": "https://cdns-preview-....dzcdn.net/stream/...mp3",
    "duration": 326
  }
]
```

Notas para UI:

- `id` del track es **number** (Deezer). Al guardar, enviarlo como **string** en `trackId`.
- `duration` está en **segundos** (en el recurso persistido es milisegundos).
- `preview` puede ser `null` (clip ~30 s cuando existe).
- Un solo `artist` (no array).

**Errores:** 400 (`El término de búsqueda es requerido`); 401; 500 si Deezer falla.

---

### `POST /api/songs/favorite`

Trae el track de Deezer y lo persiste (insert o replace). Protegido.

**Status éxito:** `201`.  
`message`: `Canción guardada con éxito`.

**Body**

```json
{
  "trackId": "3135556"
}
```

| Campo     | Tipo   | Requerido      |
| --------- | ------ | -------------- |
| `trackId` | string | sí (id Deezer) |

**Response `data`:** ver `Song` más abajo.

**Errores**

| Status | `message`                                          |
| ------ | -------------------------------------------------- |
| 404    | `Canción con id {trackId} no encontrada en Deezer` |
| 500    | `No se pudo obtener la canción desde Deezer`       |

---

### `GET /api/songs/favorite`

Canción favorita actual. **Público.**

**Status éxito:** `200`.  
`message`: `Canción obtenida con éxito`.

**Response `data` (`Song`)**

```json
{
  "id": 1,
  "trackId": "3135556",
  "trackName": "Lose Yourself",
  "artists": [
    {
      "id": "13",
      "name": "Eminem",
      "url": "https://www.deezer.com/artist/13"
    }
  ],
  "albumId": "302127",
  "albumName": "8 Mile",
  "albumCoverUrl": "https://cdns-images.dzcdn.net/images/cover/...jpg",
  "url": "https://www.deezer.com/track/3135556",
  "previewUrl": "https://cdns-preview-....dzcdn.net/stream/...mp3",
  "durationMs": 326000,
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

Diferencias vs búsqueda Deezer: `artists` es array; ids son **string**; duración en **`durationMs`**; campos `url` / `previewUrl` (no `link` / `preview`).

**Errores**

| Status | `message`                         |
| ------ | --------------------------------- |
| 404    | `No hay ninguna canción guardada` |

---

## Resumen de endpoints

| Método | Path                             | Auth            | Éxito | `data`                   |
| ------ | -------------------------------- | --------------- | ----- | ------------------------ |
| POST   | `/api/auth/login`                | —               | 201   | `{ accessToken, admin }` |
| POST   | `/api/auth/refresh`              | cookie          | 201   | `{ accessToken }`        |
| DELETE | `/api/auth/logout`               | Bearer + cookie | 200   | `null`                   |
| GET    | `/api/blog/posts`                | —               | 200   | paginado de list items   |
| GET    | `/api/blog/posts/:slug`          | —               | 200   | detalle público          |
| GET    | `/api/blog/categories`           | —               | 200   | `Category[]`             |
| GET    | `/api/blog/tags`                 | —               | 200   | `Tag[]`                  |
| POST   | `/api/admin/blog/categories`     | Bearer          | 201   | `Category`               |
| PATCH  | `/api/admin/blog/categories/:id` | Bearer          | 200   | `Category`               |
| DELETE | `/api/admin/blog/categories/:id` | Bearer          | 200   | `null`                   |
| POST   | `/api/admin/blog/tags`           | Bearer          | 201   | `Tag`                    |
| PATCH  | `/api/admin/blog/tags/:id`       | Bearer          | 200   | `Tag`                    |
| DELETE | `/api/admin/blog/tags/:id`       | Bearer          | 200   | `null`                   |
| POST   | `/api/admin/posts`               | Bearer          | 201   | `PostDetail`             |
| GET    | `/api/admin/posts`               | Bearer          | 200   | paginado (incl. drafts)  |
| GET    | `/api/admin/posts/:id`           | Bearer          | 200   | `PostDetail`             |
| PATCH  | `/api/admin/posts/:id`           | Bearer          | 200   | `PostDetail`             |
| DELETE | `/api/admin/posts/:id`           | Bearer          | 200   | `null`                   |
| PATCH  | `/api/admin/posts/:id/publish`   | Bearer          | 200   | `PostDetail`             |
| PATCH  | `/api/admin/posts/:id/unpublish` | Bearer          | 200   | `PostDetail`             |
| GET    | `/api/songs/search`              | Bearer          | 200   | hits Deezer (≤ 8)        |
| POST   | `/api/songs/favorite`            | Bearer          | 201   | `Song`                   |
| GET    | `/api/songs/favorite`            | —               | 200   | `Song`                   |

No hay endpoint de registro de administradores: el usuario inicial se carga con el seeder. Categorías y tags también se siembran, y el CMS puede crear/editar/borrarlas por `/api/admin/blog`.
