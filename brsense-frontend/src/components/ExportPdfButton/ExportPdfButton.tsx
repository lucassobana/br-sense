import { useState } from "react";
import { Button, useToast, Icon, Box } from "@chakra-ui/react";
import { MdPictureAsPdf, MdShare, MdDownload } from "react-icons/md";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TableRowData } from "../DeviceTable/DeviceTable";
import { getDeviceAnalysis } from "../../services/api";

interface ExportPdfButtonProps {
  data: TableRowData[];
}

export function ExportPdfButton({ data }: ExportPdfButtonProps) {
  const [exportStatus, setExportStatus] = useState<
    "idle" | "loading" | "ready"
  >("idle");
  const [generatedFile, setGeneratedFile] = useState<File | null>(null);
  const toast = useToast();

  // NOVA LÓGICA: Verifica o SO antes de liberar o Web Share API
  const shouldUseNativeShare = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    // Detecta Windows
    const isWindows = userAgent.includes("win");

    // Detecta Linux Desktop (excluindo dispositivos Android)
    const isLinux =
      userAgent.includes("linux") && !userAgent.includes("android");

    // Se for Windows ou Linux Desktop, força o download direto retornando false
    if (isWindows || isLinux) {
      return false;
    }

    // Para macOS, iOS e Android, valida se o navegador suporta compartilhamento de arquivos
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

      const tableColumn = [
        "Dispositivo",
        "Local / Status",
        "Precipitação (1h|24h|7d)",
        "Agronômico",
        "Decisão (Copiloto)",
        "Último Envio",
      ];

      const tableRows = await Promise.all(
        data.map(async (row) => {
          let decisionText = row.sugestao || row.copiloto_acao;

          if (!decisionText) {
            try {
              const res = await getDeviceAnalysis(row.esn);
              decisionText = res.sugestao || "Monitoramento padrão.";
            } catch {
              decisionText = "Condições em monitoramento padrão.";
            }
          }

          return [
            `${row.name || "-"}\nESN: ${row.esn}`,
            `Fazenda: ${row.farmName}\nStatus: ${getStatusLabel(row.status)}`,
            `${formatRain(row.rain_1h)} | ${formatRain(row.rain_24h)} | ${formatRain(row.rain_7d)} mm`,
            `Cultura: ${row.cultura || "-"}\nDAP: ${calcularDAP(row.data_plantio)} dias\nPotência: ${formatarPotencia(row.potencia_cv)}`,
            decisionText,
            row.lastCommunicationFormatted,
          ];
        }),
      );

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
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
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 80 },
          5: { cellWidth: 35 },
        },
      });

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
        // Fluxo acionado para Windows, Linux e navegadores sem suporte
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
