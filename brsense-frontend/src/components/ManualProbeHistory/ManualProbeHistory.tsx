import { useEffect, useState, useMemo } from "react";
import { Box, Flex, Spinner, Text, Icon } from "@chakra-ui/react";
import { FaTint } from "react-icons/fa";
import { getManualIrrigations } from "../../services/api";
import type { ManualIrrigationRecord } from "../../types";

interface ManualProbeHistoryProps {
  probeId: number;
}

type Period = "today" | "7d" | "30d" | "90d" | "custom";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  custom: "Personalizado",
};

function getHourLabel(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Manhã";
  if (h >= 12 && h < 18) return "Tarde";
  return "Noturno";
}

function getStartDate(period: Period): Date {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

export function ManualProbeHistory({ probeId }: ManualProbeHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ManualIrrigationRecord[]>([]);
  const [period, setPeriod] = useState<Period>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [tooltip, setTooltip] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await getManualIrrigations(probeId);
        if (active) setRecords(data);
      } catch {
        // Ignorado, já estava silencioso
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      active = false;
    };
  }, [probeId]);

  const filtered = useMemo(() => {
    let start = getStartDate(period);
    let end = new Date();
    
    if (period === "custom") {
      start = customStart ? new Date(customStart + "T00:00:00") : new Date(0);
      end = customEnd ? new Date(customEnd + "T23:59:59") : new Date();
    }
    
    return [...records]
      .filter((r) => {
        const d = new Date(r.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, period, customStart, customEnd]);

  const chronological = useMemo(() => [...filtered].reverse(), [filtered]);

  const totalMm = useMemo(
    () => filtered.reduce((sum, r) => sum + r.irrigation_value_mm, 0),
    [filtered]
  );

  const maxMm = useMemo(
    () => Math.max(...chronological.map((r) => r.irrigation_value_mm), 0.1),
    [chronological]
  );

  // SVG chart dimensions
  const CHART_H = 240;
  const PAD_L = 50;
  const PAD_R = 20;
  const PAD_T = 35;
  const PAD_B = 55;
  const plotH = CHART_H - PAD_T - PAD_B;
  
  const barCount = chronological.length;
  // Calculate dynamic width based on bar count
  const barW = 32; // Thinner bars
  const step = 64; // Space between bars
  const requiredPlotW = barCount * step;
  const minPlotW = 920 - PAD_L - PAD_R;
  const plotW = Math.max(requiredPlotW, minPlotW);
  const CHART_W = plotW + PAD_L + PAD_R;

  const niceMax = Math.ceil(maxMm / 2) * 2 || 2;
  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax].map(
    (v) => Math.round(v * 10) / 10
  );

  if (loading) {
    return (
      <Flex justify="center" align="center" h="300px">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  return (
    <Box w="100%">
      {/* Period Filter Bar */}
      <Box bg="#131b2e" border="1px solid #223049" borderRadius="xl" px={4} py="10px" mb={4}>
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Flex align="center" gap={2} overflowX="auto" py="2px">
            <Text fontSize="xs" fontWeight="medium" color="#94a3b8" mr={2} whiteSpace="nowrap">
              Período:
            </Text>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <Box
                key={p}
                as="button"
                px={3}
                py={1}
                borderRadius="lg"
                fontSize="xs"
                fontWeight={period === p ? "bold" : "medium"}
                color={period === p ? "#7dd3fc" : "#94a3b8"}
                bg={period === p ? "rgba(56,189,248,0.15)" : "transparent"}
                border={period === p ? "1px solid rgba(56,189,248,0.4)" : "1px solid transparent"}
                cursor="pointer"
                whiteSpace="nowrap"
                transition="all 0.15s"
                _hover={{ color: "white", bg: "#1c2c49" }}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Box>
            ))}
            
            {period === "custom" && (
              <Flex gap={2} ml={2} align="center">
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{ background: "#1c2c49", color: "white", border: "1px solid #223049", borderRadius: "6px", padding: "2px 6px", fontSize: "12px", outline: "none", colorScheme: "dark" }}
                />
                <Text color="#94a3b8" fontSize="xs">até</Text>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ background: "#1c2c49", color: "white", border: "1px solid #223049", borderRadius: "6px", padding: "2px 6px", fontSize: "12px", outline: "none", colorScheme: "dark" }}
                />
              </Flex>
            )}
          </Flex>
          <Flex align="center" gap={2} flexShrink={0}>
            <Text fontSize="xs" color="#94a3b8">Total no período:</Text>
            <Box
              px={2} py="2px" borderRadius="md"
              bg="rgba(14,116,144,0.25)" border="1px solid rgba(56,189,248,0.3)"
              fontFamily="monospace" fontWeight="bold" fontSize="sm" color="#7dd3fc"
            >
              {totalMm.toFixed(1).replace(".", ",")} mm
            </Box>
          </Flex>
        </Flex>
      </Box>

      {/* Chart Section */}
      <Box bg="#131b2e" border="1px solid #223049" borderRadius="xl" p={{ base: 4, md: 5 }} mb={4} shadow="lg">
        <Flex flexWrap="wrap" align="center" justify="space-between" gap={3} mb={4} pb={3} borderBottom="1px solid #223049">
          <Box>
            <Flex align="center" gap={2}>
              <Icon as={FaTint} color="#38bdf8" boxSize={4} />
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white">
                Gráfico de Irrigação
              </Text>
            </Flex>
            <Text fontSize="xs" color="#94a3b8" mt="2px">Lâmina d'água aplicada (milímetros)</Text>
          </Box>
          {chronological.length > 0 && (
            <Flex align="center" gap={4} fontSize="xs" flexWrap="wrap">
              <Flex align="center" gap={2}>
                <Box w={3} h={3} borderRadius="sm" bgGradient="linear(to-t, #1d4ed8, #38bdf8)" />
                <Text color="#cbd5e1" fontWeight="medium">Volume Aplicado (mm)</Text>
              </Flex>
              {chronological.length > 1 && (
                <Flex align="center" gap={2}>
                  <Box w={4} borderTop="2px dashed #475569" />
                  <Text color="#94a3b8">Média ({(totalMm / chronological.length).toFixed(1)} mm)</Text>
                </Flex>
              )}
            </Flex>
          )}
        </Flex>

        {chronological.length === 0 ? (
          <Flex direction="column" align="center" justify="center" py={12} gap={3}>
            <Flex
              w={12} h={12} borderRadius="2xl"
              bg="rgba(56,189,248,0.1)" border="1px solid rgba(56,189,248,0.2)"
              align="center" justify="center" color="#38bdf8"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </Flex>
            <Text fontSize="sm" fontWeight="bold" color="white">Nenhuma irrigação no período</Text>
            <Text fontSize="xs" color="#94a3b8" textAlign="center" maxW="sm">
              Os registros de irrigação realizados manualmente aparecerão aqui.
            </Text>
          </Flex>
        ) : (
          <Box w="100%" overflowX="auto" pb={2}>
            <Box w="100%" minW={`${CHART_W}px`}>
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio="xMinYMin meet"
                style={{ width: "100%", height: "auto", overflow: "visible", userSelect: "none" }}
              >
                <defs>
                  <linearGradient id={`bg-${probeId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id={`bgh-${probeId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                  <filter id={`sh-${probeId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0284c7" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Grid & Y axis */}
                {yTicks.map((tick) => {
                  const y = PAD_T + plotH - (tick / niceMax) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={PAD_L} x2={CHART_W - PAD_R} y1={y} y2={y}
                        stroke={tick === 0 ? "#334155" : "#1f2d45"}
                        strokeWidth={tick === 0 ? 1.5 : 1}
                        strokeDasharray={tick === 0 ? undefined : "4 4"}
                      />
                      <text x={PAD_L - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="monospace">
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Average dashed line */}
                {chronological.length > 1 && (() => {
                  const avg = totalMm / chronological.length;
                  const y = PAD_T + plotH - (avg / niceMax) * plotH;
                  return <line x1={PAD_L} x2={CHART_W - PAD_R} y1={y} y2={y} stroke="#475569" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.75} />;
                })()}

                {/* Y label */}
                <text x={16} y={PAD_T + plotH / 2} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600" transform={`rotate(-90, 16, ${PAD_T + plotH / 2})`}>mm</text>

                {/* Bars */}
                {(() => {
                  return chronological.map((r, i) => {
                    const d = new Date(r.date);
                    const barH = Math.max(4, (r.irrigation_value_mm / niceMax) * plotH);
                    
                    const startX = requiredPlotW < minPlotW ? PAD_L + (minPlotW - requiredPlotW) / 2 : PAD_L;
                    const x = startX + step * i + (step - barW) / 2;
                    const y = PAD_T + plotH - barH;
                    const cx = x + barW / 2;
                    const isHovered = tooltip === i;
                    const isLatest = i === chronological.length - 1;
                    const labelFontSize = 10;

                    return (
                      <g
                        key={r.id}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setTooltip(i)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <rect
                          x={x} y={y} width={barW} height={barH} rx={4}
                          fill={isHovered ? `url(#bgh-${probeId})` : `url(#bg-${probeId})`}
                          filter={`url(#sh-${probeId})`}
                        />
                        {/* Value badge */}
                        <rect x={cx - 24} y={y - 18} width={48} height={14} rx={3} fill="#0f172a" stroke={isLatest ? "#38bdf8" : "#1e293b"} strokeWidth={1} />
                        <text x={cx} y={y - 8} textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {r.irrigation_value_mm.toFixed(1)}
                        </text>
                        {/* X label */}
                        <text x={cx} y={PAD_T + plotH + 18} textAnchor="middle" fill={isLatest ? "#7dd3fc" : "#94a3b8"} fontSize={labelFontSize} fontWeight={isLatest ? "700" : "500"}>
                          {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </text>
                        <text x={cx} y={PAD_T + plotH + 34} textAnchor="middle" fill="#64748b" fontSize={9}>
                          {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </text>

                        {/* Hover tooltip */}
                        {isHovered && (
                          <g transform={`translate(${Math.min(Math.max(cx - 55, PAD_L), CHART_W - PAD_R - 110)}, ${Math.max(y - 65, PAD_T - 15)})`}>
                            <rect width={110} height={50} rx={6} fill="#090e1a" stroke="#38bdf8" strokeWidth={1} filter={`url(#sh-${probeId})`} />
                            <polygon points="55,50 60,55 65,50" fill="#090e1a" stroke="#38bdf8" strokeWidth={1} />
                            <line x1={55} y1={50} x2={65} y2={50} stroke="#090e1a" strokeWidth={1.5} />
                            <text x={8} y={18} fill="#94a3b8" fontSize="9" fontWeight="500">Volume aplicado</text>
                            <text x={8} y={32} fill="#ffffff" fontSize="12" fontWeight="bold">
                              {r.irrigation_value_mm.toFixed(1)} <tspan fill="#38bdf8">mm</tspan>
                            </text>
                            <text x={8} y={44} fill="#cbd5e1" fontSize="8" fontFamily="monospace">
                              {d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  });
                })()}
              </svg>
            </Box>
          </Box>
        )}
      </Box>

      {/* Records Table */}
      {filtered.length > 0 && (
        <Box bg="#131b2e" border="1px solid #223049" borderRadius="xl" overflow="hidden" shadow="lg">
          <Flex px={5} py="14px" borderBottom="1px solid #223049" align="center" justify="space-between" bg="rgba(22,34,56,0.6)">
            <Text fontSize="md" fontWeight="bold" color="white">Histórico de Irrigação</Text>
            <Box px={2} py="2px" borderRadius="md" bg="rgba(30,41,59,0.8)" border="1px solid #223049" fontSize="xs" color="#94a3b8">
              {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
            </Box>
          </Flex>
          <Box overflowX="auto">
            <Box as="table" w="100%" style={{ borderCollapse: "collapse" }}>
              <Box as="thead">
                <Box as="tr" borderBottom="1px solid #223049" bg="rgba(17,24,39,0.4)">
                  {["Data e Hora", "Período", "Lâmina d'Água"].map((h) => (
                    <Box
                      key={h} as="th" py={3} px={5}
                      textAlign={h === "Lâmina d'Água" ? "right" : "left"}
                      fontSize="xs" fontWeight="semibold" color="#94a3b8"
                      textTransform="uppercase" letterSpacing="wider"
                    >
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box as="tbody">
                {filtered.map((r, i) => {
                  const d = new Date(r.date);
                  const isLatest = i === 0;
                  return (
                    <Box
                      key={r.id} as="tr"
                      borderBottom="1px solid rgba(34,48,73,0.5)"
                      _hover={{ bg: "#162238" }}
                      transition="background 0.15s"
                    >
                      <Box as="td" py={3} px={5}>
                        <Flex align="center" gap={2} fontFamily="monospace" color="#e2e8f0" fontSize="xs">
                          <Box w="6px" h="6px" borderRadius="full" bg={isLatest ? "#38bdf8" : "#475569"} flexShrink={0} />
                          <Text>{d.toLocaleString("pt-BR")}</Text>
                          {isLatest && (
                            <Box
                              px="6px" py="1px" borderRadius="sm"
                              bg="rgba(6,78,59,0.5)" border="1px solid rgba(52,211,153,0.3)"
                              fontSize="10px" color="#6ee7b7" fontFamily="sans-serif" fontWeight="medium"
                            >
                              Recente
                            </Box>
                          )}
                        </Flex>
                      </Box>
                      <Box as="td" py={3} px={5}>
                        <Text fontSize="xs" color="#cbd5e1">{getHourLabel(d)}</Text>
                      </Box>
                      <Box as="td" py={3} px={5} textAlign="right">
                        <Box display="inline-flex" alignItems="center" justifyContent="flex-end" gap={2}>
                          <Box
                            px={2} py="2px" borderRadius="md"
                            bg="rgba(8,47,73,0.5)" border="1px solid rgba(56,189,248,0.35)"
                            fontFamily="monospace" fontWeight="bold" fontSize="sm" color="#38bdf8"
                          >
                            {r.irrigation_value_mm.toFixed(1)} mm
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
