import { Box, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import type { NdviAnalysis, NdviBin } from "../shared/types";

const dFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export function DistributionBars({ bins }: { bins: NdviBin[] }) {
  const total = bins.reduce((a, b) => a + b.count, 0) || 1;
  return (
    <VStack className="distribution" spacing={3} align="stretch">
      <Flex
        className="distribution-bar"
        role="img"
        aria-label="Distribuição das classes de vigor"
        h="10px"
        borderRadius="full"
        overflow="hidden"
        bg="#0c1829"
        border="1px solid"
        borderColor="#1e3a5f"
      >
        {bins.map((b) => {
          const pct = (b.count / total) * 100;
          return (
            <Box
              as="span"
              key={b.id}
              w={`${pct}%`}
              bg={b.color}
              title={`${b.label}: ${pct.toFixed(0)}%`}
            />
          );
        })}
      </Flex>
      <VStack className="distribution-list" spacing={1.5} align="stretch">
        {bins.map((b) => {
          const pct = total ? Math.round((b.count / total) * 100) : 0;
          return (
            <Flex
              key={b.id}
              className="distribution-row"
              justify="space-between"
              align="center"
              fontSize="xs"
              py={0.5}
            >
              <HStack spacing={2} minW={0} flex="1">
                <Box w="8px" h="8px" borderRadius="full" bg={b.color} flexShrink={0} />
                <Text color="#A0AEC0" fontSize="xs" noOfLines={1}>
                  {b.label}
                </Text>
              </HStack>
              <Text fontWeight="semibold" color="#FFFFFF" fontSize="xs" ml={2} flexShrink={0}>
                {pct}%
              </Text>
            </Flex>
          );
        })}
      </VStack>
    </VStack>
  );
}

export function EvolutionChart({
  series,
  selectedSceneId,
  onSelect,
}: {
  series: NdviAnalysis[];
  selectedSceneId?: string;
  onSelect: (sceneId: string) => void;
}) {
  const pts = [...series].sort(
    (a, b) => Date.parse(a.acquiredAt) - Date.parse(b.acquiredAt),
  );
  if (!pts.length) return null;
  const w = 780;
  const h = 185;
  const padL = 48;
  const padR = 38;
  const padT = 26;
  const padB = 32;
  const x = (i: number) =>
    padL + (pts.length === 1 ? 0.5 : i / (pts.length - 1)) * (w - padL - padR);
  const y = (v: number) =>
    padT + (1 - Math.max(0, Math.min(1, v))) * (h - padT - padB);
  const valid = pts
    .map((p, i) => ({ p, i }))
    .filter((xItem) => xItem.p.mean !== null);
  const line = valid
    .map(
      (item, k) =>
        `${k ? "L" : "M"}${x(item.i).toFixed(1)},${y(item.p.mean!).toFixed(1)}`,
    )
    .join(" ");
  const area =
    valid.length > 1
      ? `${line} L${x(valid[valid.length - 1].i).toFixed(1)},${h - padB} L${x(valid[0].i).toFixed(1)},${h - padB} Z`
      : "";
  return (
    <Box
      className="evolution-chart"
      w="100%"
      py={1}
      overflowX="auto"
      sx={{
        "&::-webkit-scrollbar": { height: "4px" },
        "&::-webkit-scrollbar-thumb": {
          background: "#2d4a63",
          borderRadius: "4px",
        },
      }}
    >
      <Box minW={{ base: "460px", sm: "100%" }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
          role="img"
          aria-label="Evolução do NDVI médio"
        >
        <defs>
          <linearGradient id="ndviArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ea84b" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2ea84b" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="#1f384b"
              strokeDasharray="3 4"
            />
            <text x={8} y={y(v) + 4} fill="#6f8da1" fontSize="11">
              {v.toFixed(2).replace(".", ",")}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="url(#ndviArea)" />}
        {line && (
          <path d={line} fill="none" stroke="#45c466" strokeWidth="2.2" />
        )}
        {pts.map((p, i) => {
          const active = p.sceneId === selectedSceneId;
          const cy = p.mean !== null ? y(p.mean) : h - padB - 8;
          return (
            <g
              key={p.sceneId}
              className="chart-point"
              onClick={() => onSelect(p.sceneId)}
            >
              <circle
                cx={x(i)}
                cy={cy}
                r={active ? 5.5 : 4}
                fill={p.mean !== null ? "#45c466" : "#7e95a7"}
                stroke="#071824"
                strokeWidth="2"
              />
              {active && (
                <circle
                  cx={x(i)}
                  cy={cy}
                  r={9}
                  fill="none"
                  stroke="#69d2ff"
                  strokeWidth="1.4"
                />
              )}
              {p.mean !== null && (
                <text
                  x={x(i)}
                  y={Math.max(14, cy - 11)}
                  textAnchor="middle"
                  fill={active ? "#f0f9ff" : "#9ec2d8"}
                  fontSize="11"
                  fontWeight={active ? "700" : "500"}
                >
                  {p.mean.toFixed(2).replace(".", ",")}
                </text>
              )}
              <text
                x={x(i)}
                y={h - 10}
                textAnchor="middle"
                fill={active ? "#e8f4fc" : "#7b97ab"}
                fontSize="11"
                fontWeight={active ? "600" : "400"}
              >
                {dFmt.format(new Date(p.acquiredAt)).replace(".", "")}
              </text>
            </g>
          );
        })}
        </svg>
      </Box>
    </Box>
  );
}
