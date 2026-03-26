# Componentes del Sistema e Interacción

## Descripción general

Este documento describe la arquitectura general de CEREBRO, explicando cómo se organizan sus componentes, cómo interactúan entre sí y qué decisiones técnicas justifican la estructura adoptada. Su propósito es mostrar de forma explícita la composición del sistema, los criterios considerados al definir la solución arquitectónica y las razones por las cuales se eligió una arquitectura modular, escalable y orientada al mantenimiento.

## Criterios de comparación

Para definir la arquitectura final del sistema, se tuvieron en cuenta los siguientes criterios de comparación entre las posibles alternativas de diseño:

- **Escalabilidad**: Se evaluó qué tan fácil sería aumentar la capacidad del sistema a medida que creciera la cantidad de usuarios, partidas y torneos simultáneos.

- **Mantenibilidad**: Se comparó qué enfoque permitía modificar, corregir o extender funcionalidades con menor impacto en el resto del sistema.

- **Desacoplamiento**: Se consideró el nivel de independencia entre módulos para evitar dependencias innecesarias y facilitar la evolución del proyecto.

- **Reutilización**: Se analizó qué tan sencillo sería reutilizar componentes, lógica de negocio e interfaces en distintas partes de la plataforma.

- **Experiencia de usuario**: Se valoró la capacidad de la arquitectura para sostener una experiencia consistente, fluida y adaptable tanto en web como en una futura aplicación móvil.

- **Facilidad de integración**: Se tomó en cuenta la posibilidad de integrar servicios externos, nuevos juegos o módulos adicionales sin rediseñar por completo la solución existente.

## Preguntas clave

Antes de definir la arquitectura final, se plantearon varias preguntas clave que guiaron la toma de decisiones:

- **¿Cómo organizar el sistema para que pueda crecer sin volverse difícil de mantener?**

- **¿Qué tipo de estructura permite integrar nuevos módulos o modos de juego con el menor impacto posible?**

- **¿Cómo garantizar una comunicación clara entre frontend, backend, base de datos y servicios complementarios?**

- **¿Qué enfoque facilita una futura transición o ampliación hacia una aplicación móvil?**

- **¿Cómo evitar que una sola parte del sistema concentre demasiadas responsabilidades?**

- **¿Qué arquitectura responde mejor a los requerimientos de rendimiento, escalabilidad y evolución del proyecto?**

## Evolución de la arquitectura

Antes de consolidar la arquitectura final de CEREBRO, se contemplaron varios enfoques iniciales que parecían viables en una primera etapa del proyecto. Sin embargo, al analizar mejor los requerimientos funcionales, la escalabilidad esperada y la necesidad de mantener separados los distintos dominios del sistema, se tomaron decisiones arquitectónicas más sostenibles.

- **Inicialmente se pensó en una arquitectura monolítica** para acelerar el desarrollo del primer prototipo, concentrando autenticación, torneos, seguimiento, Sudoku y PvP en una sola aplicación. Posteriormente, se decidió separar responsabilidades en módulos y servicios especializados porque esto reduce el acoplamiento, facilita el mantenimiento y permite escalar únicamente las partes con mayor carga, como PvP o torneos.

- **En un inicio se consideró centralizar toda la lógica de negocio directamente en el backend principal**, con el fin de simplificar la comunicación entre componentes. No obstante, se optó por una distribución más clara de responsabilidades, ya que cada funcionalidad tiene reglas particulares y ciclos de evolución diferentes. Esta decisión mejora la claridad del sistema y permite extender nuevos modos de juego sin afectar de forma significativa el resto de la plataforma.

- **También pudo haberse planteado una comunicación interna más directa y dependiente entre módulos**, donde un componente conociera detalles internos de otro. Finalmente, se prefirió trabajar con interfaces y APIs bien definidas porque esto favorece el desacoplamiento, disminuye el riesgo de regresiones y hace que los cambios en un módulo no obliguen a rediseñar todo el sistema.

- **Se pensó como posibilidad inicial manejar una sola aplicación cliente con enfoque generalista**, sin distinguir demasiado entre necesidades web y móviles. Después se entendió que la experiencia del usuario debía ser consistente pero adaptable al contexto de uso, por lo que el frontend se concibió como una capa preparada para servir distintas interfaces manteniendo una lógica coherente de interacción.

- **Inicialmente el frontend fue planteado y desarrollado con JavaScript, CSS y HTML puro**, como una forma directa de construir las primeras interfaces y validar rápidamente el comportamiento visual del sistema. Más adelante, se decidió migrar a React porque este enfoque facilita la organización por componentes, mejora la reutilización de interfaces y deja una base mucho más conveniente para evolucionar hacia una aplicación móvil con una lógica de presentación más mantenible y adaptable.

