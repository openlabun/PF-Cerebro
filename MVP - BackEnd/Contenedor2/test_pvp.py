import sys
import io
import requests
import json
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ============================================================
# CONFIGURACIÓN — Cambiar antes de correr
# ============================================================
C1 = "http://localhost:3000"   # Contenedor1
C2 = "http://localhost:3001"   # Contenedor2

JUGADOR1_EMAIL = "usuarioprueba1@uninorte.edu.co"
JUGADOR1_PASSWORD = "12345678Aa!"

JUGADOR2_EMAIL = "usuarioprueba2@uninorte.edu.co"
JUGADOR2_PASSWORD = "12345678Bb!"

WEBHOOK_URL = "https://webhook.site/30cb6f4f-43c0-40a2-b5ac-5ed42d56aeac"
# ============================================================


def separador(titulo):
    print(f"\n{'='*60}")
    print(f"  {titulo}")
    print('='*60)


def log(label, data):
    print(f"\n  [{label}]")
    print(f"  {json.dumps(data, indent=2, ensure_ascii=False)}")


def ok(msg):
    print(f"  ✅ {msg}")


def error(msg, res=None):
    print(f"  ❌ {msg}")
    if res is not None:
        try:
            print(f"     Status: {res.status_code}")
            print(f"     Body:   {res.text}")
        except:
            pass


# ============================================================
# FASE 0 — Registrar usuarios en Contenedor2 (pvp_db)
# ============================================================
separador("FASE 0 — Registro en Contenedor2")

for jugador in [
    {"email": JUGADOR1_EMAIL, "password": JUGADOR1_PASSWORD, "name": "Jugador 1 PvP"},
    {"email": JUGADOR2_EMAIL, "password": JUGADOR2_PASSWORD, "name": "Jugador 2 PvP"},
]:
    res = requests.post(f"{C2}/auth/signup-direct", json=jugador)
    if res.status_code in (200, 201):
        ok(f"{jugador['email']} registrado en Contenedor2")
    else:
        body = res.text
        if "ya" in body.lower() and ("existe" in body.lower() or "registrado" in body.lower()):
            ok(f"{jugador['email']} ya existia en Contenedor2, continuando...")
        else:
            error(f"Registro de {jugador['email']} fallo", res)
            exit(1)


# ============================================================
# FASE 1 — Login en Contenedor2 (tokens vinculados a pvp_db)
# ============================================================
separador("FASE 1 — Autenticacion en Contenedor2")

res = requests.post(f"{C2}/auth/login", json={
    "email": JUGADOR1_EMAIL,
    "password": JUGADOR1_PASSWORD
})
if res.status_code not in (200, 201):
    error("Login Jugador 1 fallo", res)
    exit(1)
token1 = res.json().get("accessToken")
ok(f"Jugador 1 autenticado en C2 — token: {token1[:30]}...")

res = requests.post(f"{C2}/auth/login", json={
    "email": JUGADOR2_EMAIL,
    "password": JUGADOR2_PASSWORD
})
if res.status_code not in (200, 201):
    error("Login Jugador 2 fallo", res)
    exit(1)
token2 = res.json().get("accessToken")
ok(f"Jugador 2 autenticado en C2 — token: {token2[:30]}...")

headers1 = {"Authorization": f"Bearer {token1}"}
headers2 = {"Authorization": f"Bearer {token2}"}

# Tokens de Contenedor1 (para validar torneos y participantes)
res = requests.post(f"{C1}/auth/login", json={
    "email": JUGADOR1_EMAIL,
    "password": JUGADOR1_PASSWORD
})
if res.status_code not in (200, 201):
    error("Login Jugador 1 en C1 fallo", res)
    exit(1)
token1_c1 = res.json().get("accessToken")
ok(f"Jugador 1 autenticado en C1")

res = requests.post(f"{C1}/auth/login", json={
    "email": JUGADOR2_EMAIL,
    "password": JUGADOR2_PASSWORD
})
if res.status_code not in (200, 201):
    error("Login Jugador 2 en C1 fallo", res)
    exit(1)
