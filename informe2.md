# CEREBRO

Plataforma de Juegos de Desafío Mental

---

## 1. Introducción

CEREBRO surge en el contexto del crecimiento de las plataformas digitales orientadas al entretenimiento interactivo y al desarrollo de habilidades cognitivas. En este escenario, los juegos de desafío mental, y en particular el Sudoku, representan una oportunidad para construir experiencias que no solo entretengan, sino que también promuevan concentración, constancia, análisis y superación personal. A partir de esta base, el proyecto plantea una plataforma que combine juego, seguimiento del progreso y dinámicas competitivas dentro de un mismo ecosistema tecnológico.

En su situación actual, el proyecto se orienta a la construcción de una primera versión funcional, apoyada en una aplicación web principal, servicios backend especializados, un módulo competitivo PvP, gestión de torneos, seguimiento del usuario y un entorno administrativo para observabilidad y operación. Esta base técnica permite que la solución no se limite a un juego aislado, sino que evolucione hacia una plataforma organizada, modular y desplegable mediante contenedores.

La necesidad que motiva el desarrollo de CEREBRO radica en que muchas soluciones existentes ofrecen experiencias fragmentadas: se enfocan solo en la resolución individual del juego, presentan poca gamificación, carecen de modos competitivos bien estructurados o no cuentan con una arquitectura preparada para crecer. Frente a ello, CEREBRO busca responder con una propuesta integral que articule autenticación, progreso, logros, rankings, torneos y validación competitiva, creando una experiencia más completa, coherente y escalable para el usuario.

---

## 2. Planteamiento del Problema

### Descripción del problema

En la actualidad existen múltiples aplicaciones de Sudoku y de juegos de desafío mental; sin embargo, gran parte de estas soluciones se centran únicamente en la resolución individual de partidas y no en la construcción de una experiencia integral alrededor del usuario. Con frecuencia, estas plataformas presentan poca continuidad entre sesiones, escaso seguimiento del progreso, mecanismos limitados de gamificación y una oferta competitiva reducida o poco estructurada.

Esta situación afecta directamente a los usuarios que buscan una experiencia más completa y sostenida en el tiempo. La falta de estadísticas, niveles, logros, rankings y torneos disminuye la motivación para continuar jugando y limita las posibilidades de comparar desempeño, asumir nuevos retos o participar en dinámicas competitivas organizadas. A nivel técnico y operativo, también se evidencia la ausencia de soluciones que integren autenticación, validación competitiva, administración y observabilidad dentro de una misma arquitectura.

Por tanto, el problema central que se busca resolver consiste en diseñar y desarrollar una plataforma de desafío mental que no se limite al juego aislado, sino que articule autenticación, juego, seguimiento del progreso, modos competitivos, torneos, rankings y herramientas administrativas en una solución coherente, mantenible y escalable.

### Restricciones y supuestos de diseño

El proyecto se plantea bajo un conjunto de restricciones técnicas y operativas que delimitan la solución:

- La plataforma deberá construirse sobre una arquitectura basada en contenedores, separando responsabilidades entre frontend, backend principal, backend PvP y backend administrativo.
- La persistencia y la autenticación dependerán de la integración con ROBLE, por lo que el funcionamiento de varios módulos estará condicionado por la disponibilidad y correcta configuración de este servicio externo.
- Los modos competitivos deberán apoyarse en validación server-side, lo que implica una mayor exigencia de coordinación entre servicios y una implementación cuidadosa de reglas de negocio.
- El desarrollo deberá priorizar el juego de Sudoku como base funcional inicial, evitando ampliar prematuramente el alcance hacia otros juegos de desafío mental.
- La solución asumirá la disponibilidad de variables de entorno, conectividad entre contenedores y acceso a un navegador moderno para la ejecución del cliente principal.

Además, se asumirá que la primera etapa del proyecto se centrará en consolidar los módulos esenciales antes de incorporar funcionalidades más avanzadas de expansión, automatización u optimización.

### Alcance

El alcance del proyecto comprenderá el diseño e implementación de una plataforma funcional centrada inicialmente en Sudoku, con los siguientes entregables y fronteras principales:

- autenticación y gestión básica de usuarios
- juego individual de Sudoku con validación, pistas y registro de resultados
- seguimiento del usuario mediante estadísticas, experiencia, niveles, rachas y logros
- partidas PvP con creación de match, unión por código, validación y cierre
- gestión de torneos, incluyendo creación, inscripción, control de estado y ranking
- backend administrativo y dashboard para métricas, observabilidad y operación
- despliegue reproducible mediante contenedores e integración entre servicios

Fuera del alcance inmediato del proyecto quedarán, por ahora, la incorporación de un catálogo amplio de juegos adicionales, esquemas avanzados de monetización, analítica predictiva, infraestructura distribuida de alta complejidad y cualquier funcionalidad que no sea prioritaria para consolidar la plataforma base.

