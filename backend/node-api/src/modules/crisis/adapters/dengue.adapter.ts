import { getDengueClusters } from "../../dengue/dengue.service";
import { centroidOfPositions } from "../regions";
import { slug } from "../../../utils/records";
import type { DengueClusterGeometry } from "../../../../../shared/types/dengue";
import type { CrisisEvent, Severity } from "../../../../../shared/types/crisisEvent";

const DENGUE_STREET_RADIUS_METERS = 150;

/** NEA cluster banding: red (high) ≥ 10 cases, others lower risk. */
function dengueSeverity(caseSize: number): Severity {
  if (caseSize >= 10) return "danger";
  if (caseSize >= 5) return "warning";
  if (caseSize >= 1) return "advisory";
  return "info";
}

/** Flatten a Polygon/MultiPolygon ring structure into a flat list of [lng, lat]. */
function flattenPositions(geometry: DengueClusterGeometry): number[][] {
  const positions: number[][] = [];
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      positions.push(node as number[]);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(geometry.coordinates);
  return positions;
}

export async function dengueEvents(): Promise<CrisisEvent[]> {
  const clusters = await getDengueClusters();

  return clusters.map((cluster) => {
    const location = centroidOfPositions(flattenPositions(cluster.geometry));
    return {
      id: `NEA:dengue-cluster:${slug(cluster.locality)}`,
      source: "NEA",
      hazardType: "biological",
      category: "dengue-cluster",
      title: `Dengue cluster - ${cluster.locality} (${cluster.caseSize} cases)`,
      severity: dengueSeverity(cluster.caseSize),
      location,
      area: cluster.locality,
      vicinityRadiusMeters: DENGUE_STREET_RADIUS_METERS,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: { locality: cluster.locality, caseSize: cluster.caseSize },
    } satisfies CrisisEvent;
  });
}
