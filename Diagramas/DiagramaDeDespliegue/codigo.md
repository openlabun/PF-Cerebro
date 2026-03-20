@startuml
title CEREBRO - Diagrama de Despliegue (Docker Compose)

skinparam shadowing false
skinparam componentStyle rectangle
left to right direction

' =========================
' Clientes
' =========================
node "Cliente Usuario" {
    artifact "Navegador Web" as UserBrowser
}

node "Cliente Administrador" {
    artifact "Navegador Web Admin" as AdminBrowser
}

' =========================
' Infraestructura Docker
' =========================
node "Docker Host\n(Docker Compose)" {

    ' -------- FRONTENDS --------
    node "cerebro-frontend\n5051:80" {
        component "IyR Frontend\n(Juego base Sudoku)"
    }

    node "cerebro-admin-dashboard\n127.0.0.1:5052:80" {
        component "Admin Dashboard"
    }

    node "cerebro-pvp-simulador\n3003:3003" {
        component "PvP Simulador"
    }

    ' -------- BACKENDS --------
    node "cerebro-api\n(Contenedor1)" {

        component "AuthModule"
        component "PersonalTrackingModule"
        component "TorneosModule"
        component "RobleModule"
    }

    node "cerebro-contenedor2\n(Contenedor2)" {

        component "AuthModule"
        component "MatchModule (PvP)"
        component "RankingModule"
        component "WebhookModule"
        component "SudokuModule"
        component "RobleModule"
    }

    node "cerebro-backend-admin\n(ContenedorAdmin)" {

        component "AdminController"
        component "AdminService"
    }

}

' =========================
' Servicios externos
' =========================
cloud "Servicios ROBLE" {

    component "ROBLE Auth API" as RobleAuth
    database "ROBLE DB API" as RobleDB
}

cloud "Webhook endpoints externos" {
    component "Webhook Endpoint"
}

' =========================
' Acceso de clientes
' =========================
UserBrowser --> "cerebro-frontend\n5051:80" : HTTP acceso juego
UserBrowser --> "cerebro-pvp-simulador\n3003:3003" : HTTP acceso PvP

AdminBrowser --> "cerebro-admin-dashboard\n127.0.0.1:5052:80" : HTTP acceso admin

' =========================
' Frontend → Backend
' =========================
"cerebro-frontend\n5051:80" --> "cerebro-api\n(Contenedor1)" : API\ntracking / torneos / auth

"cerebro-admin-dashboard\n127.0.0.1:5052:80" --> "cerebro-backend-admin\n(ContenedorAdmin)" : API administrativa

"cerebro-pvp-simulador\n3003:3003" --> "cerebro-api\n(Contenedor1)" : auth general\nconsultar torneos

"cerebro-pvp-simulador\n3003:3003" --> "cerebro-contenedor2\n(Contenedor2)" : partidas PvP\nmatchmaking\nwebhooks

' =========================
' Backend → Backend
' =========================
"cerebro-contenedor2\n(Contenedor2)" --> "cerebro-api\n(Contenedor1)" : validar torneo\nvalidar inscripción

"cerebro-backend-admin\n(ContenedorAdmin)" --> "cerebro-api\n(Contenedor1)" : consultar torneos\nusuarios\ntracking

"cerebro-backend-admin\n(ContenedorAdmin)" --> "cerebro-contenedor2\n(Contenedor2)" : consultar ranking PvP

' =========================
' Backend → Servicios externos
' =========================
"cerebro-api\n(Contenedor1)" --> RobleAuth : autenticación
"cerebro-api\n(Contenedor1)" --> RobleDB : persistencia

"cerebro-contenedor2\n(Contenedor2)" --> RobleAuth : autenticación PvP
"cerebro-contenedor2\n(Contenedor2)" --> RobleDB : partidas\nmovimientos\nranking

"cerebro-backend-admin\n(ContenedorAdmin)" --> RobleDB : métricas\nagregaciones

' =========================
' Webhooks
' =========================
"cerebro-contenedor2\n(Contenedor2)" ..> "Webhook Endpoint" : eventos de partida\n(WebhookModule)

@enduml