---

## 3. Objetivos

### Objetivo General

Desarrollar una primera versión funcional de la plataforma CEREBRO, centrada inicialmente en Sudoku, que integre juego individual, seguimiento del progreso, gamificación, modos competitivos y una arquitectura modular capaz de sostener la evolución futura del sistema.

### Objetivos Específicos

- Implementar un módulo de autenticación y gestión de usuarios que permita registro, inicio de sesión, verificación de correo, recuperación de contraseña y administración básica del perfil.
- Desarrollar el módulo base de Sudoku, asegurando generación de tableros, validación de movimientos, uso de pistas y registro del resultado de cada partida.
- Incorporar un sistema de seguimiento del usuario que permita medir estadísticas, experiencia, niveles, rachas y logros asociados al desempeño dentro de la plataforma.
- Implementar funcionalidades competitivas que incluyan partidas PvP, creación e inscripción a torneos y generación de rankings a partir de resultados validados por el backend.
- Construir una arquitectura basada en contenedores que separe frontend, backend principal, backend PvP y servicios administrativos, facilitando despliegue, mantenimiento y escalabilidad.
- Definir una estrategia integral de pruebas que permita validar componentes, integraciones, flujos completos y condiciones operativas críticas del sistema.

---

## 4. Estado del Arte y Soluciones Relacionadas

### 4.1 Gamificación

La gamificación se fundamenta en la incorporación de mecánicas propias de los videojuegos en contextos no lúdicos, tales como niveles, puntos de experiencia, logros, misiones periódicas y recompensas virtuales. Diversas plataformas han demostrado que estas estrategias incrementan la retención, el compromiso y la constancia del usuario.

**Duolingo**

Destaca por su sistema de rachas diarias, progresión por niveles y retroalimentación inmediata. Resultan particularmente relevantes:

- La estructura clara de niveles progresivos.
- El refuerzo positivo constante tras cada actividad completada.
- La motivación sostenida mediante metas diarias.

**Khan Academy**

Sobresale por su sistema de insignias y seguimiento detallado del progreso por habilidades. Son de interés:

- El reconocimiento de logros específicos vinculados al desempeño.
- La visualización estructurada del avance del usuario.
- La alineación de la gamificación con métricas objetivas de rendimiento.

---

### 4.2 Modo Torneos

Las plataformas competitivas digitales implementan estructuras organizadas que garantizan equidad, escalabilidad y claridad en la clasificación.

**Chess.com**

Se caracteriza por su sistema de torneos automatizados y rankings dinámicos. Resultan relevantes:

- La implementación de sistemas de eliminación directa.
- Rankings actualizados en tiempo real.
- Emparejamiento competitivo basado en desempeño.

**Plataformas de eSports**

Estas plataformas destacan por la organización de competencias estructuradas a gran escala. Son de interés:

- La utilización de brackets claramente definidos.
- Sistemas de clasificación automática.
- Temporadas competitivas que fomentan continuidad y fidelización.

---

### 4.3 Sudoku Digital

Las aplicaciones modernas de Sudoku incluyen generación automática de tableros, validación de soluciones y múltiples niveles de dificultad.

**Sudoku.com**

Se distingue por su experiencia de usuario intuitiva y variedad de niveles. Resultan relevantes:

- Generación dinámica de tableros.
- Validación automática de errores.
- Diseño accesible y claro.

**WebSudoku**

Destaca por su simplicidad y enfoque directo en la experiencia de juego. Son de interés:

- Interfaz minimalista.
- Claridad en la selección de dificultad.
- Experiencia rápida sin elementos distractores.

---

### 4.4 PvP Digital

El modo jugador contra jugador en entornos digitales requiere mecanismos que garanticen equidad, sincronización y control centralizado.

**Plataformas de ajedrez online**

Se caracterizan por la validación server-side y sincronización precisa de partidas. Resultan relevantes:

- Control central del estado de la partida.
- Prevención de trampas mediante validación en servidor.
- Determinación clara del ganador por tiempo o resultado.

**Juegos de trivia en tiempo real**

Destacan por su dinámica competitiva inmediata. Son de interés:

- Competencia basada en velocidad y precisión.
- Retroalimentación instantánea.
- Experiencia dinámica y directa.

---

El análisis de plataformas consolidadas evidencia que la combinación de progresión estructurada, competencia organizada y experiencia intuitiva constituye un factor determinante en la retención y el compromiso de los usuarios.

CEREBRO se posiciona como un aporte relevante al integrar de manera coherente:

- Gamificación basada en métricas objetivas de desempeño.
- Competencia estructurada mediante PvP y torneos.
- Juego base sólido con validación centralizada.
- Experiencia consistente entre entornos web y móvil.
- Arquitectura tecnológica moderna basada en contenedores.

A diferencia de las plataformas analizadas, que suelen especializarse en uno de estos componentes, CEREBRO propone una integración integral de progresión, competencia y solidez arquitectónica dentro del ámbito de los juegos de desafío mental, configurándose como una contribución innovadora en este contexto.

