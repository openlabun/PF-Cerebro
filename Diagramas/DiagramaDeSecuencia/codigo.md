@startuml
title CEREBRO - Diagrama de Secuencia de Interacciones Principales

actor Usuario
actor Admin

participant "IyR Frontend" as IYR
participant "PvP Simulador" as PvPFE
participant "Admin Dashboard" as AdminUI

participant "AuthModule (Contenedor1)" as AuthC1
participant "PersonalTrackingModule" as PT
participant "ProfilesModule" as Profiles
participant "GameSessionsModule" as GameSessions
participant "GameStatsModule" as GameStats
participant "StreaksModule" as Streaks
participant "AchievementsModule" as Achievements
participant "TitlesModule" as Titles
participant "TorneosModule" as Torneos

participant "AuthModule (Contenedor2)" as AuthC2
participant "MatchModule (PvP)" as Match
participant "RankingModule" as Ranking
participant "WebhookModule" as Webhook
participant "SudokuModule" as Sudoku

participant "AdminController" as AdminController
participant "AdminService" as AdminService

participant "RobleModule" as Roble
database "ROBLE DB API" as RobleDB
participant "ROBLE Auth API" as RobleAuth
collections "Webhook Endpoint Externo" as WebhookExt

== Flujo 1: Juego base sin autenticación ==

Usuario -> IYR : entrar al juego
Usuario -> IYR : iniciar Sudoku base

group Sudoku base local
IYR -> Sudoku : generar tablero
Sudoku --> IYR : tablero generado
end

alt Usuario NO autenticado
note right of IYR
No se registra:
- perfil
- estadísticas
- experiencia
- racha
- logros
end note
end

== Flujo 2: Autenticación para funciones protegidas ==

Usuario -> IYR : iniciar sesión
IYR -> AuthC1 : login(email,password)

AuthC1 -> RobleAuth : validar credenciales
RobleAuth --> AuthC1 : access token / refresh token

AuthC1 --> IYR : sesión autenticada

opt Usuario entra desde PvP
Usuario -> PvPFE : login
PvPFE -> AuthC2 : validar token
AuthC2 -> RobleAuth : verificar token
RobleAuth --> AuthC2 : token válido
AuthC2 --> PvPFE : sesión PvP activa
end

== Flujo 3: Perfil y Personal Tracking ==

Usuario -> IYR : consultar perfil
IYR -> PT : obtener perfil

PT -> Profiles : resolver perfil
Profiles -> Roble : consultar datos perfil
Roble -> RobleDB : query perfil
RobleDB --> Roble
Roble --> Profiles

Profiles -> Titles : resolver título activo
Titles -> Roble : consultar títulos
Roble -> RobleDB
RobleDB --> Roble
Roble --> Titles
Titles --> Profiles

Profiles --> PT
PT --> IYR : perfil completo

group Registro de partida autenticada
Usuario -> IYR : completar partida
IYR -> GameSessions : registrar sesión

GameSessions -> Roble
Roble -> RobleDB

GameSessions -> GameStats : actualizar estadísticas
GameStats -> Roble
Roble -> RobleDB

GameSessions -> Streaks : actualizar racha
Streaks -> Roble
Roble -> RobleDB

GameSessions -> Achievements : evaluar logros
Achievements -> Roble
Roble -> RobleDB
end

== Flujo 4: Torneos (requiere autenticación) ==

Usuario -> IYR : consultar torneos
IYR -> Torneos : listar torneos

alt Usuario autenticado
Torneos -> Roble
Roble -> RobleDB
RobleDB --> Roble
Roble --> Torneos
Torneos --> IYR : lista torneos
else Usuario no autenticado
Torneos --> IYR : acceso rechazado
end

opt Usuario crea o se une a torneo
Usuario -> IYR : unirse / crear torneo
IYR -> Torneos : operación torneo
Torneos -> Roble
Roble -> RobleDB
end

== Flujo 5: PvP (requiere autenticación) ==

Usuario -> PvPFE : crear/unirse a partida PvP

alt Usuario autenticado
PvPFE -> Match : iniciar partida

Match -> Torneos : validar torneo PvP
Torneos --> Match : validación OK

Match -> Sudoku : generar/reconstruir tablero
Sudoku --> Match : tablero

Match -> Roble : persistir partida
Roble -> RobleDB

loop movimientos jugador
PvPFE -> Match : enviar movimiento
Match -> Roble : persistir movimiento
Roble -> RobleDB
end

Match -> Ranking : actualizar ELO
Ranking -> Roble
Roble -> RobleDB

Match -> Webhook : emitir evento partida
Webhook --> WebhookExt : notificar evento

else Usuario no autenticado
PvPFE --> Usuario : acceso PvP rechazado
end

== Flujo 6: Administración ==

Admin -> AdminUI : consultar métricas
AdminUI -> AdminController : snapshot admin

AdminController -> AdminService : obtener datos

group consultas a Contenedor1
AdminService -> Torneos : consultar torneos
AdminService -> PT : consultar usuarios/perfiles
AdminService -> GameStats : estadísticas juego
end

group consultas a Contenedor2
AdminService -> Ranking : ranking PvP
end

group métricas agregadas
AdminService -> RobleDB : sesiones / sudoku seeds
end

AdminService --> AdminController
AdminController --> AdminUI : snapshot consolidado

opt Crear / actualizar torneo
Admin -> AdminUI : crear/editar torneo
AdminUI -> AdminController
AdminController -> AdminService
AdminService -> Torneos : crear/actualizar torneo
Torneos -> Roble
Roble -> RobleDB
end
@enduml