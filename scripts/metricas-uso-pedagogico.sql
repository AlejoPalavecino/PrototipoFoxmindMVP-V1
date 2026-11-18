-- Últimas dos semanas completas (lunes a lunes, UTC). Una fila por semana.
WITH corte AS (
  SELECT date_trunc('week', current_timestamp AT TIME ZONE 'UTC') AS lunes
), semanas AS (
  SELECT inicio::date AS semana,
         inicio AT TIME ZONE 'UTC' AS desde,
         (inicio + interval '7 days') AT TIME ZONE 'UTC' AS hasta
  FROM corte CROSS JOIN LATERAL generate_series(
    lunes - interval '14 days', lunes - interval '7 days', interval '7 days'
  ) AS serie(inicio)
)
SELECT s.semana,
       f.turnos_docentes, f.respuestas_listas, f.turnos_fallidos, f.turnos_cancelados,
       e.solicitudes_estudio, e.solicitudes_estudio_completadas,
       r.recursos_texto, r.recursos_con_edicion,
       round(100.0 * r.recursos_con_edicion / nullif(r.recursos_texto, 0), 1) AS pct_recursos_con_edicion,
       a.repasos_agendados
FROM semanas s
CROSS JOIN LATERAL (
  SELECT count(*) AS turnos_docentes,
         count(*) FILTER (WHERE state = 'READY') AS respuestas_listas,
         count(*) FILTER (WHERE state = 'FAILED') AS turnos_fallidos,
         count(*) FILTER (WHERE state = 'CANCELLED') AS turnos_cancelados
  FROM foxy_turns WHERE created_at >= s.desde AND created_at < s.hasta
) f
CROSS JOIN LATERAL (
  SELECT count(*) AS solicitudes_estudio,
         count(*) FILTER (WHERE state = 'DONE') AS solicitudes_estudio_completadas
  FROM study_ai_dispatches WHERE created_at >= s.desde AND created_at < s.hasta
) e
CROSS JOIN LATERAL (
  SELECT count(*) AS recursos_texto, count(*) FILTER (WHERE revision > 0) AS recursos_con_edicion
  FROM foxy_resources WHERE created_at >= s.desde AND created_at < s.hasta
) r
CROSS JOIN LATERAL (
  SELECT count(*) AS repasos_agendados FROM study_review_sessions
  WHERE created_at >= s.desde AND created_at < s.hasta
) a
ORDER BY s.semana;
