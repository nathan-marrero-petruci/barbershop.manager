// Funções utilitárias para formatação de datas/horários no fuso horário de São Paulo

export function formatDateTimeBR(iso) {
  if (!iso) return '';
  // Força UTC se não tiver 'Z' ou offset
  let safeIso = iso;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(iso)) {
    safeIso = iso + 'Z';
  }
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
  let safeIso = iso;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(iso)) {
    safeIso = iso + 'Z';
  }
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
  let safeIso = iso;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(iso)) {
    safeIso = iso + 'Z';
  }
  const d = new Date(safeIso);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}
