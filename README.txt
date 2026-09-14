RETO DE LOS 9 PUNTOS — V5

Esta versión añade:
- QR con IP LAN para teléfonos.
- Cronómetro sincronizado con la hora del servidor.
- Tiempo configurable por el presentador: 1, 2, 5, 8 o 10 minutos.
- Finalización automática al llegar al límite.
- Pantalla de “¡LO LOGRASTE!” al resolver antes del tiempo.
- Pantalla de tiempo terminado para quienes no completaron.
- Resultados en vivo y resumen final en el panel del presentador.
- Área de dibujo más grande, con un recuadro visual alrededor de los nueve puntos.
- Trazo con mouse, touch y stylus mediante Pointer Events.
- Detector geométrico más tolerante para la solución de cuatro segmentos, permitiendo salir del recuadro.

USO
1. En PowerShell, dentro de esta carpeta: npm install
2. Ejecuta: npm start
3. En la PC abre http://localhost:3000
4. Presentador → Crear nueva sala.
5. Los teléfonos escanean el QR; deben estar en la misma red Wi-Fi.
6. Elige el tiempo y pulsa INICIAR RETO.
7. Al agotarse el tiempo, el servidor termina la ronda automáticamente.


V7: al finalizar una ronda, los participantes que no resolvieron el reto aparecen como «NO COMPLETÓ LA TAREA» en el panel del presentador. El estado «En curso» solo se muestra mientras la ronda sigue activa. La duración se mantiene controlada por el servidor para 1, 2, 5, 8 y 10 minutos.