---

## 5. Requerimientos

## 5.1 Requerimientos Funcionales

Definirán las funciones y comportamientos que deberá ofrecer CEREBRO.

- El sistema deberá permitir el registro, inicio de sesión, verificación de correo y recuperación de contraseña.
- El sistema deberá ofrecer gestión de perfil de usuario, incluyendo alias, avatar y preferencias básicas.
- El sistema deberá implementar Sudoku como juego base, permitiendo seleccionar dificultad, generar tableros válidos y validar partidas.
- El sistema deberá incorporar un sistema de pistas limitadas dentro del modo de juego.
- El sistema deberá registrar el desempeño del usuario para alimentar progresión, experiencia y niveles.
- El sistema deberá incluir gamificación, mediante logros, rachas, recompensas y seguimiento del avance personal.
- El sistema deberá ofrecer un modo PvP, donde dos jugadores compitan resolviendo el mismo tablero en igualdad de condiciones.
- El sistema deberá permitir la creación, inscripción, ejecución y cierre de torneos.
- El sistema deberá generar rankings, tanto globales como por torneo o temporada.
- El sistema deberá incluir herramientas de administración y monitoreo, para consultar métricas del sistema y apoyar la operación de torneos.

## 5.2 Requerimientos No Funcionales

Definirán las condiciones de calidad, restricciones técnicas y atributos que deberá cumplir la plataforma.

- La solución deberá construirse bajo una arquitectura basada en contenedores.
- El backend deberá ser único y compartido entre los clientes web y móvil.
- El sistema deberá contar con validación server-side, especialmente en modos competitivos, para garantizar integridad y evitar trampas.
- La plataforma deberá manejar una API formal y documentada, con contratos claros entre frontend y backend.
- El sistema deberá ser escalable, de forma que permita incorporar nuevos módulos, modos de juego o servicios sin rehacer toda la arquitectura.
- El sistema deberá ser mantenible, separando responsabilidades entre autenticación, juego, torneos, PvP, métricas y administración.
- El despliegue deberá ser reproducible, con configuración clara de ambientes de desarrollo, pruebas y producción.
- La solución deberá garantizar un nivel adecuado de seguridad, mediante autenticación, control de acceso y protección de endpoints sensibles.
- La plataforma deberá procurar consistencia de experiencia entre sus distintos canales de acceso.
- El sistema deberá incluir mecanismos de observabilidad, como métricas, monitoreo de actividad y estado de servicios.
- El producto deberá desarrollarse con enfoque incremental, priorizando funcionalidades esenciales antes de ampliar alcance.

---

## 6. Diseño y Arquitectura

Esta sección describirá cómo se estructurará la solución de CEREBRO a nivel conceptual y técnico, justificando las decisiones que tendrán mayor impacto sobre el desarrollo, la mantenibilidad y la escalabilidad del sistema.

### 6.1 Evaluación de alternativas

Durante el diseño de la solución se contemplarán distintas alternativas tecnológicas y arquitectónicas. La elección final se justificará con base en criterios como escalabilidad, mantenibilidad, desacoplamiento, facilidad de despliegue, integridad competitiva y posibilidad de evolución futura.

Una primera decisión clave consistirá en definir la arquitectura general del sistema. Se podrá optar por una arquitectura monolítica, donde toda la lógica del sistema se concentre en una sola aplicación, o por una arquitectura separada por dominios y contenedores. Se priorizará la separación por módulos y servicios, ya que esto permitirá reducir el acoplamiento, aislar responsabilidades y facilitar que funcionalidades como torneos, PvP, seguimiento del usuario y administración evolucionen de manera independiente.

En el frontend también se evaluarán alternativas. Aunque una implementación basada en HTML, CSS y JavaScript puro podría simplificar el prototipo inicial, se priorizará una solución basada en React para la aplicación principal. Esta decisión se sustentará en la necesidad de reutilizar componentes, manejar estados complejos de juego y soportar flujos amplios como autenticación, perfil, torneos y PvP. En contraste, para el dashboard administrativo se podrá mantener una implementación más ligera, ya que su objetivo será principalmente operativo y no requerirá el mismo nivel de interacción que la aplicación principal.

En cuanto a persistencia y autenticación, se priorizará la integración con ROBLE en lugar de construir desde cero una base de datos propia y un sistema de autenticación propio. Esta decisión permitirá concentrar el esfuerzo en la lógica del producto, acelerar el desarrollo de la primera versión funcional y mantener una fuente común de autenticación y datos entre los distintos servicios del sistema. La principal implicación será la dependencia de un servicio externo, pero para esta etapa se considerará una decisión conveniente por velocidad de desarrollo y centralización.

