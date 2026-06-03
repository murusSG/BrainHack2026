import { ltaClient } from "../../services/lta.client";
import { transportRepo } from "../../repositories/transport.repo";
import type {
  LtaResponse,
  LtaFloodAlertItem,
  LtaTrafficIncident,
  LtaTrainServiceAlert,
  LtaTrainServiceAlertsResponse,
} from "./transport.types";
import type { LtaFloodAlert, TrafficIncident, TrainAlert } from "../../../../shared/types/transport";

export async function getTrafficIncidents(): Promise<TrafficIncident[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaTrafficIncident>>("/TrafficIncidents");

  const incidents: TrafficIncident[] = data.value.map((item) => ({
    type: item.Type,
    message: item.Message,
    latitude: item.Latitude,
    longitude: item.Longitude,
  }));

  transportRepo.saveIncidents(incidents).catch(console.error);
  return incidents;
}

export async function getTrainAlerts(): Promise<TrainAlert[]> {
  const { data } = await ltaClient.get<LtaTrainServiceAlertsResponse>("/TrainServiceAlerts");

  const alerts: TrainAlert[] = data.value.map((item: LtaTrainServiceAlert) => ({
    status: item.Status,
    message: item.Message,
    affectedSegments: item.AffectedSegments.map((seg) => ({
      line: seg.Line,
      direction: seg.Direction,
      stations: seg.Stations,
      freePublicBus: seg.FreePublicBus,
      freeMRTShuttle: seg.FreeMRTShuttle,
      mRTShuttleDirection: seg.MRTShuttleDirection,
    })),
  }));

  return alerts;
}

export async function getLtaFloodAlerts(): Promise<LtaFloodAlert[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaFloodAlertItem>>("/Flood-Alerts");

  return data.value.map((item) => ({
    nodeId: item.NodeID,
    linkId: item.LinkID,
    latitude: item.Latitude,
    longitude: item.Longitude,
    alertMessage: item.AlertMessage,
    alertLevel: item.AlertLevel,
    previousAlertLevel: item.PreviousAlertLevel,
  }));
}
