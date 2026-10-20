# Daniel Unibe · Product Designer

Portfolio interactivo en formato Game Boy Color para explorar el perfil, proyectos, experiencia y forma de trabajo de Daniel Unibe, Product Designer · UX/UI.

**[Abrir el portfolio](https://danielunibe.github.io/gameboy-portfolio/)**

## Iniciar

Desde PowerShell:

```powershell
cd "C:\Users\danie\Desktop\minecraft\gameboy-portfolio"
npm start
```

Abrir **http://127.0.0.1:4175**. Se necesita Node.js 20 o superior. No hay paquetes que instalar ni paso de compilación. `npm run dev` reinicia el servidor cuando cambia `server.mjs`. Si el puerto está ocupado, usa `$env:PORT=4176` antes de `npm start`.

## Navegación

| Estado | Controles |
| --- | --- |
| Inicio | Toca una memoria o usa ←/→ para elegirla y A/START/Enter para insertarla. |
| Menú de cartucho | Toca una opción, usa ↑/↓ para seleccionarla y A/Enter para abrirla. |
| Detalle | B/Escape vuelve al menú; ↑/↓ desplaza el contenido; SELECT alterna resumen y evidencia cuando hay evidencia disponible. |
| Menú e inicio | START cambia entre el menú del cartucho y su pantalla de inicio; EJECT expulsa el cartucho y permite elegir otro. |
| Teclado | Z confirma, X vuelve, Espacio activa START y S activa SELECT. |

En pantallas amplias, las tarjetas se seleccionan desde los rieles laterales; en móvil se agrupan en una fila compacta bajo la consola. Al insertar una SD, esta sale de su riel y entra desde arriba a la ranura. La interfaz respeta la preferencia del sistema para reducir movimiento.

## Contenido y visuales

- `projects.js` es la fuente única de los cuatro cartuchos, sus fichas y los enlaces sociales públicos. Mantén los estados, responsabilidades, métricas y enlaces dentro de lo confirmado; no agregues una demo para un producto privado.
- `assets/covers/*-voxel.webp` contiene portadas voxel de baja densidad visual, una por cartucho y con fondo sólido coordinado con su carcasa; las etiquetas quedan en una franja separada.
- `assets/social/*-voxel.webp` contiene miniaturas voxel sencillas para los cuatro enlaces sociales; cada una usa un objeto distinto y ningún retrato.
- `assets/covers/*.svg` conserva las portadas vectoriales originales.
- `assets/profile/daniel-lcd-hero.png` es la ilustración panorámica que llena la LCD en la pantalla de bienvenida; el nombre y el rol se superponen como texto accesible.
- `index.html` define la consola, la pantalla LCD y los controles accesibles.
- `style.css` define la carcasa, la composición cuadrada, las tarjetas y las vistas internas de la pantalla.
- `script.js` controla la navegación, animaciones, sonido y entrada por toque, mouse, controles y teclado.

## Verificación

```powershell
npm run check
```

La comprobación valida sintaxis JavaScript; las memorias y miniaturas enlazadas también se revisan antes de publicar.

## Despliegue en GitHub Pages

1. Haz push de los cambios a la rama `main` del repositorio `danielunibe/gameboy-portfolio` (la raíz del repo debe ser la raíz del sitio: `index.html`, `style.css`, `script.js`, `projects.js`, `favicon.svg`, `assets/`).
2. La acción `.github/workflows/pages.yml` se ejecuta automáticamente con cada push a `main`: copia los archivos estáticos a `_site` y despliega con `actions/deploy-pages`.
3. Configuración única del repositorio: **Settings → Pages → Source: GitHub Actions**.
4. El sitio queda publicado en https://danielunibe.github.io/gameboy-portfolio/. También puedes lanzar el workflow manualmente desde **Actions → Publish portfolio to GitHub Pages → Run workflow**.