Para el módulo de Sudoku se evaluarán varias estrategias de generación y resolución. Una posibilidad será trabajar con tableros prefabricados, pero esta opción limitará la variedad y la reproducibilidad. Otra alternativa será utilizar backtracking tradicional como único mecanismo, por su simplicidad de implementación. Sin embargo, se priorizará el uso de Dancing Links (DLX) para la librería especializada de Sudoku, ya que este enfoque modela el problema como exact cover y ofrece una base más rigurosa para generar soluciones válidas, verificar unicidad y soportar validaciones robustas. Esta elección será especialmente importante en escenarios competitivos, donde la equidad del tablero y la posibilidad de auditar la solución serán factores críticos.

Relacionado con lo anterior, se priorizará una generación basada en semillas en lugar de depender de tableros estáticos. El uso de seeds permitirá reproducir exactamente un tablero, compartir la misma instancia entre jugadores, auditar partidas y reducir la necesidad de almacenar grandes catálogos de puzzles. Esta decisión impactará directamente la equidad de PvP y torneos, donde ambos jugadores deberán competir sobre el mismo reto.

En los modos competitivos se evaluará si la validación de jugadas debe hacerse en el cliente o en el servidor. Se priorizará la validación server-side, especialmente en PvP y torneos, porque cuando existen ranking, resultados oficiales o recompensas no será suficiente confiar en la lógica local del frontend. Centralizar la validación en backend permitirá reducir trampas, asegurar consistencia en los resultados y establecer una única fuente de verdad para el estado de la partida.

En la comunicación del módulo PvP también se considerarán varias alternativas. Una opción será utilizar un esquema completamente basado en WebSockets para todo el flujo en tiempo real. Otra será depender exclusivamente de polling. Sin embargo, se priorizará un enfoque híbrido apoyado en polling para consultar estado actual y en webhooks para notificar eventos relevantes del backend. Los webhooks se preferirán frente a una solución exclusivamente basada en sockets porque facilitarán la integración entre servicios, el desacoplamiento entre productores y consumidores de eventos, la auditoría de hitos importantes y las pruebas externas. Al mismo tiempo, el polling seguirá siendo útil para refrescar el estado visible del match en el cliente sin obligar a introducir desde el inicio toda la complejidad operativa de una infraestructura full real-time bidireccional.

Finalmente, en observabilidad se podrá elegir entre incorporar desde el inicio una plataforma más pesada de monitoreo o implementar una estrategia más ligera basada en heartbeats, snapshots y vistas agregadas para administración. Se priorizará esta segunda opción durante la etapa inicial del sistema, ya que permitirá visibilidad operativa suficiente sin aumentar en exceso la complejidad técnica del sistema.

### 6.2 Arquitectura

La arquitectura seleccionada se estructurará alrededor de varios componentes especializados. En la capa de cliente se dispondrá de una aplicación principal para el usuario final, encargada de la experiencia de juego, autenticación, perfil, torneos y flujo PvP. A esto se sumará un dashboard administrativo separado, orientado a métricas, observabilidad y operación de torneos.

En backend se organizará la solución en servicios diferenciados. Un servicio central se encargará de autenticación, seguimiento del usuario, estadísticas, logros, sesiones de juego y torneos. Un segundo servicio se especializará en la lógica PvP, incluyendo creación de partidas, unión por código, validación de jugadas, cierre de partidas y actualización de ranking. Un tercer servicio se enfocará en administración y observabilidad, construyendo vistas agregadas del sistema y facilitando tareas operativas.

Todos estos componentes se desplegarán mediante contenedores, coordinados por una configuración común que permita reproducir el entorno de desarrollo y despliegue. Esta decisión favorecerá la separación de responsabilidades técnicas y facilitará que cada módulo pueda evolucionar con mayor independencia.

La comunicación entre componentes se apoyará principalmente en APIs REST. El frontend consumirá rutas para autenticación, perfil, torneos, estadísticas y PvP. El backend PvP se integrará con el backend principal cuando necesite validar información relacionada con torneos o sincronizar historial competitivo. El backend administrativo consultará los otros servicios para construir snapshots agregados y soportar las operaciones del panel de administración. ROBLE actuará como proveedor común de autenticación y persistencia, sirviendo como base compartida para los distintos dominios del sistema.

Desde la perspectiva de responsabilidades, cada módulo tendrá un rol claro. La aplicación principal se enfocará en la experiencia del usuario. El backend central concentrará las reglas de negocio de usuarios, progreso y torneos. El backend PvP garantizara la integridad competitiva en las partidas uno a uno. El backend administrativo dará soporte operativo y visibilidad al sistema. Esta distribución buscará fortalecer el desacoplamiento y permitir que el crecimiento del proyecto no dependa de un único bloque de software.

