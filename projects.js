// Una sola fuente de contenido para la bandeja, la navegación y la pantalla LCD.
// Mantener cada afirmación dentro de lo que respalda el CV v7.2 y el estado real del artefacto.
export const socialLinks = [
  { label: 'GitHub', mark: 'GH', network: 'github', art: 'assets/social/github-voxel.webp', url: 'https://github.com/danielunibe' },
  { label: 'LinkedIn', mark: 'in', network: 'linkedin', art: 'assets/social/linkedin-voxel.webp', url: 'https://www.linkedin.com/in/danielunibe' },
  { label: 'Dribbble', mark: 'Dr', network: 'dribbble', art: 'assets/social/dribbble-voxel.webp', url: 'https://dribbble.com/daniel_unibe' },
  { label: 'CodePen', mark: '</>', network: 'codepen', art: 'assets/social/codepen-voxel.webp', url: 'https://codepen.io/Daniel-Unibe' }
];

export const cartridges = [
  {
    id: 0,
    key: 'perfil',
    label: 'PERFIL',
    title: 'Perfil profesional',
    kicker: 'PRODUCT DESIGNER · UX/UI',
    shell: 'red',
    theme: 'profile',
    cover: 'assets/covers/perfil-voxel-red.png',
    summary: 'Diseño productos digitales complejos y convierto necesidades de usuarios y operación en flujos, reglas de interacción y prototipos funcionales.',
    menuTitle: 'Conoce mi enfoque',
    items: [
      {
        title: 'Propuesta de valor',
        navTitle: 'Mi propuesta',
        tag: 'Product Designer · UX/UI',
        icon: 'spark',
        previewSummary: 'Conecto necesidades de las personas y objetivos operativos con productos claros y útiles.',
        summary: 'Conecto las necesidades de las personas con objetivos operativos para dar forma a productos digitales claros y útiles.',
        context: 'Mi trayectoria combina herramientas internas, servicios digitales de gobierno estatal, trabajo independiente y productos propios desde cero.',
        responsibility: 'Mi posición principal es Product Designer / UX/UI, con énfasis en definición de producto, sistemas de interacción y prototipado.',
        evidence: ['Casi cuatro años de experiencia en herramientas internas y servicios digitales de gobierno estatal.', 'Colaboración con Desarrollo y Operaciones para convertir necesidades en soluciones funcionales.'],
        status: 'Perfil profesional basado en el CV v7.2.'
      },
      {
        title: 'Enfoque de diseño',
        navTitle: 'Cómo diseño',
        tag: 'Interacción y prototipado',
        icon: 'cursor',
        previewSummary: 'Hago visibles flujos, estados y decisiones antes de construir.',
        summary: 'Diseño para que los flujos, estados y decisiones del producto puedan entenderse antes de construirlos.',
        context: 'Trabajo con requisitos, arquitectura de información, interacción, accesibilidad y comportamiento responsivo.',
        responsibility: 'Uso Figma y prototipos funcionales; recurro a herramientas web y código cuando ayudan a comprobar el comportamiento.',
        evidence: ['Human-AI Interaction complementa mi enfoque de diseño de productos.', 'La asistencia de IA se presenta como apoyo al prototipado, no como certificación profesional.'],
        status: 'Diseño de producto y UX/UI como identidad principal.'
      },
      {
        title: 'Formación y perfil',
        navTitle: 'Formación',
        tag: 'UNIAT · Plan concluido',
        icon: 'book',
        previewSummary: 'Diseño y comunicación visual aplicados a productos y sistemas digitales.',
        summary: 'Formación en diseño y comunicación visual, con interés aplicado en sistemas digitales y productos interactivos.',
        context: 'UNIAT: plan concluido; proceso de titulación en trámite.',
        responsibility: 'Español nativo; inglés técnico y audiovisual, con conversación profesional en desarrollo.',
        evidence: ['El CV completo puede consultarse cuando se agregue un enlace público aprobado.'],
        status: 'Información académica y de idiomas según el CV v7.2.'
      }
    ],
    links: socialLinks
  },
  {
    id: 1,
    key: 'trabajo',
    label: 'TRABAJO',
    title: 'Trabajo y prototipos',
    kicker: 'PRODUCTOS · CASOS · CÓDIGO',
    shell: 'teal',
    theme: 'work',
    cover: 'assets/covers/trabajo-voxel.webp',
    summary: 'Proyectos propios, experiencias digitales y prototipos con su nivel de disponibilidad y madurez a la vista.',
    menuTitle: 'Selecciona un caso',
    intro: 'UNOVA funciona como laboratorio de proyectos. Cada caso conserva su estado real: público, privado o en desarrollo.',
    items: [
      {
        title: 'Pulsaria / PulsarIA',
        navTitle: 'Pulsaria',
        tag: 'Público · Evaluación',
        icon: 'spark',
        summary: 'Producto propio con repositorio público y una versión de evaluación.',
        context: 'El código permite inspeccionar el trabajo directamente desde GitHub.',
        responsibility: 'Proyecto independiente de producto y diseño.',
        evidence: ['Repositorio público: danielunibe/PulsarIA.', 'Estado: versión pública de evaluación.'],
        status: 'Código público · evaluación',
        links: [{ label: 'Abrir repositorio', url: 'https://github.com/danielunibe/PulsarIA' }]
      },
      {
        title: 'vivo Promotor',
        tag: 'Privado · En uso',
        icon: 'phone',
        summary: 'Experiencia móvil orientada al trabajo de promotores en campo.',
        context: 'La aplicación es privada y se utiliza en trabajo de campo.',
        responsibility: 'El caso se centra en UX/UI móvil y en la evolución continua de la herramienta.',
        evidence: ['Aplicación privada en uso real en campo.', 'Iteración continua.'],
        status: 'Uso privado en campo · sin demo pública'
      },
      {
        title: 'VoyagerOS',
        tag: 'Nativo · En validación',
        icon: 'desktop',
        summary: 'Experiencia nativa para escritorio con una versión ejecutable.',
        context: 'Proyecto en etapa de estabilización y validación.',
        responsibility: 'Prototipo de producto digital en desarrollo.',
        evidence: ['Existe una versión nativa ejecutable.', 'Estabilización y validación en curso.'],
        status: 'En estabilización y validación'
      },
      {
        title: 'Julia',
        tag: 'En desarrollo',
        icon: 'grid',
        summary: 'Prototipo de producto en desarrollo.',
        context: 'La exploración continúa; se mostrará una demo solo cuando exista una versión lista para compartir.',
        responsibility: 'Proyecto propio en etapa de prototipo.',
        evidence: ['Estado actual: prototipo en desarrollo.'],
        status: 'En desarrollo · sin demo pública'
      }
    ]
  },
  {
    id: 2,
    key: 'experiencia',
    label: 'EXPERIENCIA',
    title: 'Experiencia profesional',
    kicker: 'RECORRIDO · RESPONSABILIDADES · EVIDENCIA',
    shell: 'purple',
    theme: 'experience',
    cover: 'assets/covers/experiencia-voxel.webp',
    summary: 'Un recorrido por los equipos, servicios y herramientas donde he aplicado diseño digital y análisis de sistemas.',
    menuTitle: 'Explora mi trayectoria',
    items: [
      {
        title: 'LUKTEC',
        icon: 'layers',
        period: '2025 — agosto de 2026',
        summary: 'Diseño de flujos y herramientas digitales a partir de necesidades operativas.',
        context: 'Trabajo con necesidades de operación para estructurar soluciones y experiencias de producto.',
        responsibility: 'UX/UI, definición de flujos y prototipos funcionales, en colaboración con los equipos involucrados.',
        evidence: ['Análisis de necesidades operativas.', 'Exploración de IA y automatización.'],
        status: 'Experiencia profesional según el CV v7.2.'
      },
      {
        title: 'Secretaría de la Hacienda Pública de Jalisco',
        navTitle: 'Hacienda Jalisco',
        previewTitle: 'Hacienda Jalisco',
        icon: 'building',
        period: '2021 — mayo de 2025',
        summary: 'Experiencia institucional en diseño digital, innovación interactiva y análisis de sistemas.',
        context: 'El recorrido incluye los puestos de Especialista en Diseño Digital e Innovación Interactiva y Analista de Sistemas B.',
        responsibility: 'Diseño y análisis aplicados a herramientas internas, servicios y procesos institucionales.',
        evidence: ['FirmaDesk: más de 900 registros documentados en cinco sedes; la herramienta seguía en uso tras mi salida.', 'Auditorías de accesibilidad alineadas con WCAG 2.1 AA: más de 15 puntos críticos documentados.', 'Hacienda Hub y la app al contribuyente formaron parte de este trabajo.'],
        status: 'La Hacienda es una experiencia laboral; sus iniciativas aparecen dentro de este puesto.'
      },
      {
        title: 'Vitalfarma',
        icon: 'health',
        period: '2018–2019 y 2020–2021',
        summary: 'Experiencia de servicio y operación en una franquicia de farmacia-consultorio.',
        context: 'El trabajo abarcó la experiencia de servicio y los protocolos operativos.',
        responsibility: 'Participación en identidad y sistema visual de la franquicia.',
        evidence: ['Protocolos operativos.', 'Identidad y sistema visual de farmacia-consultorio.'],
        status: 'Periodos de experiencia según el CV v7.2.'
      }
    ]
  },
  {
    id: 3,
    key: 'metodo',
    label: 'MÉTODO',
    title: 'Cómo trabajo',
    kicker: 'PRODUCT THINKING · UX/UI · PROTOTIPADO',
    shell: 'lime',
    theme: 'method',
    cover: 'assets/covers/metodo-voxel.webp',
    summary: 'Asumo ownership del problema de diseño y conecto contexto, alcance, reglas de interacción y prototipos para que el equipo pueda evaluar la solución.',
    menuTitle: 'Recorre mi proceso',
    intro: 'Esta secuencia resume prácticas observables en mi trayectoria; se adapta al contexto y no se presenta como una metodología certificada.',
    items: [
      {
        title: '01 · Entender el contexto',
        navTitle: 'Contexto',
        icon: 'search',
        previewSummary: 'Personas, necesidades, objetivos y restricciones antes de diseñar.',
        summary: 'Alinear necesidades de usuarios y operación con objetivos, restricciones y personas involucradas.',
        context: 'Antes de diseñar, identifico quién usa el producto, qué necesita resolver y qué condiciona la solución.',
        responsibility: 'Escuchar, investigar lo disponible y hacer explícitos los supuestos relevantes.',
        evidence: ['Necesidades operativas y requisitos trabajados con Desarrollo y Operaciones.'],
        status: 'Punto de partida'
      },
      {
        title: '02 · Definir problema y alcance',
        navTitle: 'Definición',
        icon: 'target',
        previewSummary: 'Un problema claro y un alcance que el equipo pueda discutir.',
        summary: 'Convertir hallazgos en un problema de diseño y un alcance que el equipo pueda discutir.',
        context: 'La definición ordena requisitos, flujos de trabajo y arquitectura de información.',
        responsibility: 'Separar lo que debe resolverse ahora de lo que requiere validación adicional.',
        evidence: ['Requisitos, arquitectura de información y flujos forman parte de las capacidades documentadas en el CV.'],
        status: 'Definición de producto'
      },
      {
        title: '03 · Diseñar reglas de interacción',
        navTitle: 'Interacción',
        icon: 'flow',
        previewSummary: 'Jerarquía, estados y comportamiento del producto, más allá de las pantallas.',
        summary: 'Aclarar jerarquía, estados, casos límite, comportamiento responsivo y accesibilidad.',
        context: 'El flujo se especifica como comportamiento, no solo como una secuencia de pantallas.',
        responsibility: 'Hacer visibles las respuestas del producto y los escenarios que el diseño debe cubrir.',
        evidence: ['Trabajo documentado en sistemas de interacción, responsive y accesibilidad.'],
        status: 'Sistema de interacción'
      },
      {
        title: '04 · Prototipar para probar',
        navTitle: 'Prototipo',
        icon: 'cursor',
        previewSummary: 'Prototipos para revisar estructura, flujos y comportamiento.',
        summary: 'Elegir el nivel de prototipo adecuado para revisar estructura, flujo y comportamiento.',
        context: 'Figma resuelve exploraciones de interfaz; web y código permiten comprobar prototipos funcionales cuando aportan valor.',
        responsibility: 'Colaborar con Desarrollo y Operaciones para acercar el diseño a una solución implementable.',
        evidence: ['Prototipos funcionales y herramientas web entre las prácticas documentadas.'],
        status: 'Prototipado'
      },
      {
        title: '05 · Iterar con evidencia',
        navTitle: 'Iteración',
        icon: 'loop',
        previewSummary: 'Evidencia disponible para tomar la siguiente decisión.',
        summary: 'Revisar el resultado con la evidencia disponible y ajustar la siguiente decisión.',
        context: 'La evidencia puede ser un artefacto, un estado verificable del producto o señales de uso cuando existen.',
        responsibility: 'Distinguir lo comprobado de lo que aún se necesita validar.',
        evidence: ['No se agregan métricas, pruebas formales ni resultados cuantificados sin respaldo documental.'],
        status: 'Aprendizaje continuo'
      }
    ]
  }
];
