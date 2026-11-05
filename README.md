# ICE RUN

Roguelike glacial de acción hecho con HTML, CSS y JavaScript sobre Canvas.
Se juega en el navegador y se empaqueta como aplicación Android con Capacitor.

## Estructura

```text
html/
├── index.html                 # Canvas, HUD, pantallas y marcado de la interfaz
├── manifest.webmanifest       # Aplicación instalable
├── sw.js                      # Service worker (offline + actualizaciones)
├── css/
│   ├── base.css               # Reset, layout responsive y controles táctiles
│   ├── hud.css                # HUD y elementos personalizables
│   ├── screens.css            # Menús, opciones y pantallas
│   ├── components.css         # Tienda, cofres, inventario y toasts
│   └── levelup.css            # Subida de nivel
├── js/
│   ├── config.js              # Datos: items, enemigos, jefes, retos, logros...
│   ├── utils.js               # Utilidades y guardado (localStorage)
│   ├── customization.js       # Sprites de personaje
│   ├── audio-input.js         # Audio, teclado, táctil y gamepad
│   ├── entities.js            # Player, Enemy, Boss y Room
│   ├── game.js                # Bucle, mapa, combate, progresión y modos
│   └── ui.js                  # Pantallas, HUD, ajustes y mando
├── player.customize/          # Sprites de personajes
└── downloads/                 # APK publicada para el botón de descarga

android/                       # Proyecto Android (Capacitor)
resources/                     # Iconos y splash
dist/                          # APK compilada
```

## Controles

- **Teclado**: `WASD` mover · ratón o dirección de movimiento para apuntar ·
  clic/`Z` ataque · `E` melee e interacción · `Q` ráfaga · `Shift` dash ·
  `F` bloqueo · `1-4` consumibles · `I` inventario · `Esc` pausa.
- **Mando**: se puede remapear botón a botón en *Opciones → Mando / Gamepad*.
- **Táctil**: joystick a la izquierda y acciones a la derecha (Android).

## HUD personalizable

En *Opciones → Personalizar HUD* (también desde *Pausa*) se puede ajustar:

- Presets **Completo**, **Compacto** e **Inmersivo**.
- Tamaño (60–120 %) y opacidad.
- Auto-ocultar el HUD cuando no hay combate (con retardo configurable).
- Mostrar u ocultar cada bloque: HP, habilidades, piso/jefe, salas, monedas,
  estadísticas, nivel/XP, consumibles y minimapa.

El HUD se oculta automáticamente mientras hay un menú abierto y se guarda en
`localStorage` junto con el resto de ajustes.

## Desarrollo local

Sirve la carpeta `html` con cualquier servidor estático:

```bash
npx serve html
```

Abre la URL indicada. (Con `file://` también funciona, pero sin service worker.)

Si sirves la carpeta raíz del proyecto, `index.html` abrirá automáticamente
el juego dentro de `html/`, sin mostrar el listado de carpetas.

## Android

```bash
npm run android:sync    # copia html/ al proyecto Android
npm run android:build   # genera dist/... y el APK de depuración
```

El APK de depuración queda en
`android/app/build/outputs/apk/debug/app-debug.apk`.

Para publicarlo en el botón **Descargar APK** del juego, copia el archivo a
`html/downloads/los-magos-del-tiempo.apk`.