La arquitectura también deberá soportar directamente los requerimientos del proyecto. La autenticación y gestión de usuarios deberán resolverse desde el backend central. El Sudoku como juego base deberá apoyarse en generación reproducible por seed, validación y cálculo de progreso. La progresión y gamificación deberán soportarse mediante perfiles, experiencia, logros y rachas. El modo competitivo deberá dividirse entre torneos y PvP. Los rankings deberán construirse tanto para resultados de torneo como para enfrentamientos directos. El despliegue reproducible deberá lograrse mediante contenedores. Finalmente, la validación server-side y la observabilidad deberán alinearse con los requerimientos no funcionales del sistema.

En síntesis, el diseño y la arquitectura de CEREBRO deberán orientarse no solo a que el sistema funcione, sino a que cada decisión técnica responda a una necesidad concreta del producto: reproducibilidad en Sudoku, equidad en competencia, claridad modular, despliegue controlado y capacidad real de evolución futura.

## 7. Implementación

Esta sección documenta lo construido hasta el momento en CEREBRO, mostrando el avance funcional y técnico real del proyecto. Se describen las tecnologías utilizadas, los componentes que ya existen en el repositorio y las integraciones activas entre módulos y servicios externos.

### 7.1 Stack tecnológico

El stack implementado combina tecnologías de frontend, backend, despliegue y soporte operativo que responden a las necesidades actuales del proyecto.

- En la aplicación principal se utiliza React 18 con Vite. Esta elección permite trabajar con una interfaz basada en componentes, manejar estados complejos del juego y mantener una estructura adecuada para crecer hacia flujos de autenticación, perfil, torneos y PvP.
- En el dashboard administrativo se utiliza HTML, CSS y JavaScript del lado del cliente. Esta decisión mantiene el panel ligero y suficiente para tareas operativas, sin introducir una complejidad innecesaria en una interfaz más acotada.
- En backend se utiliza NestJS con TypeScript. Este framework facilita la organización modular del sistema, la definición de controladores y servicios, el uso de DTOs y validaciones, y una estructura clara para separar autenticación, seguimiento, torneos, PvP y administración.
- La persistencia y autenticación se apoyan en ROBLE, que actúa como proveedor externo de base de datos y auth. Esto reduce la necesidad de construir infraestructura propia en esta etapa y centraliza usuarios, tokens y datos persistentes.
- Para despliegue se utilizan Docker, Dockerfiles y docker-compose. Esto permite reproducir el entorno de desarrollo y levantar en conjunto la aplicación principal, los servicios backend y el dashboard administrativo.
- En la capa web se utiliza Nginx como servidor y proxy para redirigir rutas del frontend hacia los distintos servicios backend.
- Para documentación técnica de APIs se utiliza Swagger en los servicios NestJS, lo que facilita inspección, prueba y validación de endpoints.
- Para pruebas se incluyen Jest, Supertest, Vitest y React Testing Library, además de un script en Python para validación del flujo PvP. Esto refleja una estrategia mixta para cubrir frontend, backend e integraciones.
- Existe además una librería separada de Sudoku publicada, enfocada en generación, resolución y validación de tableros.

En conjunto, este stack muestra una implementación alineada con el objetivo del proyecto: construir una plataforma web funcional, modular, reproducible y extensible.

### 7.2 Componentes

El proyecto se encuentra organizado en varios componentes que ya tienen una responsabilidad técnica definida.

#### 7.2.1 Aplicación principal

La aplicación principal corresponde al frontend para usuario final. Desde esta interfaz se encuentran implementados los flujos de:

- autenticación de usuario
- juego individual de Sudoku
- perfil y estadísticas personales
- exploración y gestión de torneos
- flujo PvP mediante código de acceso

Este frontend consume varias APIs y centraliza la experiencia del usuario final en una sola aplicación web.

#### 7.2.2 Backend central de autenticación, personal tracking y torneos

Este servicio concentra la mayor parte de la lógica de negocio no relacionada con PvP directo. Entre sus responsabilidades se encuentran:

- login, signup, verificación de correo, refresh y recuperación de contraseña
- inicialización automática del perfil del usuario autenticado
- manejo de perfiles, experiencia, niveles y rachas
- gestión de logros, sesiones de juego y estadísticas por juego
- creación, consulta, edición y cancelación de torneos
- inscripción de participantes y generación de ranking por torneo
- apertura y cierre de sesiones oficiales de torneo para Sudoku

Este backend ya funciona como servicio central para usuarios, progreso y torneos.

#### 7.2.3 Backend PvP

El backend PvP se encuentra separado del backend central y atiende exclusivamente la lógica competitiva uno contra uno. Implementa:

- creación de partidas
- unión a partidas por código
- validación de jugadas sobre el tablero compartido
- detección de finalización o abandono
- actualización de ranking PvP
- emisión de eventos mediante webhooks
- sincronización del historial PvP hacia el backend principal cuando la configuración de servicio lo permite

Este componente representa el dominio más especializado del sistema y se mantiene desacoplado del backend central para favorecer mantenibilidad y crecimiento futuro.

#### 7.2.4 Backend administrativo

