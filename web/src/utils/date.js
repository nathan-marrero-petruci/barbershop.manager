// Funções utilitárias para formatação de datas/horários no fuso horário de São Paulo

// Normaliza ISO string para UTC: adiciona 'Z' se não houver indicador de fuso
function toUtcIso(iso) {
  if (!iso) return iso;
  // Já tem 'Z' ou offset (+HH:mm / -HH:mm)
  if (/Z$|[+-]\d{2}:\d{2}$/.test(iso)) return iso;
  return iso + 'Z';
}

export function formatDateTimeBR(iso) {
  if (!iso) return '';
  let safeIso = toUtcIso(iso);
  const d = new Date(safeIso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export function formatDateBR(iso) {
  if (!iso) return '';
  let safeIso = toUtcIso(iso);
  const d = new Date(safeIso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

export function formatTimeBR(iso) {
  if (!iso) return '';
  let safeIso = toUtcIso(iso);
  const d = new Date(safeIso);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}
