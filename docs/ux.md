# Análisis de uso (UX): recorridos, fricciones y plan

Objetivo: que la app la use **cualquier persona sin conocimientos técnicos** — el dueño de una pensión de 60 años, un
recepcionista nuevo o un huésped extranjero — con un orden lógico, un asistente que guíe y un diseño cuidado.

Método: recorrido completo de la versión de `main` (PR #1–#4) en Chromium, en un móvil emulado (Pixel 7) y en
escritorio, con la demo; lectura del código de cada pantalla. Personas de referencia:

- **Carmen, 60 años, dueña de una pensión.** Usa WhatsApp y el correo; no sabe qué es un «XML» ni un «código INE».
  Le preocupa equivocarse con el Ministerio.
- **Iván, recepcionista nuevo.** Tiene prisa en el mostrador; necesita saber *qué hacer ahora* con cada reserva.
- **Anna, huésped alemana.** Rellena en su móvil, en alemán, con su *Personalausweis* (no tiene DNI ni NIE).

## 1. Recorridos actuales y puntos de fricción

### 1.1 Primer uso
Crear contraseña → aterriza en «Lista del día» **vacía** con un aviso «Configura tu establecimiento en Ajustes».

- Nada explica qué viene después: el orden correcto (establecimiento → reserva → enlace → fichero → copia) solo está en
  el README, que Carmen no va a leer.
- La pantalla de contraseña dice que no se recupera, pero no qué *significa* en la práctica ni cómo protegerse
  (copia de seguridad, apuntarla).
- «Código de establecimiento»: no dice de dónde sale ni qué hacer si todavía no se tiene (¿se puede seguir?).
- *Ajustes* es una página larguísima que mezcla datos del establecimiento, seguridad, copias, purga y «Borrar todo».
- No hay forma de practicar sin ensuciar los datos reales.

### 1.2 Día a día en recepción
- **En el móvil y en tablets estrechas la tabla del día esconde fuera de pantalla las columnas clave** (estado del
  parte, plazo de 24 h y el botón «Abrir»): hay que desplazarla de lado.
- El aviso de 24 h dice «1 parte ha superado el plazo» pero no *cuál* ni lleva a él.
- La acción más frecuente (escanear el QR del huésped) exige abrir la reserva y bajar hasta el final; desde «Hoy» no
  hay atajo. «Bloquear» ocupa más sitio que «Nueva reserva».
- En la ficha de la reserva el orden es el inverso al uso: datos de contrato arriba, enlace del huésped y escáner
  abajo del todo. No dice cuál es el **siguiente paso**. La revisión enumera errores sin llevar a corregirlos. El pago
  aparece como código crudo («EFECT»).
- La navegación se parte en dos líneas en el móvil y no tiene iconos.

### 1.3 Huésped
- Bienvenida clara y en 6 idiomas, pero el formulario es largo y **sin ayudas**: «Tipo de documento» no orienta a quien
  no tiene documento español (¿«Pasaporte» u «Otro documento» con un carné de identidad alemán?).
- «Número de soporte» tiene una ayuda de una línea sin ejemplo; el huésped no sabe dónde mirar.
- El formato esperado de cada número (DNI, NIE, pasaporte) no se muestra hasta que hay un error.
- No hay un sitio con preguntas frecuentes para el huésped («¿por qué me piden esto?», «¿a dónde van mis datos?»).

### 1.4 Exportar
- Jerga: «apartado 3», «partes de viajeros», «alta masiva». No queda claro qué tipo elegir.
- Tras descargar, el paso decisivo (subirlo al portal) es un texto más entre otros.
- Nada advierte del riesgo de **enviar dos veces** cuando hay un programa de gestión (AM HOTEL u otros) que ya comunica.
- No hay ayuda para «el portal ha rechazado el fichero».

### 1.5 Copias de seguridad
- Escondidas en *Ajustes*. No hay **recordatorio** ni se sabe cuándo se hizo la última. Es el punto más frágil de una
  app local: si se pierde el equipo, se pierden los datos.

### 1.6 Purga
- Funciona y avisa 30 días antes, pero el aviso ocupa la parte superior de *todas* las pantallas con la misma
  importancia que un plazo vencido.

### 1.7 Diseño y accesibilidad
- Buena base (AA, 48 px, foco visible), pero sin **modo oscuro**, sin escala tipográfica ni de espaciado definida,
  colores repetidos a mano y la presentación con su propia copia de la paleta (riesgo de que diverjan).

## 2. Plan

| Prioridad | Cambio | Fricción que resuelve |
|---|---|---|
| 1 | **Asistente «Primeros pasos»** (6 pasos con progreso, *Atrás*, *Saltar*, se retoma desde Ajustes y Ayuda): contraseña y qué significa perderla → establecimiento (de dónde sale cada código y qué hacer si aún no lo tienes) → **reserva de prueba** (marcada como tal, no se preselecciona al exportar y se borra al terminar) → enlace al huésped → primer fichero (de prueba, «no lo subas») → copia de seguridad y **recordatorio** | 1.1, 1.5 |
| 2 | **Navegación por frecuencia**: Hoy → Reservas → Exportar → Ajustes → Ayuda, con icono y texto, en una sola fila también en el móvil; **migas de pan** en reserva, nueva reserva y subpáginas de Ajustes; Ajustes dividido en subpáginas | 1.2, 1.1 |
| 3 | **Hoy**: atajos grandes (*Nueva reserva*, *Escanear QR de un huésped* — reconoce sola la reserva —, *Exportar N completos*); entradas como **tarjetas** (sin tabla ancha) con estado, plazo y el **siguiente paso** de cada una; el aviso de 24 h enlaza a cada reserva | 1.2 |
| 4 | **Ficha de la reserva** reordenada por uso: estado + «Siguiente paso» → viajeros → enlace/escáner → revisión con enlaces para corregir → datos del contrato → eliminar. Pago con su nombre | 1.2 |
| 5 | **Guía contextual**: «¿Qué es…?» desplegable junto a cada campo difícil (soporte, código INE, código de establecimiento, tipo de documento, menores…) con **ejemplos visuales** (ilustraciones esquemáticas, nunca documentos reales); **estados vacíos** que dicen qué hacer; página **Ayuda** con preguntas frecuentes (plazos, portal que rechaza el fichero, menores, huésped sin documento español, cambiar de dispositivo, AM HOTEL y otros programas: solo pre-check-in, no enviar dos veces) | 1.1–1.4 |
| 6 | **Huésped**: «¿Qué documento elijo?» y formato de ejemplo por tipo, ayuda del soporte con ilustración, preguntas frecuentes del huésped; todo en los 6 idiomas | 1.3 |
| 7 | **Tipos de documento** exactamente los de §8.5 (NIF, NIE, PAS, OTRO), con su validación y ayuda; lo que el documento no aclara queda como `PENDIENTE-OFICIAL` | 1.3 |
| 8 | **Sistema de diseño**: tokens (color claro/oscuro, tipografía, espaciado, radios, sombras) compartidos con la presentación; modo oscuro automático y elegible; contraste AA comprobado numéricamente en los dos temas y con axe en navegador real | 1.7 |
| 9 | Aviso de purga más discreto (solo en Hoy y en Ajustes → Conservación) | 1.6 |

### Decisiones

- **Idiomas.** La recepción sigue en español (es lo que había y el personal trabaja en España). Todo lo que ve el
  **huésped** —ayudas de campos, tipos de documento, preguntas frecuentes— está en los 6 idiomas. FR/DE/IT/PT
  necesitan revisión nativa (README).
- **Reserva de prueba.** Es una reserva normal con la marca interna `prueba` (no se exporta: es un dato interno como el
  canal o la habitación). Exportar no la preselecciona y avisa si se incluye. Al terminar el asistente se ofrece
  borrarla.
- **Recordatorio de copias.** Fecha de la última copia y frecuencia elegida (por defecto, semanal) se guardan cifradas
  en el propio almacén; el aviso sale en «Hoy». Sin notificaciones ni servidores.
- **Tema.** Claro u oscuro según el sistema; se puede fijar en *Ajustes → Apariencia* (se recuerda en este navegador:
  no es un dato personal).
- **Ejemplos visuales.** Ilustraciones esquemáticas propias («ilustración: no es un documento real»), sin copiar el
  diseño de documentos oficiales. Los números de documento de ejemplo son ficticios con letra de control correcta; el código INE de
  ejemplo es uno real de la relación oficial del INE (28079 = Madrid), nunca un código inventado.
- **Cero peticiones a otros orígenes**, todo local y cifrado: se mantiene la guardia E2E en todas las pruebas nuevas.

### Cómo se comprueba

TDD con commits pequeños; pruebas de componentes del asistente, la ayuda y las pistas; axe sin violaciones en claro y
en oscuro (navegador real, con contraste); E2E del asistente completo y del recorrido de una huésped con documento no
español; capturas nuevas en el README y en la presentación.
