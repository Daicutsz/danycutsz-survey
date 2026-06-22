# danycutsz — Sistema de Encuestas Premium

Sistema completo de recopilación y análisis de satisfacción de clientes para barbería premium. Encuesta pública + Dashboard administrativo con estadísticas en tiempo real.

---

## Estructura del proyecto

```
danycutsz-survey/
├── index.html          ← Encuesta pública (clientes)
├── admin.html          ← Dashboard administrativo
├── schema.sql          ← Schema de base de datos Supabase
├── css/
│   ├── survey.css      ← Estilos de la encuesta
│   └── admin.css       ← Estilos del dashboard
├── js/
│   ├── config.js       ← ⚙️ TU ARCHIVO DE CONFIGURACIÓN
│   ├── survey.js       ← Lógica de la encuesta
│   └── admin.js        ← Lógica del dashboard
└── pages/
    └── 404.html        ← Página de error
```

---

## Instalación paso a paso

### Paso 1 — Crear cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto. Anota el **nombre del proyecto** y elige una **contraseña de base de datos** segura.
3. Espera ~2 minutos a que el proyecto se inicialice.

### Paso 2 — Configurar la base de datos

1. En tu proyecto de Supabase, ve a **SQL Editor** (icono de terminal en el sidebar izquierdo).
2. Haz clic en **New Query**.
3. Copia el contenido completo del archivo `schema.sql` y pégalo en el editor.
4. Haz clic en **Run** (o presiona `Cmd/Ctrl + Enter`).
5. Deberías ver: `Schema instalado correctamente ✅`

### Paso 3 — Obtener credenciales de Supabase

1. En tu proyecto de Supabase, ve a **Settings → API**.
2. Copia los siguientes valores:
   - **Project URL** → algo como `https://abcdefghij.supabase.co`
   - **anon public** key → una cadena larga de texto

### Paso 4 — Configurar el archivo `js/config.js`

Abre `js/config.js` y reemplaza los valores:

```javascript
const CONFIG = {
  // ← Pega tu Project URL aquí
  SUPABASE_URL: 'https://TU_PROJECT_ID.supabase.co',

  // ← Pega tu anon key aquí
  SUPABASE_ANON_KEY: 'eyJhbGc...',

  // ← Tus barberos (edita los nombres y emojis)
  BARBERS: [
    { id: 'dany',   name: 'Dany',    emoji: '✂️' },
    { id: 'socio1', name: 'Nombre',  emoji: '💈' },
    { id: 'socio2', name: 'Nombre2', emoji: '🔥' },
  ],

  // ← Tu número de WhatsApp con código de país (sin +)
  WA_NUMBER: '5213312345678',

  // ← Contraseña del dashboard (cámbiala)
  ADMIN_PASSWORD: 'miPasswordSegura2025',
};
```

### Paso 5 — Deploy en GitHub Pages (gratis)

1. Crea una cuenta en [https://github.com](https://github.com) si no tienes una.
2. Crea un nuevo repositorio público, por ejemplo: `danycutsz-survey`.
3. Sube todos los archivos del proyecto al repositorio.
4. Ve a **Settings → Pages** en tu repositorio.
5. En **Source**, selecciona `Deploy from a branch` → `main` → `/ (root)`.
6. Haz clic en **Save**.
7. En ~2 minutos tu sitio estará en: `https://TU_USUARIO.github.io/danycutsz-survey/`

### Paso 6 — Verificar que todo funciona

Abre la URL de tu sitio y:

- [ ] La encuesta carga correctamente con el splash de danycutsz
- [ ] Puedes completar todas las preguntas sin errores
- [ ] Al enviar, aparece la pantalla de éxito
- [ ] En Supabase → Table Editor → surveys, aparece la respuesta guardada
- [ ] El dashboard en `/admin.html` carga con tu contraseña
- [ ] Las métricas y gráficas se muestran correctamente

---

## Uso diario

### Modalidad presencial (tablet/celular del barbero)

Abre el navegador en `https://tudominio.com/index.html` y entrega el dispositivo al cliente al finalizar el servicio. La encuesta tarda menos de 60 segundos.

**Tip:** Agrega el sitio a la pantalla de inicio del iPhone/Android para que abra como app nativa.

En iPhone: Safari → compartir → "Añadir a pantalla de inicio"
En Android: Chrome → menú → "Añadir a pantalla de inicio"

### Modalidad WhatsApp

Copia este texto y pégalo en tu mensaje de WhatsApp después de cada cita:

```
Hola [nombre] 👋 Gracias por tu visita a danycutsz.
¿Nos regalas 1 minuto para saber cómo te fue?
👉 https://tudominio.com/index.html
```

### Acceso al dashboard

Ve a `https://tudominio.com/admin.html` e ingresa tu contraseña configurada en `config.js`.

---

## Personalización frecuente

### Agregar o quitar barberos

Edita el array `BARBERS` en `js/config.js`:

```javascript
BARBERS: [
  { id: 'dany',  name: 'Dany',  emoji: '✂️' },
  { id: 'marco', name: 'Marco', emoji: '💈' },
  // Agrega más aquí...
],
```

### Cambiar la contraseña del admin

```javascript
ADMIN_PASSWORD: 'NuevaContraseña2025',
```

### Cambiar el cooldown anti-spam

```javascript
COOLDOWN_SECONDS: 60, // 60 segundos entre encuestas del mismo dispositivo
```

---

## Funciones del Dashboard

| Sección | Qué muestra |
|---|---|
| **Resumen** | KPIs generales, 5 gráficas, métricas clave |
| **Respuestas** | Tabla completa con buscador, todos los campos |
| **Barberos** | Ranking y métricas individuales por barbero |
| **Insights** | Análisis automáticos con alertas y observaciones |

### Exportación de datos

Desde el top bar del dashboard:
- **Excel** → Archivo `.xlsx` con todos los campos, listo para análisis
- **CSV** → Compatible con Google Sheets, Excel, cualquier herramienta
- **PDF** → Reporte ejecutivo con métricas y comentarios destacados

### Filtros de fecha

Usa los botones `7 días / 30 días / 90 días / Todo` para filtrar el período que quieres analizar. Todos los KPIs, gráficas e insights se actualizan en tiempo real.

---

## Modo demo (sin Supabase)

Si `SUPABASE_URL` contiene `TU_PROJECT`, el sistema funciona en **modo demo**:
- Las respuestas se guardan en `localStorage` del navegador.
- El dashboard genera 40 respuestas ficticias automáticamente para previsualizar.
- Útil para probar el sistema antes de configurar Supabase.

---

## Soporte técnico

Para dudas técnicas sobre este sistema, revisa primero:
- Consola del navegador (`F12 → Console`) para errores de JavaScript
- Supabase → Logs para errores de base de datos
- GitHub Pages → Actions para errores de deploy

---

*danycutsz Survey System · Construido para producción · 2025*
