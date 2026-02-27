import { SafeHandle } from "./contracts";

interface ChartResult {
  chartType: string;
  title: string;
  description: string;
  dataUrl?: string;
}

function parseNumericValues(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
  return matches
    .map((value) => Number.parseFloat(value))
    .filter(Number.isFinite);
}

function pickChartType(values: number[]): string {
  if (values.length <= 1) {
    return "single-value";
  }
  if (values.length <= 8) {
    return "bar";
  }
  return "line";
}

function generateSvgChart(values: number[], chartType: string): string {
  const W = 400;
  const H = 200;
  const PAD = 30;
  const max = Math.max(...values, 1);
  const barW = Math.floor((W - PAD * 2) / Math.max(values.length, 1));

  let innerSvg: string;

  if (chartType === "bar" || chartType === "single-value") {
    innerSvg = values
      .map((v, i) => {
        const bh = Math.round(((H - PAD * 2) * v) / max);
        const x = PAD + i * barW;
        const y = H - PAD - bh;
        return `<rect x="${x}" y="${y}" width="${Math.max(barW - 4, 1)}" height="${bh}" fill="#6366f1" rx="2"/>`;
      })
      .join("");
  } else {
    // line chart
    const step = values.length > 1 ? Math.floor((W - PAD * 2) / (values.length - 1)) : 0;
    const pts = values
      .map((v, i) => {
        const x = PAD + i * step;
        const y = H - PAD - Math.round(((H - PAD * 2) * v) / max);
        return `${x},${y}`;
      })
      .join(" ");
    innerSvg = `<polyline points="${pts}" fill="none" stroke="#6366f1" stroke-width="2"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#1e1e2e">${innerSvg}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
export function registerChartIpc(safeHandle: SafeHandle): void {
  safeHandle("chart:generate", async (_, payload) => {
    const { text } = payload as { text: string };
    const source = String(text ?? "").trim();

    if (!source) {
      return {
        chartType: "none",
        title: "No Data",
        description: "Provide numeric values to generate a chart summary.",
      } satisfies ChartResult;
    }

    const values = parseNumericValues(source);
    if (values.length === 0) {
      return {
        chartType: "text-only",
        title: "No Numeric Series Detected",
        description:
          "Could not detect numeric values. Paste comma/tab-separated numbers or table data.",
      } satisfies ChartResult;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, current) => acc + current, 0);
    const mean = sum / values.length;

    return {
      chartType: pickChartType(values),
      title: `Detected ${values.length} data point${values.length > 1 ? "s" : ""}`,
      description: `Min ${min.toFixed(2)}, Max ${max.toFixed(2)}, Avg ${mean.toFixed(2)}.`,
      dataUrl: generateSvgChart(values, pickChartType(values)),
    } satisfies ChartResult;
  });
}
