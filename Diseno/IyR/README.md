# Planeación Interfaz de Juego, Reglas y Sistema de Ayudas


## 1. Visión general del módulo de juego

Para el desarrollo de este proyecto, y específicamente para la implementación de la interfaz, reglas y sistema de ayudas del Sudoku, es importante plantearlo no solo como un juego individual, sino como un módulo base reutilizable dentro de una futura plataforma de múltiples juegos.

---

## 2. Interfaz de juego

### 2.1 Estructura general

La interfaz se diseñará siguiendo principios de minimalismo funcional y claridad visual, con el fin de reducir la carga cognitiva del usuario y facilitar la resolución del tablero.

La pantalla principal del juego estará compuesta por:

- Tablero central de Sudoku 9x9
- Panel de entrada numérica
- Barra superior de información
- Acceso a ayudas
- Indicadores de progreso

Este diseño busca que el usuario pueda comprender el estado del juego en menos de 2 segundos al abrir la partida.

---

### 2.2 Tablero

El tablero es el núcleo de la experiencia de juego y debe cumplir los siguientes requisitos:

- División visual clara de subcuadros 3x3.
- Diferenciación de celdas:
  - Celdas iniciales (no editables).
  - Celdas editables.
- Resaltado automático de:
  - Fila activa
  - Columna activa
  - Subcuadro activo
  - Números iguales al seleccionado
- Feedback visual inmediato al ingresar un número.

Este sistema de resaltado reduce errores y mejora la comprensión espacial del tablero.

---

### 2.3 Panel numérico

El sistema de entrada se adaptará al dispositivo:

**En móvil**
- Teclado numérico fijo inferior.
- Botones táctiles grandes.
- Acceso rápido a borrar.

**En web**
- Panel lateral o inferior.
- Soporte de teclado físico.
- Navegación por flechas.

Ambos incluirán:

- Botón modo notas.
- Botón borrar.
- Indicador del número activo.

---

### 2.4 Barra superior

Elementos:

- Temporizador.
- Nivel de dificultad.
- Botón pausa.
- Acceso a configuración.
- Indicador de progreso del tablero.

---

### 2.5 Principios UX

La interfaz seguirá estos principios de diseño:

- Simplicidad visual.
- Consistencia multiplataforma.
- Animaciones suaves.
- Retroalimentación inmediata.
- Accesibilidad visual.
- Compatibilidad con modo oscuro.

---

### 2.6 Mejora frente a interfaces existentes

Muchas aplicaciones actuales presentan dos problemas frecuentes:

- Interfaces saturadas visualmente.
- Interfaces demasiado simples sin asistencia visual.

La propuesta busca un equilibrio mediante:

- Modo enfoque para resaltar área activa.
- Indicador de completitud.
- Confirmación visual de errores configurable.
- Diseño limpio sin elementos distractores.

---

## 3. Reglas del juego

El sistema seguirá el estándar internacional del Sudoku clásico 9x9.

---

### 3.1 Reglas básicas

1. Cada fila debe contener números del 1 al 9 sin repetirse.
2. Cada columna debe contener números del 1 al 9 sin repetirse.
3. Cada subcuadro 3x3 debe contener números del 1 al 9 sin repetirse.
4. Los números iniciales no pueden modificarse.
5. El objetivo es completar el tablero correctamente.

---

### 3.2 Modos de juego

Se plantean distintos modos configurables:

**Modo clásico**
- Sin límite de tiempo.
- Sin límite de errores.

**Modo limitado**
- Número máximo de errores permitidos.
- Fin de partida al excederlos.

**Modo competitivo**
- Sin ayudas.
- Temporizador obligatorio.
- Orientado a rankings.

---


## 3. Sistema de ayudas

El sistema de ayudas se diseña para equilibrar accesibilidad y reto, permitiendo que el juego se adapte tanto a usuarios principiantes como avanzados.

---

### 3.1 Ayudas básicas

Herramientas estándar:

- Mostrar errores automáticamente.
- Borrar errores.
- Resaltar números iguales.
- Autocompletar notas.
- Pista automática (rellenar celda correcta).

---

### 3.2 Sistema de pistas explicativas

Se propone un sistema de ayuda pedagógica que explique la lógica detrás de cada pista.

Ejemplo:

> En esta columna ya están presentes 1, 3, 5, 7 y 9. El único número posible para esta celda es el 2.

Este enfoque convierte el juego en una herramienta de aprendizaje lógico además de entretenimiento.

---

### 3.3 Configuración de ayudas

El usuario podrá personalizar:

- Activar o desactivar verificación automática.
- Limitar ayudas por partida.
- Activar modo sin asistencias.
- Activar modo entrenamiento.

---

## 4. Consideraciones de diseño escalable

El módulo se diseñará con enfoque modular para permitir:

- Reutilización de componentes UI.
- Integración futura de nuevos juegos.
- Expansión del sistema de ayudas.
- Incorporación de modos competitivos.

---

## 5. Referencias

- Easybrain. (s. f.). *Sudoku.com – Number Games*.  
- Dustland Design. (s. f.). *Sudoku – The Clean One*.  
- Microsoft. (s. f.). *Microsoft Sudoku*.  
- Nikoli Co., Ltd. (s. f.). *Sudoku rules and standards*.  