El backend administrativo existe como servicio independiente y se orienta a observabilidad y operación. Entre sus funciones se encuentran:

- exponer métricas agregadas del sistema
- consultar snapshots de usuarios, actividad y torneos
- recibir heartbeats de presencia desde el frontend
- ofrecer datos en vivo para el panel administrativo
- servir como puente operativo hacia los otros servicios

Este componente no se enfoca en la experiencia del jugador, sino en apoyar el monitoreo y la administración del sistema.

#### 7.2.5 Dashboard administrativo

El dashboard administrativo es la interfaz web orientada al rol admin. Desde esta capa se pueden consultar:

- datos agregados del sistema
- gráficas de actividad
- sesiones activas y estados en vivo
- listado y gestión operativa de torneos

Su valor dentro del proyecto está en ofrecer visibilidad del estado del sistema sin depender directamente de herramientas externas.

#### 7.2.6 Librería de Sudoku

El proyecto también incluye una librería especializada en Sudoku. Esta librería concentra funciones de:

- generación de soluciones
- creación de puzzles
- verificación de unicidad
- resolución de tableros
- evaluación de dificultad
- soporte para notas y pistas

Este componente es importante porque encapsula la lógica de juego y evita repetir implementaciónes en otras capas.

### 7.3 Integraciones

La implementación no funciona como un conjunto de módulos aislados, sino como una red de servicios conectados entre sí y con componentes externos.

#### 7.3.1 Integración con ROBLE

La integración más importante del proyecto es con ROBLE. Este servicio se utiliza para:

- autenticación de usuarios
- validación de tokens
- lectura e insercion de datos
- actualización de perfiles, torneos, sesiones, rankings y suscripciones

En la práctica, el backend central y el backend PvP dependen de ROBLE como proveedor común de persistencia y autenticación. Esto significa que gran parte del funcionamiento real del sistema está condicionado por la disponibilidad y configuración correcta de este servicio externo.

#### 7.3.2 Integración entre frontend y backends

La aplicación principal consume rutas del backend central para autenticación, perfil, progreso y torneos, y consume rutas del backend PvP para partidas competitivas. Esta integración se realiza mediante endpoints REST y se apoya en configuración centralizada del cliente para resolver bases URL y tokens.

#### 7.3.3 Integración entre servicios internos

También existe comunicación directa entre servicios backend:

- el backend PvP consulta al backend central cuando necesita validar información de torneos o participantes
- el backend PvP puede sincronizar historial competitivo hacia el backend central
- el backend administrativo consulta tanto al backend central como al backend PvP para construir vistas agregadas del sistema

Esto muestra que la arquitectura ya no es solo modular a nivel de código, sino también a nivel de colaboración entre servicios.

#### 7.3.4 Integración mediante webhooks

En el módulo PvP se encuentra implementado un sistema de suscripción y emisión de webhooks. Su función es notificar eventos importantes de la partida, como:

- inicio del match
- finalización de un jugador
- cierre del match
- abandono

Esta integración se encuentra operativa en backend y también tiene soporte en frontend mediante rutas receptoras en desarrollo y configuración de proxy.

#### 7.3.5 Integración de observabilidad

El frontend principal envía heartbeats al backend administrativo para reportar actividad de usuario, modo de juego, ruta actual y contexto de sesión. A partir de estos heartbeats, el backend admin construye snapshots en vivo que luego son consumidos por el dashboard.

Esta integración muestra que el proyecto no solo implementa funcionalidad de negocio, sino también mecanismos operativos de monitoreo.

## 8. Plan De Pruebas

Esta sección define el plan de pruebas para toda la aplicación CEREBRO. Su propósito será establecer cómo se validará el comportamiento funcional, la integración entre módulos y los principales atributos de calidad del sistema antes de considerar una entrega estable.

### Módulos Alcanzados

El plan deberá cubrir los siguientes módulos y componentes del sistema:

- `Auth`, incluyendo registro, inicio de sesión, verificación de correo, recuperación y cierre de sesión.
- `Sudoku individual`, incluyendo generación de tablero, validación de jugadas, uso de pistas, notas y finalización de partida.
- `Perfil y personal tracking`, incluyendo estadísticas, experiencia, niveles, rachas y logros.
- `Torneos`, incluyendo creación, consulta, inscripción, cambio de estado, ranking y sesión oficial de juego.
- `PvP`, incluyendo creación de partida, unión por código, sincronización de estado, validación server-side, cierre y ranking.
- `Backend administrativo`, incluyendo métricas, snapshots, heartbeats y agregación de estado.
- `Dashboard administrativo`, incluyendo visualización de actividad, torneos y estado de servicios.
- `Integraciones externas`, especialmente ROBLE, webhooks, proxies y comunicación entre contenedores.

### Objetivo General