- **Otra idea inicial habría sido dejar funcionalidades como rankings, validaciones o generación de tableros embebidas de manera directa en el núcleo del sistema**. La decisión final fue tratarlas como servicios complementarios o especializados, ya que eso mejora la reutilización, facilita su optimización por separado y permite evolucionarlas sin comprometer el flujo principal de autenticación, juego y gestión de torneos.

- **Incluso se podría haber priorizado una base de datos diseñada únicamente para almacenamiento inmediato**, pensando solo en resolver el registro de usuarios y partidas. Sin embargo, se definió una estructura orientada también a consultas, seguimiento de progreso e integridad de la información, porque el sistema no solo necesita guardar datos, sino convertirlos en soporte para estadísticas, historial y decisiones de juego.

## 1. Descripción de Componentes

### Componentes principales

El sistema CEREBRO está compuesto por los siguientes componentes principales:

- **Frontend**: Este componente es la interfaz gráfica y el punto de contacto directo con los usuarios finales. Incluye tanto la aplicación web como la aplicación móvil, diseñadas para ofrecer una experiencia de usuario coherente y atractiva. Por ejemplo, en el archivo `Frontend/Principal/src/App.jsx`, se define la estructura principal de la aplicación web, utilizando React para gestionar los componentes y el estado de la aplicación. Además, el archivo `vite.config.js` configura el entorno de desarrollo para optimizar el rendimiento y la experiencia del usuario.

- **Backend**: El backend es el corazón del sistema, compuesto por múltiples servicios especializados que trabajan en conjunto para proporcionar las funcionalidades principales. Por ejemplo, en el módulo `AuthPersonalTrackingTorneos`, el archivo `app.module.ts` define los módulos y servicios que gestionan la autenticación y el seguimiento de los usuarios. En el módulo `PvP`, el archivo `app.controller.ts` contiene los controladores que manejan las solicitudes de los usuarios para las partidas en tiempo real. La arquitectura de microservicios permite que estos módulos operen de manera independiente, facilitando la escalabilidad y el mantenimiento.

- **Base de datos**: La base de datos es el repositorio central de toda la información del sistema. Por ejemplo, en el módulo `AuthPersonalTrackingTorneos`, los datos de los usuarios y sus progresos se almacenan en tablas relacionales, mientras que en el módulo `PvP`, se registran los resultados de las partidas y las clasificaciones de los jugadores. El diseño de la base de datos está optimizado para realizar consultas rápidas y garantizar la integridad de los datos.

- **Servicios externos**: Estos servicios complementan las funcionalidades del sistema principal. Por ejemplo, el sistema de ranking utiliza un algoritmo ELO para clasificar a los jugadores en el modo PvP, asegurando partidas equilibradas y competitivas. Además, se utilizan servicios de validación para garantizar que los tableros de Sudoku generados sean válidos y cumplan con las reglas del juego.

### Responsabilidad de cada componente

- **Frontend**: Su principal responsabilidad es proporcionar una interfaz de usuario que sea fácil de usar y que permita a los usuarios interactuar con el sistema de manera eficiente. Esto incluye la visualización de tableros de juego, estadísticas, clasificaciones y la gestión de torneos. Por ejemplo, el archivo `Frontend/Principal/src/pages/torneos.js` permite a los usuarios visualizar y unirse a torneos activos.

- **Backend**: Es responsable de procesar las solicitudes de los usuarios, ejecutar la lógica del juego y garantizar la seguridad y la integridad de los datos. Por ejemplo, el archivo `Backend/AuthPersonalTrackingTorneos/src/auth/auth.service.ts` contiene la lógica para autenticar a los usuarios y gestionar sus sesiones de manera segura.

- **Base de datos**: Su función principal es almacenar y gestionar de manera estructurada y segura los datos del sistema. Esto incluye la gestión de usuarios, partidas, torneos y cualquier otra información relevante para el funcionamiento del sistema. Por ejemplo, el diseño de las tablas en el módulo `AuthPersonalTrackingTorneos` permite almacenar información detallada sobre los usuarios, como su progreso en los juegos y su historial de torneos.

- **Servicios externos**: Estos servicios tienen la responsabilidad de realizar tareas específicas que complementan las funcionalidades del sistema, como la generación de tableros de Sudoku, la validación de soluciones y el cálculo de rankings. Por ejemplo, el módulo `Sudoku` incluye funciones en `functions.js` para generar tableros de Sudoku de diferentes niveles de dificultad.

### Relación con los requerimientos del sistema

Cada componente está diseñado para cumplir con los objetivos del sistema:

