'use client';

import { useEffect, useState } from 'react';
import Button from '@/app/components/button';
import { PageWrapper } from '@/app/components/page-wrapper';
import { FleetSummary, OtaFleetService } from '@/services/ota-fleet-service';
import styles from './styles.module.scss';

export default function FleetPage() {
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSummary(await OtaFleetService.fetchFleetSummary());
    } catch (err) {
      console.error(err);
      setError('Failed to load fleet summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <PageWrapper>
      <PageWrapper.Title>Fleet Overview</PageWrapper.Title>
      <div className={styles.page}>
        <div>
          <Button variant='outline' onClick={refresh} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {error && <p className={styles.statusError}>{error}</p>}

        <div className={styles.summaryGrid}>
          <Metric title='Targets' value={summary?.targets.length ?? 0} />
          <Metric title='Products' value={Object.keys(summary?.productCounts ?? {}).length} />
          <Metric title='Service Packs' value={Object.keys(summary?.servicePackCounts ?? {}).length} />
          <Metric title='Failed Updates' value={summary?.failedTargets.length ?? 0} tone={(summary?.failedTargets.length ?? 0) > 0 ? 'error' : 'good'} />
        </div>

        <div className={styles.panelGrid}>
          <Panel title='Products'>
            <KeyValueList values={summary?.productCounts ?? {}} empty='No product reports yet' />
          </Panel>
          <Panel title='Update Status'>
            <KeyValueList values={summary?.statusCounts ?? {}} empty='No targets yet' />
          </Panel>
          <Panel title='Service Pack Versions'>
            <KeyValueList values={summary?.servicePackCounts ?? {}} empty='No service-pack reports yet' />
          </Panel>
          <Panel title='Component Versions'>
            <ComponentVersionList values={summary?.componentVersionCounts ?? {}} />
          </Panel>
          <Panel title='Device Authentication'>
            <div className={styles.list}>
              <div className={styles.listRow}>
                <span>Gateway authentication</span>
                <span className={summary?.auth.gatewayEnabled ? styles.statusGood : styles.statusWarn}>{summary?.auth.gatewayEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className={styles.listRow}>
                <span>Gateway token</span>
                <span className={styles.key}>{summary?.auth.gatewayToken || '-'}</span>
              </div>
              <div className={styles.listRow}>
                <span>Target token auth</span>
                <span>{summary?.auth.targetTokenEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className={styles.listRow}>
                <span>Polling</span>
                <span>{summary?.auth.pollingTime || '-'}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PageWrapper>
  );
}

function Metric({ title, value, tone }: { title: string; value: number; tone?: 'good' | 'warn' | 'error' }) {
  const toneClass = tone === 'error' ? styles.statusError : tone === 'warn' ? styles.statusWarn : tone === 'good' ? styles.statusGood : '';

  return (
    <section className={styles.panel}>
      <span className={`${styles.metricValue} ${toneClass}`}>{value}</span>
      <span className={styles.metricLabel}>{title}</span>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {children}
    </section>
  );
}

function KeyValueList({ values, empty }: { values: Record<string, number>; empty: string }) {
  const rows = Object.entries(values);

  if (!rows.length) {
    return <span className={styles.muted}>{empty}</span>;
  }

  return (
    <div className={styles.list}>
      {rows.map(([key, value]) => (
        <div className={styles.listRow} key={key}>
          <span className={styles.key}>{key}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

function ComponentVersionList({ values }: { values: Record<string, Record<string, number>> }) {
  const groups = Object.entries(values).filter(([, counts]) => Object.keys(counts).length > 0);

  if (!groups.length) {
    return <span className={styles.muted}>No component reports yet</span>;
  }

  return (
    <div className={styles.componentList}>
      {groups.map(([component, counts]) => (
        <div className={styles.componentGroup} key={component}>
          <span className={styles.componentName}>{component}</span>
          <KeyValueList values={counts} empty='No reports' />
        </div>
      ))}
    </div>
  );
}