El objetivo general del plan será comprobar que CEREBRO funcione de manera consistente tanto a nivel de componentes aislados como en flujos completos entre frontend, backend e integraciones externas. Además, el plan deberá ayudar a detectar regresiones, validar los escenarios competitivos y reducir riesgos antes de despliegues o demostraciones del sistema.

### Estrategia De Verificación

La estrategia de validación se organizará en cinco niveles complementarios:

- `Pruebas por componentes`, para validar comportamiento aislado de páginas, componentes, controladores, servicios y utilidades.
- `Pruebas de integración`, para verificar la colaboración entre rutas, validaciones, guards, servicios, persistencia y APIs.
- `Pruebas end-to-end`, para confirmar que los flujos completos del usuario funcionen desde la interfaz hasta la respuesta final del sistema.
- `Pruebas de usabilidad`, para evaluar claridad de flujos, facilidad de uso y comprensión de la interfaz.
- `Pruebas no funcionales`, para revisar aspectos de rendimiento, seguridad básica, resiliencia operativa y consistencia entre contenedores.

### Ambientes Y Datos De Prueba

La ejecución del plan deberá contemplar al menos dos ambientes:

- `Ambiente local integrado`, levantado con `docker-compose`, para validar interacción real entre contenedores.
- `Ambiente controlado de pruebas`, con configuraciones y credenciales separadas, orientado a ejecutar suites automatizadas sin afectar datos operativos.

También deberá prepararse un conjunto de datos de prueba que incluya:

- usuarios válidos, no verificados y administradores
- torneos públicos, privados y oficiales
- partidas PvP abiertas, en curso, finalizadas y abandonadas
- tableros Sudoku por dificultad y seeds conocidas
- datos de ranking, logros y estadísticas para escenarios de consulta

### Herramientas Previstas

La estrategia podrá apoyarse en las herramientas ya alineadas con el stack del proyecto:

- `Jest` para pruebas unitarias y de integración en los servicios NestJS
- `Supertest` para validar endpoints HTTP reales
- `Vitest` y `React Testing Library` para componentes y páginas del frontend principal
- scripts de simulación para escenarios PvP y pruebas repetibles de sincronización
- `Swagger` como apoyo para inspección manual y validación de contratos de API
- `Docker Compose` para levantar escenarios integrados de extremo a extremo

En el caso de la librería de Sudoku, se deberá priorizar la incorporación o consolidación de pruebas automatizadas dedicadas a generación, resolución, unicidad y validación de movimientos, debido a que este componente impacta directamente la equidad del juego y los modos competitivos.

### Pruebas Por Componentes

#### Objetivo

Las pruebas por componentes deberán validar el comportamiento aislado de cada pieza funcional del sistema, comprobando que procese entradas válidas, rechace entradas inválidas y represente el estado esperado en interfaz o backend.

#### Criterios De Éxito

- El componente acepta entradas válidas y genera la salida esperada.
- El componente rechaza datos inválidos antes de ejecutar la lógica principal.
- La acción se delega al servicio, API o utilidad correcta.
- La interfaz refleja de forma coherente estados de carga, éxito y error.
- La unidad probada no introduce efectos colaterales no esperados.

#### Casos Representativos A Cubrir

`Auth`

- inicio de sesión con credenciales válidas e inválidas
- registro con validación de campos obligatorios
- verificación de correo con código válido e inválido
- solicitud y restablecimiento de contraseña
- verificación de token y cierre de sesión

`Sudoku individual`

- generación de tablero por dificultad
- validación de movimientos correctos e incorrectos
- bloqueo de cambios sobre celdas fijas
- consumo correcto de pistas
- cálculo de finalización, tiempo y puntaje
- manejo de notas y restauración de estado de partida

`Perfil y tracking`

- consulta de perfil autenticado
- actualización de alias o datos visibles
- acumulación de experiencia
- avance de nivel
- actualización de racha
- desbloqueo de logros

`Torneos`

- render de listados y detalle
- creación y edición de torneos
- inscripción mediante código o acceso directo
- cambio de estado según rol
- visualización de ranking y participantes

`PvP`

- creación de partida
- unión por código
- validación de jugada en backend
- actualización del estado del match
- cierre por victoria, finalización o abandono
- actualización de ranking competitivo

`Administración`

- recepción de heartbeats
- consolidación de snapshots
- consulta de métricas agregadas
- visualización de estados en el dashboard

### Pruebas De Integración

#### Objetivo

Las pruebas de integración deberán verificar que los módulos colaboren correctamente entre sí, asegurando consistencia entre frontend, backend, validaciones, autenticación, persistencia y servicios auxiliares.

#### Criterios De Éxito

- Los endpoints responden con el código HTTP esperado.
- Las validaciones bloquean payloads inválidos antes de llegar al servicio.
- Las rutas protegidas exigen autenticación y rol cuando corresponda.
- Los servicios comparten información de manera consistente.
- Los errores se manejan de forma controlada sin comprometer la estabilidad del sistema.

#### Flujos Integrados A Priorizar