token2_c1 = res.json().get("accessToken")
ok(f"Jugador 2 autenticado en C1")

headers1_c1 = {"Authorization": f"Bearer {token1_c1}"}
headers2_c1 = {"Authorization": f"Bearer {token2_c1}"}


# ============================================================
# FASE 2 — Crear torneo PVP en Contenedor1
# ============================================================
separador("FASE 2 — Crear torneo PVP en Contenedor1")

res = requests.post(f"{C1}/torneos", json={
    "nombre": "Torneo PvP Test",
    "descripcion": "Torneo de prueba automatizada PvP",
    "esPublico": True,
    "tipo": "PVP",
    "fechaInicio": "2026-01-01T00:00:00.000Z",
    "fechaFin": "2026-12-31T23:59:59.000Z",
    "recurrencia": "NINGUNA"
}, headers=headers1_c1)

if res.status_code not in (200, 201):
    error("Crear torneo falló", res)
    exit(1)

torneo = res.json()
torneo_id = torneo.get("_id")
ok(f"Torneo creado — id: {torneo_id}")
log("Torneo", torneo)


# ============================================================
# FASE 3 — Activar torneo (BORRADOR -> PROGRAMADO, sync por fecha)
# ============================================================
separador("FASE 3 — Activar torneo")

res = requests.patch(f"{C1}/torneos/{torneo_id}/estado", json={
    "estado": "PROGRAMADO"
}, headers=headers1_c1)

if res.status_code not in (200, 201):
    error("Transicion a PROGRAMADO fallo", res)
    exit(1)

ok("Torneo en estado PROGRAMADO")

# GET fuerza syncEstadoPorFecha — como fechaInicio ya paso, debe auto-pasar a ACTIVO
res = requests.get(f"{C1}/torneos/{torneo_id}", headers=headers1_c1)
if res.status_code not in (200, 201):
    error("GET torneo fallo", res)
    exit(1)

estado_actual = res.json().get("estado")
ok(f"Torneo sincronizado — estado actual: {estado_actual}")

if estado_actual != "ACTIVO":
    error(f"El torneo no esta ACTIVO despues del sync, esta: {estado_actual}. Verifica las fechas.")
    exit(1)

ok("Torneo en estado ACTIVO")


# ============================================================
# FASE 4 — Inscribir ambos jugadores en el torneo
# ============================================================
separador("FASE 4 — Inscribir jugadores en Contenedor1")

res = requests.post(f"{C1}/torneos/{torneo_id}/unirse", json={}, headers=headers1_c1)
if res.status_code not in (200, 201):
    error("Inscripción Jugador 1 falló", res)
    exit(1)
ok("Jugador 1 inscrito en el torneo")

res = requests.post(f"{C1}/torneos/{torneo_id}/unirse", json={}, headers=headers2_c1)
if res.status_code not in (200, 201):
    error("Inscripción Jugador 2 falló", res)
    exit(1)
ok("Jugador 2 inscrito en el torneo")


# ============================================================
# FASE 5 — Suscribir webhooks en Contenedor2
# ============================================================
separador("FASE 5 — Suscribir webhooks en Contenedor2")

eventos = ["match.started", "opponent.moved", "match.finished", "match.forfeit"]

res = requests.post(f"{C2}/webhook/subscribe", json={
    "url": WEBHOOK_URL,
    "eventos": eventos
}, headers=headers1)

if res.status_code not in (200, 201):
    error("Suscripción webhook Jugador 1 falló", res)
    exit(1)
ok(f"Jugador 1 suscrito a webhooks en: {WEBHOOK_URL}")

res = requests.post(f"{C2}/webhook/subscribe", json={
    "url": WEBHOOK_URL,
    "eventos": eventos
}, headers=headers2)

if res.status_code not in (200, 201):
    error("Suscripción webhook Jugador 2 falló", res)
    exit(1)
ok(f"Jugador 2 suscrito a webhooks en: {WEBHOOK_URL}")


# ============================================================
# FASE 6 — Crear match PvP en Contenedor2
# ============================================================
separador("FASE 6 — Crear match PvP en Contenedor2")

