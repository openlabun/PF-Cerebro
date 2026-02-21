# Planteamiento y planeación PVP - Cerebros

## 1. Introducción

El modo PvP permite que dos jugadores se enfrenten en tiempo real resolviendo el mismo puzzle de Sudoku, generado a partir de una semilla compartida. Gana quien lo complete primero o quien acumule mayor puntaje al finalizar el tiempo límite de la partida.
La validación del estado del tablero se realiza del lado del servidor para garantizar integridad y evitar trampas.

Este documento describe el módulo PvP pensado para el juego Sudoku dentro del proyecto.

## 2. Objetivos

Implementar un modo Jugador vs Jugador, sólido y auditable que permita:
- Partidas simultáneas (misma semilla) tipo race.
- Retos asíncronos.
- Implementación de ELO (Sistema de ranking)
- Validación server-side

## 3. Modos de juego
3.1. Duelo en tiempo real 1v1 (simultáneo)
  - Ambos jugadores reciben el mismo tablero y juegan a la vez.
  - Gana: primero en terminar correctamente o quien tenga más celdas correctas al acabar tiempo.
  - Ideal para partidas rápidas y emociones competitivas.
3.2. Asíncrono / Por turnos (1v1 o multijugador)
  - Jugador A completa su turno, luego B; se comparan tiempos/errores.
  - Útil cuando la simultaneidad no es posible (zonas horarias distintas).
3.3. Torneos estructurados
  - Eliminatorias, rondas múltiples con tableros distintos y seed compartido para garantizar igualdad.
  - Recompensas por posición (monedas, trofeos, ELO-like ranking).
## 4. Reglas y sistema de puntuación sugeridos
- Puntos por celda correcta: +1 punto por celda correctamente completada.
- Penalización por error: −1 o −0.5 por error (ajustable).
- Bonos por streak: +bonus por racha de celdas correctas sin errores.
- Tiempo como factor secundario: desempate por menor tiempo total.
- Finalización: terminar el puzzle correctamente otorga un multiplicador (p. ej. *1.5).
## 5. Matchmaking y rankings
- Rangos/ELO: utilizar ELO o Glicko para 1v1; dividir en ligas.
- Matchmaking rápido: prioridad por rango similar ±1 liga; fallback a bots si espera > X segundos.
- Seed compartido: generar puzzle mediante semilla aleatoria que se envía a ambos jugadores para garantizar tableros idénticos.
## 6. Anti-cheat y fairplay
- Server-side validation: todas las jugadas deben validarse en servidor (no confiar en el cliente).
- Seed-based puzzles: el servidor genera la solución y la semilla; el cliente solo muestra.
- Rate limits / heurísticas: detectar entradas humanas imposibles (velocidades de completado muy altas, patrones repetitivos).
- Detección de bots: analizar timing, patrones y desviaciones; aplicar mecanismos de verificación si hay sospecha.
- Replay audit: almacenar replays para revisión manual/automática.
- Integridad de paquete: firmar/sincronizar estado para evitar manipulación del cliente.
## 7. Conclusion
El modo PvP propuesto para Cerebros Sudoku busca transformar la experiencia clásica del Sudoku en un entorno competitivo, justo y dinámico. A través de partidas simultáneas, retos asíncronos y torneos estructurados, se ofrece una variedad de formatos que se adaptan tanto a jugadores casuales como a quienes buscan un desafío más serio.
La implementación de un sistema de puntuación basado en precisión, rachas y tiempo, junto con un ranking tipo ELO, permite medir el desempeño de manera progresiva y motivar la mejora constante. Además, el enfoque en validación server-side y mecanismos anti-cheat garantiza integridad, equidad y confianza en cada partida.
En conjunto, este módulo PvP sienta una base sólida y escalable para expandir el proyecto hacia una comunidad competitiva, fomentando el fairplay y la emoción de resolver puzzles en tiempo real contra otros jugadores.
## 8. Referencias

- **UsDoku** (Web)  
  - https://usdoku.com  
  - https://www.producthunt.com/products/usdoku  

- **SudokuFriends** (Web)  
  - https://www.sudokufriends.io/  

- **SudokuVersus** (Web)  
  - https://sudokuversus.com/  
  - https://www.reddit.com/r/sudoku/comments/1j60fha/sudokuversus_two_player_challenge/  

- **Sudoku VS** (App)  
  - https://play.google.com/store/apps/details?id=com.saltd.sudoku  

- **Sudoku Friends+** (App)  
  - https://play.google.com/store/apps/details?id=com.sudokufriends.app  
