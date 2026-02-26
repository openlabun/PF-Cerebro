## Contenedor2

Este es el contenedor dos, dedicado al PVP, para correrlo solo necesitas correr en una terminal de linux (con docker instalado):
<code>
   docker-compose up --build
</code>

## Pruebas del PVP
Para probar los endpoints, puede usar el script de python que simula varias fases:
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
### Como probarlo
1. Abrir una terminal de Linux/WSL y ejecutar el contenedor1
2. Abrir otra terminal de Linux/WSL y ejecutar el contenedor2
3. Abrir una terminal y ejecutar <code> python test_pvp.py </code>
4. Verificar el output y los resultados, ademas de los datos en ROBLE.