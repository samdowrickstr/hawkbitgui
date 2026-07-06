'use client';

import { Distribution } from '@/entities';
import React, { useRef, useState } from 'react';
import ConfirmDeleteModal from '@/app/components/confirm-delete-modal';
import { useConfirmDialog } from '@/app/hooks';
import DistributionsTable from '@/app/x/deployment/components/distributions-table';
import { useDistributionsTableStore } from '@/stores/distributions-table-store';
import { DistributionSetsService } from '@/services/distribution-sets-service';
import { Modal } from '@/app/components/modal';
import DistributionInfo from '@/app/x/deployment/components/distribution-info';
import { useDistributionsPolling } from '@/app/hooks/use-distributions-polling';
import { useTargetsTableStore } from '@/stores/targets-table-store';
import ConfirmationModal from '@/app/components/confirmation-modal';
import ScheduleForm, { FormData as ScheduleFormData } from '@/app/x/deployment/components/schedule-form';
import { AssignConfig } from '@/services/targets-service.types';
import { TargetsService } from '@/services/targets-service';
import { handleErrorWithToast } from '@/utils/handle-error-with-toast';
import { useTargetActionsTableStore } from '@/stores/target-action-table-store';

const mapScheduleFormDataToAssignConfig = (id: string | number, data?: ScheduleFormData): AssignConfig => {
  if (!data) {
    return { id };
  }

  const assignConfig: AssignConfig = {
    id,
    type: data.mode,
    maintenanceWindow: data.maintenanceWindow
      ? {
          schedule: data.schedule,
          duration: data.duration,
          timezone: data.timeZone,
        }
      : undefined,
  };

  if (data.mode === 'timeforced' && data.forcedDate) {
    assignConfig.forcetime = new Date(data.forcedDate).getTime();
  }

  return assignConfig;
};

export default function DistributionsTableContainer() {
  const filteredDistributions = useDistributionsTableStore((state) => state.filteredDistributions);
  const isLoading = useDistributionsTableStore((state) => state.isLoading);
  const isExpanded = useDistributionsTableStore((state) => state.isExpanded);
  const fetchDistributions = useDistributionsTableStore((state) => state.fetchDistributions);
  const page = useDistributionsTableStore((state) => state.page);
  const size = useDistributionsTableStore((state) => state.size);
  const total = useDistributionsTableStore((state) => state.total);
  const setPage = useDistributionsTableStore((state) => state.setPage);
  const distributionsTableStore = useDistributionsTableStore();
  const selectedTarget = useTargetsTableStore((state) => state.selectedTarget);
  const fetchTargetActions = useTargetActionsTableStore((state) => state.fetchActions);
  const scheduleFormData = useRef<ScheduleFormData | undefined>(undefined);

  const [isDistributionInfoModalOpen, setIsDistributionInfoModalOpen] = useState(false);
  const [distributionToAssign, setDistributionToAssign] = useState<Distribution | undefined>();

  const confirmDialog = useConfirmDialog<Distribution>();

  const handleDeleteClick = (distribution: Distribution) => {
    confirmDialog.open(distribution, async () => {
      await DistributionSetsService.deleteDistributionSet(distribution.id);
      await fetchDistributions();
      distributionsTableStore.resetSelectedDistribution();
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchDistributions();
  };

  const handleAssignClick = (distribution: Distribution) => {
    if (!selectedTarget) {
      return;
    }

    scheduleFormData.current = undefined;
    setDistributionToAssign(distribution);
  };

  const handleAssignConfirm = async () => {
    if (!distributionToAssign || !selectedTarget) {
      return;
    }

    try {
      await TargetsService.assignDistributionsToTarget({
        controllerId: selectedTarget.controllerId,
        distributionsConfigs: [mapScheduleFormDataToAssignConfig(distributionToAssign.id, scheduleFormData.current)],
      });
      await fetchTargetActions(selectedTarget.controllerId);
      setDistributionToAssign(undefined);
    } catch (error) {
      handleErrorWithToast(error, 'Failed to assign distribution to target');
    }
  };

  useDistributionsPolling();

  return (
    <>
      <DistributionsTable
        distributions={filteredDistributions.map((distribution) => ({
          ...distribution,
          status: 'Error',
        }))}
        expanded={isExpanded}
        onNameClick={(distribution) => {
          distributionsTableStore.setSelectedDistribution(distribution);
          setIsDistributionInfoModalOpen(true);
        }}
        pagination={{
          page,
          size,
          totalItems: total,
        }}
        onDeleteClick={handleDeleteClick}
        onAssignClick={handleAssignClick}
        canAssign={!!selectedTarget}
        isLoading={isLoading}
        onPageChange={handlePageChange}
      />
      <Modal isOpen={isDistributionInfoModalOpen} variant='unstyled' size='lg' onClose={() => setIsDistributionInfoModalOpen(false)}>
        <DistributionInfo />
      </Modal>
      <ConfirmDeleteModal isOpen={confirmDialog.isOpen} onConfirm={confirmDialog.confirm} onClose={confirmDialog.close}>
        <ConfirmDeleteModal.Message>
          Are you sure you want to delete distribution <span style={{ fontWeight: 'bold' }}>{confirmDialog.data?.name}</span>?
        </ConfirmDeleteModal.Message>
      </ConfirmDeleteModal>
      <ConfirmationModal
        size='lg'
        title='Confirm Direct Assignment'
        isOpen={!!distributionToAssign}
        onClose={() => setDistributionToAssign(undefined)}
        onConfirm={handleAssignConfirm}
      >
        <p>
          Assign distribution set <b>{distributionToAssign?.name}</b> to target <b>{selectedTarget?.name}</b>?
        </p>
        <ScheduleForm onChange={(data) => (scheduleFormData.current = data)} />
      </ConfirmationModal>
    </>
  );
}
