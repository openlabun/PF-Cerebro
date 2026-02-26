# CEREBRO Backend – Documentación General (MVP v1)

## Overview

El backend de **CEREBRO** está desarrollado con **NestJS** y funciona como una plataforma modular que integra funcionalidades de:

* Personal Tracking (progreso del usuario, estadísticas, logros, sesiones de juego)
* Torneos competitivos
* Autenticación y persistencia mediante **ROBLE API (DBaaS + Auth)**

El sistema actúa como una capa de **lógica de negocio y orquestación** sobre los servicios externos de ROBLE, sin mantener base de datos propia.

Esta arquitectura permite escalabilidad futura hacia microservicios sin modificar la lógica central.

---

## Arquitectura General

```
Usuario / Cliente Frontend
        ↓
CEREBRO Backend API (NestJS)
        ├── AuthModule
        ├── PersonalTrackingModule
        │      ├── ProfilesModule
        │      ├── AchievementsModule
        │      ├── TitlesModule
        │      ├── StreaksModule
        │      ├── GameSessionsModule
        │      └── GameStatsModule
        │
        ├── TorneosModule
        │      ├── Torneos
        │      ├── Participantes
        │      └── Resultados
        │
        └── RobleModule
                ↓
            ROBLE API
            (Auth + Database)
```

Todos los módulos se ejecutan dentro de un **solo contenedor Docker**.

---

## Stack Tecnológico

| Área            | Tecnología                    |
| --------------- | ----------------------------- |
| Framework       | NestJS                        |
| Lenguaje        | TypeScript                    |
| Base de datos   | ROBLE (Database as a Service) |
| Autenticación   | JWT (emitido por ROBLE)       |
| Cliente HTTP    | Axios (HttpModule)            |
| Testing         | Jest + Supertest              |
| Documentación   | Swagger                       |
| Contenerización | Docker                        |
| Runtime         | Node.js                       |

---

## Integración con ROBLE

El backend no mantiene persistencia local.

Toda la información se almacena en ROBLE mediante:

* ROBLE Auth API → autenticación y validación de tokens
* ROBLE Database API → operaciones CRUD

Variables de entorno requeridas:

```env
ROBLE_AUTH_BASE=
ROBLE_DB_BASE=
ROBLE_DBNAME=
```

---

## Base URL

```
http://localhost:3000/api
```

Ejemplos:

```
/api/auth/login
/api/profiles
/api/torneos
/api/torneos/:id/ranking
```

---

# Módulos del Sistema

---

# 1️⃣ Personal Tracking Module

Gestiona la progresión individual del usuario dentro de la plataforma.

Incluye:

* Perfiles
* Experiencia y niveles
* Logros
* Títulos
* Rachas
* Estadísticas por juego
* Sesiones de juego
* Sistema ELO

---

## Entidades Principales

### Perfil

* id (uuid)
* usuarioId (uuid)
* nivel
* experiencia
* rachaActual
* rachaMaxima
* salvadoresRacha
* tituloActivoId

### Juego

* id
* nombre
* descripcion
* esRankeado

### EstadisticasJuegoUsuario

* usuarioId
* juegoId
* elo
* partidasJugadas
* victorias
* derrotas
* empates
* ligaId

### Liga

* nombre
* eloMinimo
* eloMaximo
* icono

### Logro

* nombre
* descripcion
* icono
* puntos
* esSecreto

### LogroUsuario

* usuarioId
* logroId
* desbloqueadoEn

### Titulo

* nombre
* descripcion
* rareza

### SesionJuego

* usuarioId
* juegoId
* puntaje
* resultado
* cambioElo
* jugadoEn

---

## Sistema de Niveles

XP requerida por nivel:

* Nivel 1–10 → nivel × 100
* Nivel 11–30 → nivel × 150
* Nivel 31–50 → nivel × 250
* Nivel 50+ → nivel + 250

Nivel máximo: **100**

---

## Sistema ELO

ELO inicial: **1000**

El sistema permite:

* Incrementar victorias
* Incrementar derrotas
* Incrementar empates
* Actualizar ELO
* Cambio de liga automático

---

## Sistema de Rachas

Permite:

* Incrementar racha actual
* Resetear racha
* Usar salvador de racha
* Incrementar salvadores
* Actualizar racha máxima

---

# 2️⃣ Módulo de Torneos

Permite competencias organizadas dentro de la plataforma.

Inicialmente diseñado para **Sudoku**, pero preparado para múltiples juegos.

Funciones principales:

* Creación de torneos
* Participación de usuarios
* Registro de resultados
* Ranking dinámico
* Transiciones automáticas de estado
* Preparado para integración con Tracking y PVP

---

## Modelo de Datos

### Torneos

* nombre
* descripcion
* creadorId
* codigoAcceso
* esPublico
* estado
* tipo
* fechaInicio
* fechaFin
* recurrencia
* configuracion
* fechaCreacion

### Participantes

* torneoId
* usuarioId
* fechaUnion

Regla: Un usuario no puede unirse dos veces.

