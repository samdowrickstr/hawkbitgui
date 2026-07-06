import { Distribution, Target } from '@/entities';
import { DistributionSetsService } from '@/services/distribution-sets-service';
import { SystemConfigurationService } from '@/services/system-configuration-service';
import { HawkbitSystemConfigKey } from '@/services/system-configuration-service.types';
import { TargetsService } from '@/services/targets-service';

export type EnrichedTarget = Target & Required<Pick<Target, 'ota'>>;

export type FleetSummary = {
  targets: EnrichedTarget[];
  distributions: Distribution[];
  productCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  servicePackCounts: Record<string, number>;
  componentVersionCounts: Record<string, Record<string, number>>;
  failedTargets: EnrichedTarget[];
  pendingTargets: EnrichedTarget[];
  auth: {
    gatewayEnabled: boolean;
    gatewayToken: string;
    targetTokenEnabled: boolean;
    anonymousDownloadEnabled: boolean;
    pollingTime: string;
    pollingOverdueTime: string;
  };
};

function getAttribute(attributes: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (attributes[key]) return attributes[key];
  }

  return undefined;
}

function distributionLabel(distribution?: Distribution) {
  if (!distribution) return undefined;
  return `${distribution.name}:${distribution.version}`;
}

async function safeGetAttributes(controllerId: string) {
  try {
    return await TargetsService.getAttributes(controllerId);
  } catch {
    return {};
  }
}

async function safeGetInstalledDistribution(controllerId: string) {
  try {
    return await TargetsService.getInstalledDistribution(controllerId);
  } catch {
    return undefined;
  }
}

async function safeGetAssignedDistribution(controllerId: string) {
  try {
    return await TargetsService.getAssignedDistribution(controllerId);
  } catch {
    return undefined;
  }
}

export class OtaFleetService {
  static async enrichTargets(targets: Target[]): Promise<EnrichedTarget[]> {
    return Promise.all(
      targets.map(async (target) => {
        const [attributes, installedDistribution, assignedDistribution] = await Promise.all([
          safeGetAttributes(target.controllerId),
          safeGetInstalledDistribution(target.controllerId),
          safeGetAssignedDistribution(target.controllerId),
        ]);

        return {
          ...target,
          ota: {
            attributes,
            product: getAttribute(attributes, 'product'),
            os: getAttribute(attributes, 'os', 'rootfs'),
            servicePack: getAttribute(attributes, 'service-pack', 'service_pack', 'servicePack'),
            backend: getAttribute(attributes, 'backend', 'str-backend'),
            dashboard: getAttribute(attributes, 'dashboard', 'frontend', 'rd178-dash'),
            webui: getAttribute(attributes, 'webui', 'web-ui', 'str-webui'),
            watchdog: getAttribute(attributes, 'watchdog', 'str-watchdog'),
            pilot: getAttribute(attributes, 'pilot', 'str-pilot'),
            kernel: getAttribute(attributes, 'kernel'),
            hwrev: getAttribute(attributes, 'hwrev', 'hardware-revision', 'hardwareRevision'),
            abSlot: getAttribute(attributes, 'ab-slot', 'ab_slot', 'activeSlot'),
            stm32: getAttribute(attributes, 'stm32', 'stm32-fw', 'stm32_fw'),
            pic: getAttribute(attributes, 'pic', 'pic-fw', 'pic_fw'),
            pcb: getAttribute(attributes, 'pcb', 'pcb-fw', 'pcb_fw'),
            installedDistribution: distributionLabel(installedDistribution),
            assignedDistribution: distributionLabel(assignedDistribution),
          },
        };
      })
    );
  }

  static async fetchEnrichedTargets(limit = 500): Promise<EnrichedTarget[]> {
    const { targets } = await TargetsService.fetchTargets({
      filters: [],
      queryParams: { limit, sort: 'name:ASC' },
    });

    return this.enrichTargets(targets);
  }

  static async fetchFleetSummary(): Promise<FleetSummary> {
    const [targets, distributionsOutput, configs] = await Promise.all([
      this.fetchEnrichedTargets(),
      DistributionSetsService.fetchDistributionSets({ filters: [] }, { limit: 500, sort: 'name:ASC' }),
      SystemConfigurationService.getSystemConfiguration(),
    ]);

    const productCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const servicePackCounts: Record<string, number> = {};
    const componentVersionCounts: Record<string, Record<string, number>> = {
      OS: {},
      Backend: {},
      Dashboard: {},
      'Web UI': {},
      Watchdog: {},
      Pilot: {},
      Kernel: {},
      Slot: {},
    };

    const increment = (bucket: Record<string, number>, value?: string) => {
      const key = value || 'Unknown';
      bucket[key] = (bucket[key] ?? 0) + 1;
    };

    targets.forEach((target) => {
      const product = target.ota.product ?? 'Unknown';
      const status = target.updateStatus ?? 'unknown';
      const servicePack = target.ota.servicePack ?? target.ota.installedDistribution ?? 'Unknown';

      productCounts[product] = (productCounts[product] ?? 0) + 1;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      servicePackCounts[servicePack] = (servicePackCounts[servicePack] ?? 0) + 1;
      increment(componentVersionCounts.OS, target.ota.os);
      increment(componentVersionCounts.Backend, target.ota.backend);
      increment(componentVersionCounts.Dashboard, target.ota.dashboard);
      increment(componentVersionCounts['Web UI'], target.ota.webui);
      increment(componentVersionCounts.Watchdog, target.ota.watchdog);
      increment(componentVersionCounts.Pilot, target.ota.pilot);
      increment(componentVersionCounts.Kernel, target.ota.kernel);
      increment(componentVersionCounts.Slot, target.ota.abSlot);
    });

    return {
      targets,
      distributions: distributionsOutput.distributionSets,
      productCounts,
      statusCounts,
      servicePackCounts,
      componentVersionCounts,
      failedTargets: targets.filter((target) => target.updateStatus === 'error'),
      pendingTargets: targets.filter((target) => target.updateStatus === 'pending'),
      auth: {
        gatewayEnabled: Boolean(configs[HawkbitSystemConfigKey.AUTH_GATEWAYTOKEN_ENABLED]?.value),
        gatewayToken: String(configs[HawkbitSystemConfigKey.AUTH_GATEWAYTOKEN_KEY]?.value ?? ''),
        targetTokenEnabled: Boolean(configs[HawkbitSystemConfigKey.AUTH_TARGETTOKEN_ENABLED]?.value),
        anonymousDownloadEnabled: Boolean(configs[HawkbitSystemConfigKey.ANONYMOUS_DOWNLOAD_ENABLED]?.value),
        pollingTime: String(configs[HawkbitSystemConfigKey.POLLING_TIME]?.value ?? ''),
        pollingOverdueTime: String(configs[HawkbitSystemConfigKey.POLLING_OVERDUE_TIME]?.value ?? ''),
      },
    };
  }
}
