# MLB Stats Explorer - Arquitectura y Guía de Despliegue

Este documento contiene la lógica profunda aplicada detrás de los tres pilares de este proyecto web (HTML, CSS y JavaScript) así como la guía paso a paso para subir tu código a GitHub.

---

## 1. Guía Paso a Paso para subir a GitHub

Para asegurar tu código y conectarlo mágicamente con Netlify de forma automática, usaremos **Git** y **GitHub**.

### Pre-requisitos:
1. Tener [Git instalado](https://git-scm.com/downloads) en tu computadora.
2. Tener una cuenta en [GitHub.com](https://github.com).

### Pasos:
1. **Crea el repositorio en GitHub:**
   - Entra a GitHub, presiona el botón **"New"** (Nuevo Repositorio).
   - Escribe el nombre (ej. `mlb-stats-explorer`).
   - Déjalo como "Public" o "Private". 
   - **NO** marques la casilla "Add a README file" (ya hemos creado este archivo por ti).
   - Haz clic en **Create repository**.
   
2. **Sube tu código desde la terminal:**
   - En tu computadora, abre la terminal (PowerShell o CMD) y navega a la carpeta de tu proyecto web:
     ```bash
     cd C:\projects\MLB\webapp
     ```
   - Inicia Git, agrega el código y crea un "registro" (commit):
     ```bash
     git init
     git add .
     git commit -m "Primera versión: MLB Stats Explorer con Búsqueda Universal"
     ```
   - Vincula tu computadora con el repositorio de GitHub (copia el comando que GitHub te proporciona, que se verá similar a este):
     ```bash
     git remote add origin https://github.com/TuUsuario/mlb-stats-explorer.git
     git branch -M main
     git push -u origin main
     ```

**¡Y listo!** Todo tu código estará en la nube. A partir de ahora, en **Netlify** puedes elegir "Import from GitHub", seleccionar el repositorio, poner `npm run build` como comando, y Netlify se actualizará solo cada vez que hagas push de nuevos cambios.

---

## 2. Anatomía de la Aplicación (La Lógica Interna)

Dado que has estudiado estas tecnologías, aquí te explico las decisiones técnicas más interesantes de la aplicación.

### HTML (`index.html`)
El archivo HTML fue diseñado manteniendo una sintaxis semántica y modular.
- **Estructura de Cuadrícula (Grid):** Utilizamos `<main class="content-grid">`. El contenedor principal divide la pantalla entre el panel de control (`<aside>`) y el área central de resultados (`<section>`).
- **Formularios Separados:** Tenemos dos etiquetas `<form>` independientes (`#stats-form` y `#universal-search-form`). Esto es crucial porque nos permite intervenir los eventos **"submit"** individualmente en JavaScript usando `e.preventDefault()`, logrando que al presionar la tecla *Enter* no se recargue la página, sino que lance funciones asíncronas limpias.

### CSS (`style.css`)
El CSS emplea variables dinámicas (`:root`) y el paradigma moderno de "Glassmorphism".
- **Glassmorphism:** Las cajas translúcidas (`.glass-panel`, `.player-card`) se logran gracias a la instrucción `backdrop-filter: blur(16px);` combinado con el canal alfa inverso `background: rgba(255, 255, 255, 0.03)`. Esto obliga a la tarjeta web a actuar como un lente difuminador encima de la imagen del estadio de béisbol de fondo.
- **Lógica de Cascada (Especificidad):** ¿Recuerdas el error en la versión móvil? Sucede porque las "Reglas de Media Query" (`@media (max-width: 900px)`) cambian propiedades, y en CSS, la última regla escrita "gana". Ahora las reglas móviles de posicionamiento relativo viven al final del archivo para empujar los resultados por debajo natural del formulario.
- **Micro-interacciones:** Hay animaciones `keyframes` como el `slideUp`. Para darle performance, usamos la función iteradora de Javascript `index * 0.05s` dictando a CSS que empuje las tarjetas en tipo catarata (staggering effect).

### JavaScript (`main.js`)
El núcleo funcional. Todo opera del lado del cliente (Client-Side Rendering) consumiendo una API "REST" de MLB abierta con protocolo HTTPS.

1. **Paralelización de Carga Reducida:**
   Dentro del buscador global (Búsqueda Universal de Jugador), un apellido como "Martinez" devolvería docenas de IDs. Javascript ejecuta un mapeo de datos convirtiéndolos en Array de Promesas de internet:
   ```javascript
   const promises = searchData.people.slice(0, 15).map(async (person) => {
      // fetch individual stats
   })
   const detailedResults = await Promise.all(promises);
   ```
   **La Lógica:** Usamos `Promise.all()` en un rango cortado a `slice(0, 15)`. En vez de esperar jugador por jugador (1 + 1 + 1... = 15 segundos), la computadora dispara las 15 consultas simultáneamente a los servidores de MLB y reensambla los datos en un solo bloque (~800 milisegundos).

2. **La Evasión del "Límite 100":**
   La API oficial protege su infraestructura impidiendo darte más de 100 récords (`limit=100`) a la vez. Diseñamos la función asíncrona `fetchCategory` para engañar esta restricción con programación:
   ```javascript
   for(let i=0; i<numPages; i++) {
     const offset = i * 100;
     // Fetch ?limit=100&offset=0, luego =100, =200...
   }
   ```
   Esta técnica se llama **Paginación en Cascada (Offset Pagination)**. 

3. **Terminación Anticipada (Early Exit Loop Break):**
   Dentro del mismo bucle for, le pedimos al motor de V8 (Javascript) que vigile el último resultado de cada bloque de 100. Si notas que al buscar "Hits > 3000" baja increíblemente rápido, es porque lee la página 1, analiza al jugador #100 y detecta que solo tiene 2500 hits. Como 2500 < 3000, un condicional instruye al script ejecutar un comando `break;`. Rompiendo el bucle *for* ahorramos descargar otras 9 páginas de información inútil a memoria RAM.

4. **El Enlace de las Fotos Públicas:**
   Descubrimos el patrón algorítmico del *"Content Delivery Network"* (CDN) utilizado por la liga:
   ```javascript
   const imgUrl = `.../v1/people/${p.id}/headshot/67/current`;
   ```
   La magia detrás de esto es la inyección de la variable literal `${p.id}` (el identificador que expone la API) directamente en el Source `src=` de un Tag de imagen de HTML. El navegador carga la CDN asincrónicamente y si el jugador de hace 100 años no tiene foto, el CDN devuelve la silueta por defecto evadiendo errores 404 frontales.
