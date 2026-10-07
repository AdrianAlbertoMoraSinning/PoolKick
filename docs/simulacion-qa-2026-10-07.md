# PoolKick — simulación funcional aprobada

Fecha: 6 de octubre de 2026, Edmonton. Estado: **aprobada dentro del alcance de simulación**. La aprobación final de producción sigue pendiente.

## Resultados ejecutados

| Comprobación | Resultado | Alcance |
|---|---|---|
| Interacciones de React | 33 escenarios aprobados | 11 recorridos por idioma: EN, ES y FR; DOM simulado con jsdom |
| Roles y escritura en Supabase | 11 comprobaciones adicionales aprobadas | Transacción con usuarios ficticios sin credenciales, roles authenticated y RLS reales; todo revertido |
| Regresiones | 14 pruebas aprobadas | Sesiones, cálculo de puntos, errores y mapeo deportivo |
| Renderizado estático | 36 renders aprobados | 12 pantallas en EN/ES/FR |
| Compilación | Aprobada | Build de producción |

## Recorridos funcionales

En cada idioma se ejecutó el ingreso ficticio por formulario; denegación de Admin a un jugador; creación de quiniela con código y membresía del creador; formulario de pronóstico; rechazo visible de marcador negativo; cierre de partidos pasados; chat; guardado del perfil y restauración al remontar la aplicación; ingreso de otro jugador; invitación y membresía sin duplicados; envío de su pronóstico; ingreso del administrador; formulario de resultado final; actualización automática de puntos; Rankings general y por torneo; filtros de Live Scores; catálogo de torneos; Donate deshabilitado sin enlace; Manual; apertura y cierre del menú móvil; y publicación, visualización y archivo de noticias mediante formularios y botones.

Los pronósticos 2–1 y 1–0 frente al resultado final 2–1 produjeron **5 y 3 puntos**, respectivamente, tanto en React como en Supabase.

Se detectó y corrigió un problema: Rankings en modo demo siempre devolvía una lista vacía. Ahora agrega los puntos y aplica desempates, con filtro por torneo. La ruta de Rankings de producción sigue utilizando sus RPCs de Supabase.

## Comprobaciones de Supabase

Se crearon cuatro identidades ficticias dentro de una transacción: administrador, creador de quiniela, jugador y no miembro. El comisionado es el creador de la quiniela; su perfil conserva el rol player.

Se verificaron creación y membresía; invitación repetida; inserción y edición de picks propios; ocultamiento de picks ajenos antes del kickoff; imposibilidad de editar picks ajenos; rechazo de marcadores negativos; bloqueo de autoasignación del rol admin; bloqueo de modificación de resultados oficiales por jugadores; perfil y chat con lectura posterior; aislamiento del no miembro; puntos automáticos y ambos RPCs de ranking; visibilidad posterior al kickoff y rechazo de cambios tardíos.

Todos los cambios se revirtieron con ROLLBACK. Una consulta independiente confirmó **cero usuarios, perfiles, partidos y quinielas de simulación restantes**. La cuenta de Marlon no fue modificada.

## Límites de esta aprobación

- El ingreso ficticio usa el modo demo local. La prueba SQL simula identidades autenticadas en la base de datos; no prueba contraseñas, tokens ni el ingreso real de Marlon.
- jsdom prueba eventos y estados de los componentes, pero no calcula el diseño visual CSS. Se probó la apertura/cierre del menú móvil; quedan pendientes tamaños de pantalla, desbordamientos, teclado móvil y pruebas en teléfono.
- No se certifican disponibilidad del proveedor deportivo, sincronización con un token de administrador ni cobertura de próximos partidos.
- Donate se comprobó como deshabilitado cuando no existe enlace. No se creó un destino de pago ni se ejecutó una transacción.

## Repetir las pruebas

`npm ci`, `npm test`, `npm run test:render`, `npm run test:simulation` y `npm run build`.

Las pruebas funcionales están en `tests/simulation.jsx`; el ejecutor aislado está en `scripts/simulate.mjs`. La simulación de base de datos está en `tests/database-simulation.sql` y se ejecuta con el conector SQL autorizado. CI ejecuta automáticamente la simulación de React en cada cambio de main o pull request.