### Resultados

* torneoId
* usuarioId
* puntaje
* tiempo
* fechaRegistro

Regla: Solo se conserva el mejor resultado por usuario.

---

## Estados del Torneo

```
BORRADOR → PROGRAMADO → ACTIVO → FINALIZADO
                      ↘ PAUSADO
                      ↘ CANCELADO
```

Transiciones automáticas:

* fechaInicio ≤ ahora ≤ fechaFin → ACTIVO
* ahora > fechaFin → FINALIZADO

---

## Sistema de Ranking

Generado dinámicamente.

Orden:

1. Puntaje DESC
2. Tiempo ASC
3. FechaRegistro ASC

No existe persistencia de ranking.

---

## Recurrencia

Valores:

* NINGUNA
* SEMANAL
* MENSUAL

Automatización planificada para versiones futuras.

---

# Autenticación y Seguridad

* JWT emitido por ROBLE
* Header Authorization Bearer requerido
* Validación mediante proxy hacia ROBLE
* No se almacenan credenciales localmente
* Guards personalizados en NestJS

---

# Endpoints API

Base: `/api`

---

## Auth

| Método | Endpoint             |
| ------ | -------------------- |
| POST   | `/auth/login`        |
| POST   | `/auth/signup`       |
| POST   | `/auth/refresh`      |
| POST   | `/auth/logout`       |
| GET    | `/auth/verify-token` |

---

## Personal Tracking

### Profiles

| Método | Endpoint               |
| ------ | ---------------------- |
| POST   | `/profiles`            |
| GET    | `/profiles/:userId`    |
| PATCH  | `/profiles/:userId/xp` |

---

### Achievements

| Método | Endpoint               |
| ------ | ---------------------- |
| POST   | `/achievements`        |
| GET    | `/achievements`        |
| POST   | `/achievements/assign` |
| DELETE | `/achievements/remove` |

---

### Titles

| Método | Endpoint  |
| ------ | --------- |
| POST   | `/titles` |
| GET    | `/titles` |

---

### Game Sessions

| Método | Endpoint    |
| ------ | ----------- |
| POST   | `/sessions` |

---

### Game Stats

| Método | Endpoint         |
| ------ | ---------------- |
| PATCH  | `/stats/victory` |
| PATCH  | `/stats/defeat`  |
| PATCH  | `/stats/draw`    |
| PATCH  | `/stats/elo`     |

---

### Streaks

| Método | Endpoint            |
| ------ | ------------------- |
| PATCH  | `/streaks/increase` |
| PATCH  | `/streaks/reset`    |

---

## Torneos

| Método | Endpoint                                  | Descripción        |
| ------ | ----------------------------------------- | ------------------ |
| POST   | `/torneos`                                | Crear torneo       |
| GET    | `/torneos`                                | Listar torneos     |
| GET    | `/torneos/:id`                            | Obtener torneo     |
| PUT    | `/torneos/:id`                            | Actualizar torneo  |
| PATCH  | `/torneos/:id/estado`                     | Cambiar estado     |
| DELETE | `/torneos/:id`                            | Eliminar torneo    |
| POST   | `/torneos/:id/unirse`                     | Unirse             |
| POST   | `/torneos/:id/resultados`                 | Enviar resultado   |
| GET    | `/torneos/:id/ranking`                    | Ranking            |
| GET    | `/torneos/usuarios/:usuarioId/resultados` | Resultados usuario |

---

# Swagger

Disponible en:

```
http://localhost:3000/api
```

Incluye:

* DTOs
* Schemas
* Autenticación Bearer
* Requests y Responses

---

# Testing

Implementado con:

* Jest (unitarias)
* Supertest (e2e)

Cobertura principal:

* Autenticación
* Creación de torneos
* Participación
* Ranking
* Validaciones de negocio
* Tracking de usuario

---

# Despliegue

Contenedor Docker único con multi-stage build.

Puerto:

```
3000
```

Ejemplo ejecución:

```bash
docker build -t cerebro-backend .
docker run -p 3000:3000 cerebro-backend
```

---

# Limitaciones del MVP

* No incluye frontend
* Recurrencia de torneos no automatizada
* No validación interna del Sudoku
* Dependencia total de ROBLE
* No cache para ranking
* No microservicios independientes aún

---

# Escalabilidad

La arquitectura permite evolución hacia:

* Microservicios por módulo
* Cache distribuido (Redis)
* Sistema de matchmaking
* Ranking persistente
* Automatización de torneos recurrentes
* Soporte para múltiples juegos

---

# Conclusión Técnica

El backend de CEREBRO implementa una arquitectura modular desacoplada, integrada con ROBLE como proveedor de autenticación y persistencia.

La unificación de los módulos **Personal Tracking** y **Torneos** dentro de un solo contenedor permite:

* Despliegue simplificado
* Consistencia de autenticación
* Escalabilidad futura
* Mantenimiento centralizado

El sistema se encuentra preparado para evolucionar hacia arquitecturas distribuidas sin refactorización significativa.

---
