'use client';

import TargetDetails from '@/app/components/target-info-modal/components/target-details';
import { useTargetsTableStore } from '@/stores/targets-table-store';

export default function TargetDetailsContainer() {
    const selectedTarget = useTargetsTableStore((state) => state.selectedTarget);
    return (
        <TargetDetails
            controllerId={selectedTarget?.controllerId}
            lastPoll={
                selectedTarget?.pollStatus?.lastRequestAt
                    ? new Date(selectedTarget.pollStatus.lastRequestAt)
                    : selectedTarget?.lastControllerRequestAt
                      ? new Date(selectedTarget.lastControllerRequestAt)
                      : undefined
            }
            nextExpectedPoll={selectedTarget?.pollStatus?.nextExpectedRequestAt ? new Date(selectedTarget.pollStatus.nextExpectedRequestAt) : undefined}
            pollOverdue={selectedTarget?.pollStatus?.overdue}
            address={selectedTarget?.address}
            description={selectedTarget?.description}
            securityToken={selectedTarget?.securityToken}
            createdAt={selectedTarget?.createdAt ? new Date(selectedTarget.createdAt) : undefined}
            createdBy={selectedTarget?.createdBy}
            lastModifiedAt={selectedTarget?.lastModifiedAt ? new Date(selectedTarget.lastModifiedAt) : undefined}
            lastModifiedBy={selectedTarget?.lastModifiedBy}
            product={selectedTarget?.ota?.product}
            os={selectedTarget?.ota?.os}
            servicePack={selectedTarget?.ota?.servicePack}
            backend={selectedTarget?.ota?.backend}
            dashboard={selectedTarget?.ota?.dashboard}
            webui={selectedTarget?.ota?.webui}
            watchdog={selectedTarget?.ota?.watchdog}
            pilot={selectedTarget?.ota?.pilot}
            kernel={selectedTarget?.ota?.kernel}
            hwrev={selectedTarget?.ota?.hwrev}
            abSlot={selectedTarget?.ota?.abSlot}
        />
    );
}
