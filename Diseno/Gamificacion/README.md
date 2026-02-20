# Planeación de Estrategias de Gamificación y Tracking Personal

## 1. Visión General de la Plataforma

El sistema debe diseñarse como una plataforma escalable para múltiples
juegos, no únicamente como una herramienta de sudoku.\
Los sistemas de tracking y gamificación deben ser adaptables para evitar
rediseños estructurales al agregar nuevos juegos.

------------------------------------------------------------------------

## 2. Estrategias de Gamificación

### 2.1 Sistema de Rachas

**Condición para mantener racha:** 
- Completar mínimo 1 partida válida por día. 
- Hora de corte: 4:00 AM (zona horaria del usuario).

**Hitos de racha:** 
- 3 días → Recompensa pequeña. 
- 7 días → 1 salvador de racha. 
- 14 días → paquete de experiencia( Nivel x 100) y salvador de racha. 
- 30 días → Recompensa cosmética (icono). 
- 50 días → Título especial. 
- 100 días → Insignia exclusiva. 
- Cada 100 días adicionales → Recompensa escalada.

**Salvadores de racha:** 
- Máximo acumulable: 3. 
- Se obtiene 1 cada 7 días consecutivos o en recompensas especiales. 
- No pueden usarse dos días seguidos. 
- Consumo automático al fallar un día.

**Recompensa diaria:** 

Bonus de experiencia acumulativo: +10% hasta máximo +50%.

------------------------------------------------------------------------

### 2.2 Retos Diarios

**Características:** 
- 1 reto nuevo cada día (Semilla predefinida). 
- Dificultad rotativa (Aumenta grado de dificultad cada dia).

**Recompensas:** 
- Nivel × (20--200 XP) según dificultad. 
- Bonus semanal por completar 7 retos consecutivos ( Nivel × 500 ).

------------------------------------------------------------------------

### 2.3 Eventos Temporales

**Duración:** 7, 14 o 30 días.

**Estructura:** - 10--20 niveles por evento. - Barra de progreso.

**Obtención de puntos:** 
- Partida casual → 5 puntos. 
- Victoria PVP → 15 puntos. 
- Completar reto diario → 20 puntos.

**Recompensa:**

-Bonus de experiencia +5--20% (Segun procentaje de completado alcanazdo) por la misma duracion del evento.

-Titulo si se completa al 100%

-Badge de porcentaje en caso de no completar 100%

------------------------------------------------------------------------

### 2.4 Logros e Insignias

**Logros de progreso (Fijo en el resumen de perfil):** 
- 100 partidas → Bronce. 
- 500 → Plata. 
- 1000 → Oro. 
- 5000 → Diamante.

**Logros por marcas de tiempo:** 
- Por definir

**Rarezas (Reflejado en color de badges en el perfil):** 
- Común 
- Raro 
- Épico 
- Legendario

Recompensas visuales: badges (Logros por rendimiento), títulos (Logros por progreso, racha o torneo), marcos de perfil (Logros al alcanzar ligas especificas).

------------------------------------------------------------------------

## 3. Sistema de Puntaje

### 3.1 Nivel Global

**XP por partida:**
 - Fácil → 20 XP 
 - Medio → 40 XP 
 - Difícil → 70 XP 
 - Experto → 120 XP 
 - Extremo → 200 XP 
 - Victoria PVP → +50 XP

**Progresión (Experiencia necesaria por nivel):** 

- Nivel 1--10 → Nivel × 100 XP 
- Nivel 11--30 → Nivel × 150 XP 
- Nivel 31--50 → Nivel × 250 XP 
- Nivel 50+ → Nivel × (Nivel + 250 XP)

Cap inicial: Nivel 100.

------------------------------------------------------------------------

### 3.2 Sistema ELO

El sistema competitivo asigna a todos los jugadores un ELO inicial de 1000 puntos y ajusta su puntaje tras cada partida según la diferencia frente a la probabilidad esperada de victoria, permitiendo progresión rápida al inicio y mayor estabilidad en rangos altos.

Fórmula general:
Nuevo_ELO = ELO_actual + K × (Resultado − E)
donde E = 1 / (1 + 10^((R_oponente − R_jugador) / 400))

ELO inicial: 1000 puntos.

K-factor:

< 1200 → 40 (ajustes rápidos)

1200–1800 → 30 (progresión equilibrada)

1800 → 20 (mayor estabilidad)

Primeras 10 partidas: modo provisional con pérdidas reducidas en 50% para estimar con mayor precisión el nivel real del jugador.
Esta implementacion se basa en el modelo de calculo de ELO de chess.com

------------------------------------------------------------------------

## 4. Sistema de Ligas

-   Bronce (0--999)
-   Plata (1000--1199)
-   Oro (1200--1499)
-   Platino (1500--1799)
-   Diamante (1800--2099)
-   Maestro (2100+)

Cada liga tiene 3 subdivisiones: III, II, I.

**Comportamiento de las ligas:**

-Ciclo de ligas mensual.

-Marco de icono de perfil que expone la liga actual.

-Recompensas semanales escaladas según liga.

------------------------------------------------------------------------

## 5. Juego Offline

**Disponible offline:** 
- Partidas individuales. 
- Consulta de perfil. 
- Estadísticas locales.

**No disponible:** 
- PVP. 
- Eventos.

Sincronización automática al reconectar.

------------------------------------------------------------------------

## 6. Manejo de Perfiles

**Elementos visibles:** 
- Nivel global. 
- Liga actual. 
- ELO. 
- Racha actual y récord. 
- Logros fijables/Badges (máx 6). 
- Avatar y marco.

**Dashboard:** 
- Partidas jugadas. 
- % victorias PVP. 
- Tiempo promedio. 
- Historial de ELO.

Cuenta invitado con límite de 20 partidas y conversión conservando
progreso.

## 7. Referencias

- https://www.Duolingo.com
- https://www.Chess.com 
    -  https://www.chess.com/blog/2325G/what-is-elo
