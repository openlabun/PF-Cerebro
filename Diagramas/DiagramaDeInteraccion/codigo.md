@startuml
title CEREBRO - Diagrama de Interacción entre Módulos

skinparam componentStyle rectangle
skinparam shadowing false
left to right direction

package "Contenedor1 - Core Platform" {

    component "AuthModule\n<<Autenticación>>" as AuthC1
    component "PersonalTrackingModule\n<<Personal Tracking>>" as PT

    component "ProfilesModule" as Profiles
    component "StreaksModule" as Streaks
    component "AchievementsModule" as Achievements
    component "TitlesModule" as Titles
    component "GameSessionsModule" as GameSessions
    component "GameStatsModule" as GameStats

    component "TorneosModule\n<<Torneos>>" as Torneos
    component "RobleModule" as RobleC1

    PT --> Profiles : gestionar perfiles
    PT --> Streaks : gestionar rachas
    PT --> Achievements : gestionar logros
    PT --> Titles : gestionar títulos
    PT --> GameSessions : gestionar sesiones
    PT --> GameStats : estadísticas de juego

    Profiles --> Titles : consultar títulos
    Profiles --> RobleC1 : persistir perfiles

    GameSessions --> GameStats : actualizar estadísticas
    GameSessions --> RobleC1 : guardar sesión

    Streaks --> RobleC1 : persistir rachas
    Achievements --> RobleC1 : persistir logros
    Titles --> RobleC1 : persistir títulos
    GameStats --> RobleC1 : persistir estadísticas

    AuthC1 --> RobleC1 : login/signup/refresh/verify/logout

    PT --> AuthC1 : requiere autenticación previa
    Torneos --> AuthC1 : validar usuario autenticado
    Torneos --> RobleC1 : persistir torneos
}

package "Contenedor2 - PvP Service" {

    component "AuthModule\n<<Autenticación PvP>>" as AuthC2
    component "MatchModule\n<<PvP>>" as Match
    component "RankingModule" as Ranking
    component "WebhookModule" as Webhook
    component "SudokuModule" as Sudoku
    component "RobleModule" as RobleC2

    AuthC2 --> RobleC2 : validar token PvP

    Match --> Sudoku : generar/reconstruir tablero
    Match --> Ranking : actualizar ELO
    Match --> Webhook : emitir evento partida
    Match --> RobleC2 : persistir partidas y movimientos
    Match --> Torneos : validar torneo PvP e inscripción

    Ranking --> RobleC2 : persistir ranking
    Webhook --> RobleC2 : gestionar suscripciones
}

package "ContenedorAdmin - Administración" {

    component "AdminController\n<<Administración>>" as AdminController
    component "AdminService\n<<Administración>>" as AdminService

    AdminController --> AdminService : operaciones administrativas
}

package "Clientes" {

    component "Admin Dashboard" as AdminDashboard
}

package "Servicios Externos" {

    component "ROBLE Auth API" as RobleAuthAPI
    component "ROBLE DB API" as RobleDBAPI
    component "Webhook endpoints externos" as WebhookExt
}

AdminDashboard --> AdminController : consumir API admin

AdminService --> Torneos : crear/consultar/actualizar torneos
AdminService --> PT : consultar perfiles y métricas
AdminService --> AuthC1 : consultar usuarios autenticados
AdminService --> GameStats : consultar estadísticas
AdminService --> Ranking : consultar ranking PvP

AdminService --> RobleDBAPI : métricas agregadas\n(sesiones, sudoku seeds)

RobleC1 --> RobleAuthAPI : autenticación
RobleC1 --> RobleDBAPI : operaciones DB

RobleC2 --> RobleAuthAPI : autenticación PvP
RobleC2 --> RobleDBAPI : operaciones DB

Webhook ..> WebhookExt : notificación eventos de partida
@enduml