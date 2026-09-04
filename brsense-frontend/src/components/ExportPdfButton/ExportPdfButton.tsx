import { useState } from "react";
import { Button, useToast, Icon, Box } from "@chakra-ui/react";
import { MdPictureAsPdf, MdShare, MdDownload } from "react-icons/md";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TableRowData } from "../DeviceTable/DeviceTable";
import { getDeviceAnalysis, getManualIrrigations } from "../../services/api";
import { fetchWeatherData } from "../../services/weatherService";

interface ExportPdfButtonProps {
  data: TableRowData[];
}

export function ExportPdfButton({ data }: ExportPdfButtonProps) {
  const [exportStatus, setExportStatus] = useState<
    "idle" | "loading" | "ready"
  >("idle");
  const [generatedFile, setGeneratedFile] = useState<File | null>(null);
  const toast = useToast();

  const shouldUseNativeShare = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isWindows = userAgent.includes("win");
    const isLinux =
      userAgent.includes("linux") && !userAgent.includes("android");

    if (isWindows || isLinux) {
      return false;
    }

    if (typeof navigator.canShare === "function") {
      const testFile = new File(["test"], "test.txt", { type: "text/plain" });
      return navigator.canShare({ files: [testFile] });
    }

    return false;
  };

  const getStatusLabel = (status: string) => {
    if (status.includes("status_critical")) return "Crítico";
    if (status.includes("status_alert")) return "Atenção";
    if (status.includes("status_ok")) return "Ideal";
    if (status.includes("status_saturated")) return "Saturado";
    return "Offline";
  };

  const formatRain = (val?: number) =>
    val === undefined || val === null ? "-" : val.toFixed(1);

  const calcularDAP = (dataPlantio?: string | null) => {
    if (!dataPlantio) return "-";
    const hoje = new Date();
    const dataInicial = new Date(dataPlantio);
    const diffInMs = hoje.getTime() - dataInicial.getTime();
    const dias = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return dias < 0 ? 0 : dias;
  };

  const formatarPotencia = (cv?: number | null) => {
    if (cv === null || cv === undefined) return "-";
    const kw = Math.ceil(cv * 0.7355);
    return `${Math.ceil(cv)}cv / ${kw}kW`;
  };

  const downloadPdf = (file: File) => {
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(fileUrl);
    toast({ title: "Download concluído.", status: "success", duration: 3000 });
  };

  const getForecastText = async (row: TableRowData) => {
    let forecastText = "-";
    if (row.latitude !== undefined && row.longitude !== undefined) {
      try {
        const roundedLat = Number(row.latitude).toFixed(2);
        const roundedLng = Number(row.longitude).toFixed(2);
        const cacheKey = `weather_${roundedLat}_${roundedLng}`;
        const cachedDataStr = sessionStorage.getItem(cacheKey);

        let forecastData = null;
        if (cachedDataStr) {
          const cachedData = JSON.parse(cachedDataStr);
          if (Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
            forecastData = cachedData.data;
          }
        }

        if (!forecastData) {
          forecastData = await fetchWeatherData(
            Number(roundedLat),
            Number(roundedLng),
          );
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              data: forecastData,
            }),
          );
        }

        if (forecastData && forecastData.length > 0) {
          type ForecastItem = {
            dayNumber: number;
            dayName?: string;
            rain?: number;
            precipitation?: number;
            precipitation_sum?: number;
            et0?: number;
          };

          forecastText = forecastData
            .slice(0, 4)
            .map((d: ForecastItem, index: number) => {
              const label =
                index === 0
                  ? `Hoje, ${d.dayNumber}`
                  : `${d.dayName?.substring(0, 3) || ""}, ${d.dayNumber}`;
              const rain =
                d.rain ?? d.precipitation ?? d.precipitation_sum ?? 0;
              const et0 = d.et0 != null ? d.et0.toFixed(1) : "-";
              return `${label}: ETo ${et0} | Chuva ${Number(rain).toFixed(1)}mm`;
            })
            .join("\n");
        }
      } catch (err) {
        console.error("Erro ao buscar previsão pro PDF:", err);
        forecastText = "Dados indisponíveis";
      }
    }
    return forecastText;
  };

  const handleGenerate = async () => {
    setExportStatus("loading");
    try {
      const doc = new jsPDF({ orientation: "landscape", format: "a4" });

      doc.setFontSize(16);
      doc.setTextColor(26, 32, 44);
      doc.text("Monitoramento Detalhado", 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(113, 128, 150);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 22);


      const normalProbes = data.filter(r => !r.isManualProbe);
      const manualProbes = data.filter(r => r.isManualProbe);

      if (normalProbes.length > 0) {
        const tableColumn = [
          "Dispositivos",
          "Dados",
          "Decisão",
          "Pluviômetro",
          "Previsão",
        ];

        const tableRows = await Promise.all(
          normalProbes.map(async (row) => {
            let decisionText = row.sugestao || row.copiloto_acao;
            if (!decisionText) {
              try {
                const res = await getDeviceAnalysis(row.esn);
                decisionText = res.sugestao || "Monitoramento padrão.";
              } catch {
                decisionText = "Condições em monitoramento padrão.";
              }
            }

            const forecastText = await getForecastText(row);

            return [
              `${row.name || "-"}\nESN: ${row.esn}\nFazenda: ${row.farmName}\nStatus: ${getStatusLabel(row.status)}\nÚltimo Envio: ${row.lastCommunicationFormatted}`,
              `Cultura: ${row.cultura || "-"}\nDAP: ${calcularDAP(row.data_plantio)} dias\nPotência: ${formatarPotencia(row.potencia_cv)}`,
              decisionText,
              `1h: ${formatRain(row.rain_1h)} mm\n24h: ${formatRain(row.rain_24h)} mm\n7d: ${formatRain(row.rain_7d)} mm`,
              forecastText,
            ];
          }),
        );

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 28,
          margin: { left: 14, right: 8 },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [45, 55, 72],
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
            valign: "middle",
          },
          headStyles: {
            fillColor: [11, 95, 165],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [247, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 45 },
            2: { cellWidth: 75 },
            3: { cellWidth: 30 },
            4: { cellWidth: 75 },
          },
        });
      }

      if (manualProbes.length > 0) {
        const manualTableColumn = [
          "Sondas Manuais",
          "Dados",
          "Histórico de Irrigação (Últimos 7)",
        ];

        const manualTableRows = await Promise.all(
          manualProbes.map(async (row) => {
            let historyText = "Nenhuma irrigação registrada.";
            try {
              const records = await getManualIrrigations(row.id);
              if (records && records.length > 0) {
                const last7 = records.slice(0, 7);
                historyText = last7.map((rec: { date: string; irrigation_value_mm: number }) => {
                  const dateStr = new Date(rec.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                  return `${dateStr}: ${rec.irrigation_value_mm} mm`;
                }).join('\n');
              }
            } catch (error) {
              console.error("Erro ao carregar histórico", error);
              historyText = "Erro ao carregar histórico.";
            }

            return [
              `${row.name || "-"}
Fazenda: ${row.farmName}`,
              `Cultura: ${row.cultura || "-"}
DAP: ${calcularDAP(row.data_plantio)} dias
Potência: ${formatarPotencia(row.potencia_cv)}`,
              `Total (Acumulado): ${row.irrigation_value_mm ?? 0} mm

${historyText}`,
            ];
          })
        );

        const pdfDoc = doc as unknown as { lastAutoTable?: { finalY: number } };
        const finalY = pdfDoc.lastAutoTable ? pdfDoc.lastAutoTable.finalY + 15 : 28;

        doc.setFontSize(14);
        doc.setTextColor(26, 32, 44);
        doc.text("Sondas Manuais", 14, finalY);

        autoTable(doc, {
          head: [manualTableColumn],
          body: manualTableRows,
          startY: finalY + 6,
          margin: { left: 14, right: 8 },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [45, 55, 72],
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
            valign: "middle",
          },
          headStyles: {
            fillColor: [11, 95, 165],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [247, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 70 },
            2: { cellWidth: 135 },
          },
        });
      }

      const hoje = new Date().toISOString().split("T")[0];
      const fileName = `monitoramento_detalhado_${hoje}.pdf`;
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (shouldUseNativeShare()) {
        try {
          await navigator.share({ files: [file] });
          setExportStatus("idle");
        } catch (shareError) {
          if ((shareError as Error).name === "AbortError") {
            setExportStatus("idle");
            return;
          }

          setGeneratedFile(file);
          setExportStatus("ready");
          toast({
            title: "PDF pronto para envio!",
            description: "Toque em 'Enviar PDF' para tentar novamente.",
            status: "success",
            duration: 5000,
          });
        }
      } else {
        downloadPdf(file);
        setExportStatus("idle");
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar arquivo.",
        status: "error",
        duration: 5000,
      });
      setExportStatus("idle");
    }
  };

  const handleShareReady = async () => {
    if (!generatedFile) return;
    try {
      await navigator.share({ files: [generatedFile] });
      setExportStatus("idle");
      setGeneratedFile(null);
    } catch (shareError) {
      if ((shareError as Error).name !== "AbortError") {
        downloadPdf(generatedFile);
        setExportStatus("idle");
        setGeneratedFile(null);
      }
    }
  };

  const isShareSupported = shouldUseNativeShare();

  return (
    <Button
      colorScheme={exportStatus === "ready" ? "green" : "blue"}
      variant="solid"
      size="sm"
      isLoading={exportStatus === "loading"}
      onClick={exportStatus === "ready" ? handleShareReady : handleGenerate}
      leftIcon={<Icon as={MdPictureAsPdf} />}
      rightIcon={<Icon as={isShareSupported ? MdShare : MdDownload} />}
      boxShadow="md"
      flexShrink={0}
    >
      <Box
        display={
          exportStatus === "ready" ? "inline" : { base: "none", md: "inline" }
        }
        mr={1}
      >
        {exportStatus === "ready"
          ? "Enviar"
          : isShareSupported
            ? "Compartilhar"
            : "Salvar"}
      </Box>
      PDF
    </Button>
  );
}
