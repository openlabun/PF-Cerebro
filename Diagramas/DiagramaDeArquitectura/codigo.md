@startuml
!theme plain
title Arquitectura del Sistema de CEREBRO

top to bottom direction
skinparam shadowing false
skinparam defaultTextAlignment center
skinparam rectangle {
    RoundCorner 8
}

actor Usuario
actor Administrador

rectangle "App Móvil" as AppMovil
rectangle "App Web" as AppWeb
rectangle "Panel Administrador" as PanelAdmin

rectangle "Backend Usuarios" as BackendUsuarios
rectangle "Backend Administradores" as BackendAdmins
rectangle "Backend Torneos" as BackendTorneos
rectangle "Backend PVP" as BackendPVP
rectangle "Roble Auth" as RobleAuth

database "Roble DataBase" as RobleDB

Usuario --> AppMovil
Usuario --> AppWeb

AppMovil --> BackendUsuarios
AppWeb --> BackendUsuarios

Administrador --> PanelAdmin
PanelAdmin --> BackendAdmins

BackendUsuarios --> BackendTorneos
BackendUsuarios --> BackendPVP
BackendUsuarios --> RobleAuth
BackendUsuarios --> RobleDB

BackendAdmins --> RobleAuth
BackendAdmins --> RobleDB

BackendTorneos --> RobleDB
BackendPVP --> RobleDB

RobleAuth --> RobleDB
@enduml