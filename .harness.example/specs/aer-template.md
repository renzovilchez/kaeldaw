# AER-{tipo}-XXX: [Título preciso del comportamiento]

> **Requerimiento original:** _[copiar texto exacto del usuario, por mal escrito que esté]_
>
> **Tipo:** feat | fix | refactor | chore
>
> **Test:** _[ruta relativa al archivo de test principal, ej: packages/audio-engine/src/__tests__/Transport.test.ts]_

---

## Actor
¿Quién inicia la acción?
- `User` — interacción directa (click, teclado, gesto)
- `System` — el sistema inicia automáticamente (init, timer, evento interno)
- `AudioEngine` — el motor de audio (AudioContext, AudioWorklet)
- `External` — MIDI, OSC, plugin, archivo importado

## Precondiciones
Estado que debe cumplirse ANTES de que el evento tenga efecto.
Cada precondición es binaria (true/false), sin ambigüedad.

- [ ] _AudioContext.state === 'running'_
- [ ] _Transport.state === 'STOPPED'_
- [ ] _clipSeleccionado !== null_

## Evento
Qué ocurre exactamente. Una sola acción atómica.
Formato: `<Actor> <verbo> <objeto> [<detalle>]`

Ejemplo: `User clicks play button while engine is initialized`

## Respuesta
Comportamiento observable. Lista de afirmaciones exactas.

- `Transport.state` cambia de `STOPPED` a `PLAYING`
- `Clock.start()` es llamado con `BPM = store.bpm`
- El icono del botón play cambia a icono stop
- `AudioWorklet.port.postMessage({ command: 'start' })`

## Postcondiciones
Estado del sistema DESPUÉS de la respuesta.

- [ ] `Transport.state === 'PLAYING'`
- [ ] `Clock.ticks > 0`
- [ ] Playhead position avanza en rAF

## Escenarios de test (derivados del AER)

### Happy path
```
AER-XXX-01: El Actor ejecuta Evento bajo Precondiciones → Respuesta ocurre → Postcondiciones se cumplen
```

### Edge cases
```
AER-XXX-02: [variante de precondiciones]
AER-XXX-03: [variante del evento]
AER-XXX-04: [caso error]
```

---

> **Regla:** No se escribe ni una línea de código hasta que este AER esté aprobado.
> **Regla:** Los tests se escriben contra este AER, no contra la implementación.
> **Regla:** Las transiciones active→approved→passing→archive son MOVE, no copy. Nunca duplicar AER entre directorios.
