import { DEPTH_COLORS } from '../../colors/colors';
import { instanteMs } from './analise';

export const cores = {
  painel: '#1b222e',
  elevado: '#252c38',
  texto: '#ffffff',
  secundario: '#c3cedc',
  divisor: '#384352',
  azul: '#3487ce',
  verde: '#38a579',
  amarelo: '#d4a029',
} as const;

export const corCamada = (profundidadeCm: number): string => {
  const chave = `depth${Math.round(profundidadeCm)}` as keyof typeof DEPTH_COLORS;
  if (DEPTH_COLORS[chave]) {
    return DEPTH_COLORS[chave];
  }
  // Fallback para profundidades não padrão (ex: 70cm, 80cm)
  const paletaFallback = ['#ffffff', '#FDD835', '#40ff79', '#0010f1', '#522b0f', '#000000', '#c1b5ff', '#f39797'];
  return paletaFallback[Math.abs(Math.round(profundidadeCm / 10) - 1) % paletaFallback.length] ?? cores.texto;
};
export const numero = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function tempoResposta(minutos: number): string {
  const total = Math.round(Math.max(0, minutos));
  const horas = Math.floor(total / 60), resto = total % 60;
  return horas ? `≈ ${horas}h${resto ? String(resto).padStart(2, '0') : ''}` : `≈ ${total} min`;
}

/** Formata data e hora no padrão brasileiro (fuso America/Sao_Paulo / UTC-3) */
export function formatarDataHoraBr(
  isoOuMs: string | number,
  opcoes?: { incluirAno?: boolean; comSeparador?: boolean; fusoHorario?: string },
): string {
  const ms = typeof isoOuMs === 'number' ? isoOuMs : instanteMs(isoOuMs);
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  const timeZone = opcoes?.fusoHorario || 'America/Sao_Paulo';
  const incluirAno = opcoes?.incluirAno ?? true;
  const comSeparador = opcoes?.comSeparador ?? true;

  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: incluirAno ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => partes.find((p) => p.type === type)?.value ?? '';
  const dia = get('day');
  const mes = get('month');
  const ano = get('year');
  const hora = get('hour');
  const minuto = get('minute');

  const sep = comSeparador ? ' às ' : ' ';
  if (incluirAno && ano) {
    return `${dia}/${mes}/${ano}${sep}${hora}:${minuto}`;
  }
  return `${dia}/${mes}${sep}${hora}:${minuto}`;
}
