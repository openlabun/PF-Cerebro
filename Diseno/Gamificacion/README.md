# Planeación estrategias de gamificación y tracking personal


## 1. Visión general de la plataforma

Para el desarrollo de este proyecto, y en específico para la implementación de estrategias de gamificación y trackin personal, es importante que veamos a largo plazo no solo como una herramienta de sudoku, sino como una plataforma para múltiples juegos.

Por esto, los sitemas de tracking personal y gamificación deben ser lo suficientemente adaptables como para no generar la necesidad de adaptación excesiva con la implementación de nuevos juegos.

## 2. Estrategias de gamificación

###  2.1 Sistema de rachas
    Es una herramienta fundamental si queremos propagar este proyecto más allá del uso en olimpiadas y para generar la mayor retención posible.

    La implementación de esta estrategia implica recompensar a los usuarios por ingresar y completar por lo menos una partida de alguno de los juegos disponibles en la plataforma.

    Otras recompensas pueden darse en momentos clave de la racha (por ejemplo, al completar 10, 50, 100 días), de modo que haya una motivación a mantenerla y una recompensa clara por el esfuerzo.

    Las rachas implentarán también estrategias de felixibilidad como salvadores de racha obtenidos de recompensas al jugar, esto para permitir que los usuarios no pierdan todo su progreso solo por una o dos fallas.

    Podemos usar como gran referente de esta estrategia a Duolingo, que ha conseguido mantener una amplia base de usuario en parte gracias a el compromiso que sienten por su racha.


### 2.2 Retos Diarios y Eventos Temporales

    Los retos diarios evitan la motonia en el uso de la plataforma, además de que consiguen buena sinergia con las rachas al tener doble incentivo de ingresar cada día (mantener tu racha y completar un nuevo reto).

    Los eventos temporales, por otra parte, incentivan a la participación más allá de solo mantener la racha, usando como motivación metas parciales con recompensas variadas que le den propocito más allá del ingreso diario.

    Chess.com usa esto de una manera excelente con sus puzzles diarios; en estos aplica ambas estrategias dado que es un reto diferente cada día, pero aumentan de dificultad a lo largo de la semana, además recompensando con puntos de elo según tu desempeño en completarlos.


### 2.3 Logros e Insignias

    Aquí otra vez usamos como referentes a Duolingo y Chess.com; en ambas plataformas se te recompensa al relaizar ciertos "hitos" en tu cuenta.

    Estos hitos pueden ir desde completar cierto número de partidas, alcanzar un elo significativo, completar un puzzle o sesión en un tiempo específico y muchos más ejemplos. Estos retos además suelen brindar elementos consmeticos como badges, títulos, iconos, etc.

    Estos logros e insignias son una froma muy eficaz de motivar a los usarios a mantenerse activos haciendo uso de la competitividad y la sensación de logro al poder "presumir" de estos logros.


### 3. Sistema de Puntaje

    Para manejar el progreso y muchos otros aspectos de la plataforma es importante definir un sistema de puntajes objetivo y estandarizado que pueda ser adoptado por todos los juegos que se planeen implementar, de modo que haya el menor conflicto posible.

    Estos sistemas de puntaje pueden dividirse según si es progreso individual o competitivo.

    Para el progreso personal puede ser un sistema de puntaje por partida, de modo que esto se acumule y aumente un "Nivel" general de la cuenta que refle la longevidad del usuario y su status.

    En cambio, para el progreso competitivo se manejaria con un sistema de ELO, de modo que los mejores jugadores suban en los ranking y se enfrenten entre ellos; este puntaje se modificaran según victorias y derrotas después de cada partida PVP.

    Esta distincion es importante sobre todo para evitar mal emparejamineto, dado que una cuenta con alto progreso individual no siempre se traducira en un alto desempeño pvp.


### 4. Sitema de Ligas

    Siguiendo la idea de un sistema de ELO, debe implementarse ligas que den una sensacion de progreso en le pvp más allá de simplemente aumentar el número.

    Se pueden usar rangos como bronce, plata, oro y diamante, con subdivisiones numericas de modo que cada cierta cantidad de puntos de ELO el usario logre un ascenso o un descenso.

    Además, estas divisiones ayudaran a facilitar el matchmaking de estas partidas pvp o servirian como requisito de entrada en eventos como torneos.

### 5. Juego Offline

    La implementación movil debe garantizar disponibilidad offline, dado que muchas de las qejas actuales de platafromas es las constante necesidad de conexion; esto genera friccion innecesaria con el usario.

    Para esto es obviamente importante garantizar que el progreso realizado en modo offline sea debidadmente registrado una vez se reestablezca la conexion.

    Este modo offline logicamente debe tener funciones restringidas, pero deber como minimo garantizar la vista de todo lo referente al perfil del usuario y sus estadisticas para el progreso individual.

### 6. Manejo de Perfiles

    Los perfiles son el eje central de toda la experiencia en la plataforma; deben ser altamente customizable y expresar de manera clara e intuitiva toda la experiencia del usuario.

    Estos perfiles deben incluir espacio para recompensas esteticas como badges, iconos, trofeos y demas.

    Además, debe brindar tambien un vistazo a un dashboard con las estadisticas de la cuenta para maximizar la sensacion de progreso de los usuarios al ver sus acciones cuantificadas.

    Aunque habra un excepcion para cuentas de invitado propias de la implementación web para fomentar el uso de nuevos usuario sin la friccion inicial de crear una cuenta.

### 7. Referencias 
    - Chess. (s. f.). Chess.com - Play Chess online - free games. Chess.com. https://chess.com/

    - Duolingo - Learn a language for free @duolingo. (s. f.). Duolingo. https://duolingo.com/





