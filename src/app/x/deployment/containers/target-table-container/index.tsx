'use client';

import TargetTable from '../../components/target-table';
import { useTargetsTableStore } from '@/stores/targets-table-store';
import { Target } from '@/entities';
import React, { useState } from 'react';
import { TargetsService } from '@/services/targets-service';
import TargetInfo from '@/app/components/target-info-modal';
import { Modal } from '@/app/components/modal';
import ConfirmDeleteModal from '@/app/components/confirm-delete-modal';
import { useConfirmDialog, useTargetsPolling } from '@/app/hooks';
import EditTargetFormContainer from '../edit-target-form-container';
import { useTargetActionsTableStore } from '@/stores/target-action-table-store';

export default function TargetTableContainer() {
  const filteredTargets = useTargetsTableStore((state) => state.filteredTargets);
  const isLoading = useTargetsTableStore((state) => state.isLoading);
  const isExpanded = useTargetsTableStore((state) => state.isExpanded);
  const fetchTargets = useTargetsTableStore((state) => state.fetchTargets);
  const page = useTargetsTableStore((state) => state.page);
  const size = useTargetsTableStore((state) => state.size);
  const total = useTargetsTableStore((state) => state.total);
  const setPage = useTargetsTableStore((state) => state.setPage);
  const targetsTableStore = useTargetsTableStore();
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const setTargetActionTargetId = useTargetActionsTableStore((state) => state.setSelectedTargetId);

  const [isTargetInfoModalOpen, setIsTargetInfoModalOpen] = useState(false);
  const [isEditTargetModalOpen, setIsEditTargetModalOpen] = useState(false);

  const confirmDialog = useConfirmDialog<Target>();

  const handleDeleteClick = (target: Target) => {
    confirmDialog.open(target, async () => {
      await TargetsService.deleteTarget(target.controllerId);
      await fetchTargets();
      targetsTableStore.resetSelectedTarget();
    });
  };

  const handleEditClick = (target: Target) => {
    targetsTableStore.setSelectedTarget(target);
    setIsEditTargetModalOpen(true);
  };

  const handleOnRowClick = (target: Target) => {
    targetsTableStore.setSelectedTarget(target);
    setTargetActionTargetId(target.controllerId);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchTargets();
  };

  useTargetsPolling();

  const productOptions = Array.from(new Set(filteredTargets.map((target) => target.ota?.product).filter((product): product is string => !!product))).sort();
  const visibleTargets = selectedProduct === 'all' ? filteredTargets : filteredTargets.filter((target) => target.ota?.product === selectedProduct);

  return (
    <>
      {productOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            type='button'
            onClick={() => setSelectedProduct('all')}
            style={{
              border: '1px solid #dce8ee',
              borderRadius: 999,
              padding: '4px 10px',
              background: selectedProduct === 'all' ? '#172433' : '#eef7fb',
              color: selectedProduct === 'all' ? '#fff' : '#405261',
              cursor: 'pointer',
            }}
          >
            All products
          </button>
          {productOptions.map((product) => (
            <button
              type='button'
              key={product}
              onClick={() => setSelectedProduct(product)}
              style={{
                border: '1px solid #dce8ee',
                borderRadius: 999,
                padding: '4px 10px',
                background: selectedProduct === product ? '#172433' : '#eef7fb',
                color: selectedProduct === product ? '#fff' : '#405261',
                cursor: 'pointer',
              }}
            >
              {product}
            </button>
          ))}
        </div>
      )}
      <TargetTable
        targets={visibleTargets.map((target) => ({
          ...target,
          status: 'Error',
        }))}
        expanded={isExpanded}
        onTargetNameClick={(target) => {
          targetsTableStore.setSelectedTarget(target);
          setIsTargetInfoModalOpen(true);
        }}
        pagination={{
          page,
          size,
          totalItems: total,
        }}
        onDeleteClick={handleDeleteClick}
        onEditClick={handleEditClick}
        onRowClick={handleOnRowClick}
        isLoading={isLoading}
        onPageChange={handlePageChange}
      />
      <Modal isOpen={isTargetInfoModalOpen} variant='unstyled' size='lg' onClose={() => setIsTargetInfoModalOpen(false)}>
        <TargetInfo />
      </Modal>
      <Modal isOpen={isEditTargetModalOpen} onClose={() => setIsEditTargetModalOpen(false)} size={'md'}>
        <EditTargetFormContainer onCancel={() => setIsEditTargetModalOpen(false)} onSubmitSuccess={() => setIsEditTargetModalOpen(false)} />
      </Modal>
      <ConfirmDeleteModal isOpen={confirmDialog.isOpen} onConfirm={confirmDialog.confirm} onClose={confirmDialog.close}>
        <ConfirmDeleteModal.Message>
          Are you sure you want to delete target <span style={{ fontWeight: 'bold' }}>{confirmDialog.data?.name}</span>?
        </ConfirmDeleteModal.Message>
      </ConfirmDeleteModal>
    </>
  );
}