- **Frontend**: Satisface la necesidad de una interfaz accesible y multiplataforma, permitiendo a los usuarios interactuar con el sistema desde cualquier dispositivo.
- **Backend**: Asegura la escalabilidad y la integración de los diferentes módulos, permitiendo que el sistema crezca y evolucione con el tiempo.
- **Base de datos**: Responde a la necesidad de un almacenamiento seguro y eficiente, garantizando la integridad y disponibilidad de los datos.
- **Servicios externos**: Complementan las funcionalidades del sistema, mejorando la experiencia del usuario y optimizando el rendimiento general.

---

## 2. Interacción entre Módulos

### Comunicación entre componentes

- **Flujos de datos**: Los datos fluyen de manera bidireccional entre el frontend y el backend a través de APIs RESTful. Por ejemplo, cuando un usuario inicia sesión, el frontend envía las credenciales al backend mediante una solicitud POST a la ruta definida en `auth.controller.ts`. El backend valida las credenciales y responde con un token de autenticación que el frontend utiliza para realizar solicitudes posteriores. Además, el backend se comunica con la base de datos para almacenar y recuperar información, como el progreso de los usuarios, los resultados de los torneos y las estadísticas de las partidas.

- **Dependencias**: Los módulos del sistema están diseñados para ser independientes, pero existen dependencias bien definidas entre ellos. Por ejemplo, el módulo de torneos depende del módulo de autenticación para verificar la identidad de los participantes, mientras que el módulo de PvP utiliza servicios externos para validar los tableros y calcular los rankings. Estas dependencias están gestionadas mediante interfaces claras y estandarizadas, lo que facilita la integración y el mantenimiento del sistema.

- **Nivel de acoplamiento**: El sistema sigue una arquitectura de microservicios, lo que permite un bajo nivel de acoplamiento entre los módulos. Esto significa que cada módulo puede desarrollarse, desplegarse y escalarse de manera independiente, lo que facilita su mantenimiento y evolución. Por ejemplo, si se desea agregar un nuevo juego a la plataforma, solo sería necesario desarrollar un nuevo módulo y conectarlo al sistema existente a través de las APIs definidas.

---

## 3. Comportamiento

### Análisis del comportamiento de los componentes

- **¿El flujo es eficiente?**
  - El flujo de datos en el sistema está diseñado para ser lo más eficiente posible. Las APIs RESTful permiten una comunicación rápida y confiable entre el frontend y el backend, mientras que la arquitectura de microservicios asegura que las operaciones se distribuyan de manera equitativa entre los diferentes servicios. Por ejemplo, el sistema de validación de tableros de Sudoku utiliza algoritmos optimizados en el archivo `Sudoku/functions.js` para garantizar una respuesta rápida incluso en momentos de alta demanda.

- **¿Existen cuellos de botella?**
  - Los posibles cuellos de botella se encuentran en la validación de tableros y en la gestión de torneos en tiempo real, especialmente durante eventos de alta concurrencia. Para mitigar estos problemas, se han implementado estrategias como la optimización de consultas a la base de datos en el módulo `AuthPersonalTrackingTorneos` y el uso de colas de mensajes en el backend para procesar tareas en segundo plano. Por ejemplo, el sistema de torneos utiliza un diseño distribuido que permite manejar múltiples eventos simultáneamente sin afectar el rendimiento.

- **¿La interacción refleja buen desacoplamiento?**
  - Sí, los componentes están diseñados para ser independientes y comunicarse a través de interfaces bien definidas, lo que facilita su mantenimiento y escalabilidad. Por ejemplo, el módulo de PvP puede ser actualizado o reemplazado sin afectar el funcionamiento de los demás módulos, siempre y cuando se mantengan las interfaces de comunicación establecidas. Esto se logra mediante el uso de controladores como `app.controller.ts` en el módulo `PvP`, que define claramente las rutas y los métodos disponibles para interactuar con otros módulos.

---

## Cierre

La arquitectura de CEREBRO está diseñada para abordar de manera efectiva los desafíos de las plataformas de juegos mentales, como la falta de integración y escalabilidad en sistemas existentes. Las decisiones clave, como la adopción de una arquitectura de microservicios, el uso de APIs RESTful y la integración de servicios externos, se reflejan en los diagramas de arquitectura e interacción. Estas decisiones permiten que el sistema sea modular, escalable y fácil de mantener. Además, el enfoque en la experiencia del usuario y la integración de funcionalidades avanzadas, como el sistema de ranking ELO y la validación de tableros de Sudoku, garantizan una experiencia de usuario de alta calidad. Las fortalezas del sistema incluyen su diseño modular, su capacidad para escalar y su enfoque en la satisfacción del usuario, lo que lo posiciona como una solución innovadora y eficiente en el ámbito de los juegos mentales.
