'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/app/components/button';
import { PageWrapper } from '@/app/components/page-wrapper';
import { Distribution, Metadata, SoftwareModule, Target } from '@/entities';
import { DistributionSetsService } from '@/services/distribution-sets-service';
import { OtaFleetService } from '@/services/ota-fleet-service';
import styles from './styles.module.scss';

type Pack = Distribution & {
  metadata: Metadata[];
  assignedTargets: Target[];
};

function moduleGroup(pack: Distribution, predicate: (module: SoftwareModule) => boolean) {
  return pack.modules.filter(predicate);
}

function meta(pack: Pack, key: string) {
  return pack.metadata.find((item) => item.key === key)?.value;
}

export default function ServicePacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployingId, setDeployingId] = useState<number | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { distributionSets } = await DistributionSetsService.fetchDistributionSets({ filters: [] }, { limit: 500, sort: 'name:ASC' });
      const nextPacks = await Promise.all(
        distributionSets.map(async (distribution) => {
          const [metadata, assignedTargets] = await Promise.all([
            DistributionSetsService.getMetadata(distribution.id),
            DistributionSetsService.getAssignedTargets(distribution.id),
          ]);

          return {
            ...distribution,
            metadata,
            assignedTargets,
          };
        })
      );
      setPacks(nextPacks);
    } catch (err) {
      console.error(err);
      setError('Failed to load service packs.');
    } finally {
      setIsLoading(false);
    }
  };

  const deployToCompatibleTargets = async (pack: Pack) => {
    const product = meta(pack, 'product');
    const hwrev = meta(pack, 'hwrev') ?? meta(pack, 'compatible-hwrev');

    setDeployingId(pack.id);
    setError(null);

    try {
      const targets = await OtaFleetService.fetchEnrichedTargets();
      const compatibleTargets = targets.filter((target) => {
        if (product && target.ota.product !== product) return false;
        if (hwrev && target.ota.hwrev !== hwrev) return false;
        return product || hwrev;
      });

      if (!compatibleTargets.length) {
        setError('No compatible targets found. Set product/hwrev metadata on the service pack or wait for targets to report attributes.');
        return;
      }

      await DistributionSetsService.assignTargetsToDistributionSet({
        distributionId: pack.id,
        targetConfigs: compatibleTargets.map((target) => ({ id: target.controllerId, type: 'soft' })),
      });
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to assign service pack to compatible targets.');
    } finally {
      setDeployingId(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const servicePacks = useMemo(() => packs.filter((pack) => pack.type.includes('sp') || pack.typeName.toLowerCase().includes('service')), [packs]);

  return (
    <PageWrapper>
      <PageWrapper.Title>Service Packs</PageWrapper.Title>
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <Button variant='outline' onClick={refresh} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {error && <p className={styles.warning}>{error}</p>}

        <div className={styles.packList}>
          {(servicePacks.length ? servicePacks : packs).map((pack) => {
            const osModules = moduleGroup(pack, (module) => module.type.includes('os') || module.typeName.toLowerCase().includes('os'));
            const firmwareModules = moduleGroup(pack, (module) => module.type.includes('fw') || module.typeName.toLowerCase().includes('firmware'));
            const product = meta(pack, 'product');
            const hwrev = meta(pack, 'hwrev') ?? meta(pack, 'compatible-hwrev');
            const notes = meta(pack, 'release-notes') ?? meta(pack, 'notes');
            const boot = meta(pack, 'boot');
            const git = meta(pack, 'git');
            const artifact = meta(pack, 'artifact');
            const swuSha = meta(pack, 'swu-sha256');
            const canDeploy = pack.complete && pack.valid;

            return (
              <section className={styles.pack} key={pack.id}>
                <div className={styles.packHeader}>
                  <div>
                    <h2 className={styles.packTitle}>{pack.name}</h2>
                    <span className={styles.subtitle}>
                      {pack.version} / {pack.typeName}
                    </span>
                  </div>
                  <Button variant='outline' disabled={!canDeploy} isLoading={deployingId === pack.id} onClick={() => deployToCompatibleTargets(pack)}>
                    Deploy compatible
                  </Button>
                </div>

                <div className={styles.chips}>
                  <span className={styles.chip}>Product: {product ?? 'not set'}</span>
                  <span className={styles.chip}>HW rev: {hwrev ?? 'any/not set'}</span>
                  <span className={styles.chip}>{pack.complete ? 'Complete' : 'Incomplete'}</span>
                  <span className={styles.chip}>{pack.valid ? 'Valid' : 'Invalid'}</span>
                  <span className={pack.assignedTargets.length ? styles.chip : styles.safeChip}>
                    {pack.assignedTargets.length ? `Assigned: ${pack.assignedTargets.length}` : 'Unassigned'}
                  </span>
                </div>

                {!product && <span className={styles.warning}>Missing product metadata; compatibility checks can only use distribution type and target filters.</span>}
                {!canDeploy && <span className={styles.warning}>This service pack is not deployable until hawkBit marks it complete and valid.</span>}

                <div className={styles.grid}>
                  <ModuleSection title='OS / rootfs' modules={osModules} />
                  <ModuleSection title='STM/PIC/PCB firmware' modules={firmwareModules} />
                </div>

                <div className={styles.section}>
                  <span className={styles.sectionTitle}>Release provenance</span>
                  <div className={styles.metaGrid}>
                    <MetaItem label='Boot path' value={boot} />
                    <MetaItem label='Git commit' value={git} mono />
                    <MetaItem label='Artifact' value={artifact} mono />
                    <MetaItem label='SWU SHA-256' value={swuSha} mono truncate />
                  </div>
                </div>

                <div className={styles.section}>
                  <span className={styles.sectionTitle}>Release notes</span>
                  <span className={notes ? undefined : styles.muted}>{notes ?? 'No release notes metadata set.'}</span>
                </div>
              </section>
            );
          })}
          {!packs.length && !isLoading && <span className={styles.muted}>No distribution sets found.</span>}
        </div>
      </div>
    </PageWrapper>
  );
}

function MetaItem({ label, value, mono = false, truncate = false }: { label: string; value?: string; mono?: boolean; truncate?: boolean }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={`${mono ? styles.key : ''} ${truncate ? styles.truncate : ''}`}>{value ?? '-'}</span>
    </div>
  );
}

function ModuleSection({ title, modules }: { title: string; modules: SoftwareModule[] }) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>{title}</span>
      {modules.length ? (
        modules.map((module) => (
          <div className={styles.moduleRow} key={module.id}>
            <span>
              <span className={styles.key}>{module.type}</span> / {module.name}
            </span>
            <span>{module.version}</span>
          </div>
        ))
      ) : (
        <span className={styles.muted}>None</span>
      )}
    </div>
  );
}