res = requests.post(f"{C2}/pvp/match", json={
    "torneoId": torneo_id,
    "tokenC1": token1_c1
}, headers=headers1)

if res.status_code not in (200, 201):
    error("Crear match falló", res)
    exit(1)

match = res.json()
match_id = match.get("_id")
ok(f"Match creado — id: {match_id} — estado: {match.get('estado')}")
log("Match", match)

if "solution" in match:
    error("ADVERTENCIA: el campo 'solution' está expuesto en la respuesta")
else:
    ok("Campo 'solution' correctamente oculto en la respuesta")


# ============================================================
# FASE 7 — Jugador 2 se une al match
# ============================================================
separador("FASE 7 — Jugador 2 se une al match")

res = requests.post(f"{C2}/pvp/match/{match_id}/join", json={
    "tokenC1": token2_c1
}, headers=headers2)

if res.status_code not in (200, 201):
    error("Join match falló", res)
    exit(1)

match = res.json()
ok(f"Jugador 2 unido — estado: {match.get('estado')}")
print(f"\n  👉 Revisar webhook.site — debería haber llegado 'match.started'")
time.sleep(1)


# ============================================================
# FASE 8 — Hacer jugadas
# ============================================================
separador("FASE 8 — Jugadas de prueba")

jugadas = [
    {"jugador": 1, "headers": headers1, "row": 0, "col": 0, "value": 5},
    {"jugador": 2, "headers": headers2, "row": 1, "col": 1, "value": 3},
    {"jugador": 1, "headers": headers1, "row": 2, "col": 2, "value": 7},
]

for j in jugadas:
    res = requests.post(f"{C2}/pvp/match/{match_id}/move", json={
        "row": j["row"],
        "col": j["col"],
        "value": j["value"]
    }, headers=j["headers"])

    if res.status_code not in (200, 201):
        error(f"Jugada Jugador {j['jugador']} falló", res)
    else:
        resultado = res.json()
        ok(f"Jugador {j['jugador']} jugó ({j['row']},{j['col']})={j['value']} — correcta: {resultado.get('esCorrecta')}")

print(f"\n  👉 Revisar webhook.site — deberían haber llegado eventos 'opponent.moved'")
time.sleep(1)


# ============================================================
# FASE 9 — Probar forfeit
# ============================================================
separador("FASE 9 — Forfeit (Jugador 1 abandona)")

res = requests.post(f"{C2}/pvp/match/{match_id}/forfeit", headers=headers1)

if res.status_code not in (200, 201):
    error("Forfeit falló", res)
else:
    match = res.json()
    ok(f"Forfeit registrado — ganador: {match.get('ganadorId')} — estado: {match.get('estado')}")
    print(f"\n  👉 Revisar webhook.site — debería haber llegado 'match.forfeit'")


# ============================================================
# FASE 10 — Ver ranking
# ============================================================
separador("FASE 10 — Ranking PvP")

res = requests.get(f"{C2}/pvp/ranking", headers=headers1)

if res.status_code not in (200, 201):
    error("Obtener ranking falló", res)
else:
    ranking = res.json()
    ok("Ranking obtenido")
    log("Top jugadores", ranking)


# ============================================================
# RESUMEN
# ============================================================
separador("RESUMEN")
print("""
  Fases completadas:
  ✅ Fase 1  — Login ambos jugadores
  ✅ Fase 2  — Torneo PVP creado en Contenedor1
  ✅ Fase 3  — Torneo activado
  ✅ Fase 4  — Jugadores inscritos en Contenedor1
  ✅ Fase 5  — Webhooks suscritos en Contenedor2
  ✅ Fase 6  — Match creado en Contenedor2
  ✅ Fase 7  — Jugador 2 se unió (esperar match.started en webhook.site)
  ✅ Fase 8  — Jugadas realizadas (esperar opponent.moved en webhook.site)
  ✅ Fase 9  — Forfeit registrado (esperar match.forfeit en webhook.site)
  ✅ Fase 10 — Ranking consultado

  👉 Ir a webhook.site para verificar que llegaron todos los eventos
""")