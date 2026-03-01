# CEREBRO

Plataforma de Juegos de Desafío Mental

---

## 1. Introducción

CEREBRO es una plataforma digital orientada a juegos de desafío mental, iniciando con Sudoku como juego base. La solución contempla dos canales de acceso principales: una aplicación web y una aplicación móvil, ambas conectadas a un backend centralizado basado en arquitectura de contenedores.

El proyecto busca integrar juego individual, progresión gamificada y competencia estructurada en una experiencia multiplataforma coherente, escalable y reproducible.

---

## 2. Planteamiento del Problema

Existen múltiples aplicaciones de Sudoku y juegos mentales; sin embargo, muchas presentan limitaciones como:

* Experiencias aisladas sin integración entre web y móvil.
* Ausencia de progresión estructurada del usuario.
* Gamificación limitada o inexistente.
* Escasas modalidades competitivas organizadas.
* Sistemas de ranking poco desarrollados o no integrados.

Se requiere una plataforma integral que combine desafío mental, progresión personal y competencia estructurada bajo una arquitectura moderna y escalable.

---

## 3. Restricciones y Supuestos de Diseño

### Restricciones

* Desarrollo bajo enfoque MVP.
* Arquitectura basada en contenedores.
* Backend único compartido entre aplicaciones web y móvil.
* Separación de ambientes de desarrollo, pruebas y producción.
* Validación server-side para partidas competitivas.
* Definición formal de contratos de API.

### Supuestos

* El sistema inicia con Sudoku como único juego base.
* Los usuarios contarán con conectividad a internet.
* Se utilizará un esquema de despliegue reproducible.
* El equipo se distribuye entre backend, web y móvil.

---

## 4. Alcance

### Gestión de Usuarios

* Registro e inicio de sesión.
* Perfil público con alias y avatar.
* Preferencias de usuario.

### Juego Base – Sudoku

* Selección de dificultad.
* Generación y validación de tableros.
* Guardado y recuperación de partidas.
* Sistema de pistas limitadas.

### Progresión y Gamificación

* Sistema de experiencia y niveles.
* Logros por desempeño.
* Misiones diarias y semanales.
* Recompensas cosméticas.

### Competitivo

* Modo PvP con mismo tablero para ambos jugadores.
* Sistema de torneos con inscripción.
* Estructura por brackets o sistema suizo simple.
* Clasificación automática de resultados.

### Rankings y Métricas

* Ranking global.
* Ranking por temporada.
* Ranking específico por torneo.

### DevOps

* Despliegue reproducible mediante contenedores.
* Integración continua.

---

## 5. Objetivos

### Objetivo General

Diseñar e implementar un producto funcional de la plataforma CEREBRO centrado en juegos de desafío mental.

### Objetivos Específicos

* Implementar gestión de usuarios y autenticación.
* Desarrollar sistema de progresión con gamificación.
* Construir emparejamiento PvP y organización de torneos.
* Incorporar analítica básica y rankings.
* Garantizar despliegue reproducible mediante contenedores.

---

## 6. Estado del Arte y Soluciones Relacionadas

### 6.1 Gamificación

La gamificación se basa en mecánicas como niveles, puntos de experiencia, logros, misiones periódicas y recompensas virtuales. Plataformas educativas y de entretenimiento han demostrado que estos elementos incrementan la retención y el compromiso del usuario.

Ejemplos relevantes:

* Duolingo
* Khan Academy
* Sistemas de progresión en videojuegos competitivos

---

### 6.2 Modo Torneos

Las plataformas competitivas digitales implementan estructuras como:

* Eliminación directa
* Sistema suizo
* Temporadas clasificatorias
* Rankings por puntos acumulados

Ejemplos:

* Chess.com
* Plataformas de eSports

---

### 6.3 Sudoku Digital

Las aplicaciones modernas de Sudoku incluyen:

* Generación automática de tableros.
* Validación de soluciones.
* Diferentes niveles de dificultad.
* Sistemas de ayuda o pistas.

Ejemplos:

* Sudoku.com
* WebSudoku

---

### 6.4 PvP Digital

El modo jugador contra jugador en entornos digitales suele incorporar:

* Mismo escenario para ambos jugadores.
* Validación en servidor.
* Determinación de ganador por tiempo o puntaje.
* Sistemas anti-trampa.

Ejemplos:

* Plataformas de ajedrez online.
* Juegos de trivia en tiempo real.

---

## 7. Propuesta de Solución

La solución se basa en una arquitectura de microservicios desplegada en contenedores, con un backend centralizado que provee servicios a clientes web y móvil.

Componentes principales:

* Backend API REST documentada.
* Base de datos persistente.
* Aplicación web.
* Aplicación móvil.
* Sistema de autenticación.
* Servicios de ranking y métricas.
* Pipeline de integración continua.

Características clave:

* Escalabilidad.
* Separación de responsabilidades.
* Consistencia entre plataformas.
* Despliegue reproducible.

---

## 8. Requerimientos Preliminares

### Requerimientos Funcionales

* Registro e inicio de sesión.
* Gestión de perfil de usuario.
* Generación y validación de Sudoku.
* Guardado de partidas.
* Sistema de experiencia y niveles.
* Logros y misiones.
* Emparejamiento PvP.
* Gestión de torneos.
* Rankings automáticos.

### Requerimientos No Funcionales

* Arquitectura basada en contenedores.
* Validación server-side.
* API documentada.
* Alta disponibilidad.
* Consistencia entre clientes web y móvil.

---

## 9. Criterios de Aceptación Iniciales

* El usuario puede registrarse e iniciar sesión correctamente.
* Puede jugar una partida completa de Sudoku validada por el sistema.
* El sistema asigna experiencia y actualiza niveles.
* Se puede disputar una partida PvP funcional.
* Se puede crear y ejecutar un torneo básico.
* El ranking refleja correctamente los resultados.
* El sistema puede desplegarse mediante contenedores.

---

## 10. Plan de Trabajo

### Fase 1 – Diseño

* Modelado de arquitectura.
* Diseño de base de datos.
* Definición de API.

### Fase 2 – Backend

* Autenticación.
* Lógica del juego.
* Sistema de progresión.
* PvP básico.

### Fase 3 – Frontend

* Interfaz de juego.
* Perfil y progreso.
* Vista de torneos y rankings.

### Fase 4 – Integración

* Pruebas integrales.
* Dockerización.
* Configuración CI/CD.

### Fase 5 – Validación

* Pruebas con usuarios.
* Ajustes de balance y gamificación.

---

# Referencias 

[1] Duolingo, “Duolingo,” 2026. [En línea]. Disponible: [https://www.duolingo.com](https://www.duolingo.com)

[2] Khan Academy, “Khan Academy,” 2026. [En línea]. Disponible: [https://www.khanacademy.org](https://www.khanacademy.org)

[3] Chess.com, “Online Chess Platform,” 2026. [En línea]. Disponible: [https://www.chess.com](https://www.chess.com)

[4] Sudoku.com, “Sudoku Online Game,” 2026. [En línea]. Disponible: [https://sudoku.com](https://sudoku.com)

[5] WebSudoku, “Free Online Sudoku,” 2026. [En línea]. Disponible: [https://www.websudoku.com](https://www.websudoku.com)

[6] Docker Inc., “Docker Documentation,” 2026. [En línea]. Disponible: [https://docs.docker.com](https://docs.docker.com)

[7] Swagger, “OpenAPI Specification,” 2026. [En línea]. Disponible: [https://swagger.io/specification/](https://swagger.io/specification/)