`Auth + Perfil`

- registro exitoso seguido de inicialización de perfil
- login seguido de consulta de perfil y datos del usuario
- recuperación de contraseña y acceso posterior con la nueva credencial

`Sudoku + Tracking`

- inicio de partida, juego parcial y cierre con actualización de estadísticas
- consumo de pistas con impacto en resultado o puntaje
- persistencia y recuperación del progreso de una sesión

`Torneos + Auth + Sudoku`

- creación de torneo por usuario autenticado
- inscripción de participantes
- apertura de sesión oficial de torneo
- envío de resultado y reflejo en ranking

`PvP + Auth + Backend central`

- creación de partida autenticada
- unión de segundo jugador por código
- validación de jugadas en backend
- finalización del match
- actualización de ranking y sincronización de historial

`Frontend + Admin`

- envío periódico de heartbeats
- construcción de snapshots en backend admin
- visualización de actividad en el dashboard

`Servicios + ROBLE`

- autenticación con token válido
- lectura y escritura de datos de perfil, torneo, sesión y ranking
- manejo controlado de respuestas inválidas o indisponibilidad temporal del servicio externo

### Pruebas End-To-End

#### Objetivo

Las pruebas end-to-end deberán confirmar que los flujos completos más relevantes para el usuario final y para operación administrativa funcionen de punta a punta en un entorno lo más cercano posible al real.

#### Escenarios End-To-End Prioritarios

- un usuario se registra, verifica correo, inicia sesión y accede a su perfil
- un usuario inicia una partida de Sudoku, la completa y visualiza la actualización de su progreso
- un usuario crea un torneo, comparte el acceso y consulta su ranking
- dos usuarios juegan una partida PvP desde clientes distintos y el sistema determina correctamente el resultado
- el frontend reporta actividad al backend admin y el dashboard refleja esa actividad en vivo
- un administrador consulta métricas y el estado de torneos desde el panel

### Pruebas De Usabilidad

Las pruebas de usabilidad deberán aplicarse con usuarios o participantes externos para evaluar:

- claridad del flujo de autenticación
- facilidad para iniciar y completar una partida de Sudoku
- comprensión del flujo de unión a torneos y PvP
- visibilidad de mensajes de error, éxito y estados de carga
- comprensión del dashboard por parte de un rol administrador

Como criterio de resultado, se buscará identificar tareas que los usuarios no logren completar, puntos de confusión, pasos redundantes y oportunidades de mejora en la interfaz.

### Pruebas No Funcionales

#### Rendimiento

Se deberá medir el comportamiento del sistema ante operaciones frecuentes como:

- carga inicial del frontend
- consulta de torneos y rankings
- generación de tablero Sudoku
- validación repetida de jugadas en PvP
- agregación de snapshots en backend admin

#### Seguridad Básica

Se deberá verificar, al menos, lo siguiente:

- acceso restringido a rutas protegidas sin token
- rechazo de roles no autorizados en acciónes administrativas
- validación de payloads malformados
- protección básica frente a manipulación de parametros en torneos y PvP

#### Resiliencia Operativa

Se deberán simular fallos controlados para observar:

- comportamiento del sistema cuando ROBLE no responde
- continuidad del frontend si un backend específico se encuentra caído
- recuperación del entorno al reiniciar contenedores
- manejo de reintentos o mensajes de error ante pérdida temporal de conectividad

### Prioridad De Ejecucion

La ejecución del plan deberá priorizarse en este orden:

1. `Auth`, por ser la puerta de entrada a la mayoría de flujos.
2. `Torneos` y `PvP`, por su impacto funcional y competitivo.
3. `Sudoku individual` y `tracking`, por afectar directamente la experiencia base del producto.
4. `Administración` e `integraciones`, por su impacto operativo.
5. `Usabilidad` y pruebas no funcionales, una vez estabilizados los flujos principales.

### Criterios De Entrada Y Salida

#### Criterios De Entrada

- servicios principales desplegados y configurados
- variables de entorno definidas
- conectividad disponible con ROBLE o dobles de prueba equivalentes
- datos de prueba cargados
- suites automatizadas configuradas por módulo

#### Criterios De Salida

- los casos críticos de autenticación, Sudoku, torneos y PvP ejecutan sin fallos bloqueantes
- no existen errores severos abiertos en flujos principales
- las integraciones entre servicios responden de forma consistente
- el dashboard refleja actividad real del sistema
- los hallazgos restantes se encuentran clasificados y con plan de corrección

### Resultado Esperado Del Plan

La aplicación deberá contar con una estrategia de pruebas integral que no solo valide componentes aislados, sino también la colaboración real entre contenedores, la equidad en modos competitivos, la estabilidad de las integraciones y la experiencia general de uso. De esta manera, el proyecto podrá avanzar con mayor confianza hacia demostraciones, iteraciones funcionales y futuras etapas de despliegue.
