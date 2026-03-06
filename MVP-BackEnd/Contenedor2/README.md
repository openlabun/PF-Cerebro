## Contenedor2

Este es el contenedor dos, dedicado al PVP, para correrlo solo necesitas correr en una terminal de linux (con docker instalado):
<code>
   docker-compose up --build
</code>

## Pruebas del PVP
Para probar los endpoints, puede usar el script de python que simula varias fases:
  âœ… Fase 1  â€” Login ambos jugadores
  âœ… Fase 2  â€” Torneo PVP creado en Contenedor1
  âœ… Fase 3  â€” Torneo activado
  âœ… Fase 4  â€” Jugadores inscritos en Contenedor1
  âœ… Fase 5  â€” Webhooks suscritos en Contenedor2
  âœ… Fase 6  â€” Match creado en Contenedor2
  âœ… Fase 7  â€” Jugador 2 se uniÃ³ (esperar match.started en webhook.site)
  âœ… Fase 8  â€” Jugadas realizadas (esperar player.finished o match.finished en webhook.site)
  âœ… Fase 9  â€” Forfeit registrado (esperar match.forfeit en webhook.site)
  âœ… Fase 10 â€” Ranking consultado
### Como probarlo
1. Abrir una terminal de Linux/WSL y ejecutar el contenedor1
2. Abrir otra terminal de Linux/WSL y ejecutar el contenedor2
3. Abrir una terminal y ejecutar <code> python test_pvp.py </code>
4. Verificar el output y los resultados, ademas de los datos en ROBLE.

