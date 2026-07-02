'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@/app/components/button';
import Input from '@/app/components/input';
import TextArea from '@/app/components/text-area';
import FormControl from '@/app/components/form-control';
import { PageWrapper } from '@/app/components/page-wrapper';
import { Modal } from '@/app/components/modal';
import { DistributionSetType } from '@/entities/distribution-set-type';
import { SoftwareModuleType } from '@/entities/software-module-type';
import { Tag } from '@/entities/tag';
import { TargetFilter } from '@/entities/target-filter';
import { DistributionSetTypesService } from '@/services/distribution-set-types-service';
import { SoftwareModuleTypesService } from '@/services/software-module-types-service';
import { TargetFiltersService } from '@/services/target-filters-service';
import { TargetTagsService } from '@/services/target-tags-service';
import styles from './styles.module.scss';

type DistributionSetTypeWithModules = DistributionSetType & {
  mandatoryModules: SoftwareModuleType[];
  optionalModules: SoftwareModuleType[];
};

type SoftwareModuleTypeFormState = {
  id?: number;
  name: string;
  key: string;
  description: string;
  colour: string;
  maxAssignments: number;
};

type DistributionSetTypeFormState = {
  id?: number;
  name: string;
  key: string;
  description: string;
  colour: string;
  mandatoryModuleIds: number[];
  optionalModuleIds: number[];
};

type TargetTagFormState = {
  id?: number;
  name: string;
  description: string;
  colour: string;
};

type TargetFilterFormState = {
  id?: number;
  name: string;
  query: string;
};

const DEFAULT_SOFTWARE_MODULE_TYPE: SoftwareModuleTypeFormState = {
  name: '',
  key: '',
  description: '',
  colour: '#1aa6c0',
  maxAssignments: 1,
};

const DEFAULT_DISTRIBUTION_SET_TYPE: DistributionSetTypeFormState = {
  name: '',
  key: '',
  description: '',
  colour: '#15314c',
  mandatoryModuleIds: [],
  optionalModuleIds: [],
};

const DEFAULT_TARGET_TAG: TargetTagFormState = {
  name: '',
  description: '',
  colour: '#1aa6c0',
};

const DEFAULT_TARGET_FILTER: TargetFilterFormState = {
  name: '',
  query: '',
};

export default function ProductStructurePage() {
  const [softwareModuleTypes, setSoftwareModuleTypes] = useState<SoftwareModuleType[]>([]);
  const [distributionSetTypes, setDistributionSetTypes] = useState<DistributionSetTypeWithModules[]>([]);
  const [targetTags, setTargetTags] = useState<Tag[]>([]);
  const [targetFilters, setTargetFilters] = useState<TargetFilter[]>([]);
  const [softwareModuleTypeForm, setSoftwareModuleTypeForm] = useState<SoftwareModuleTypeFormState | null>(null);
  const [distributionSetTypeForm, setDistributionSetTypeForm] = useState<DistributionSetTypeFormState | null>(null);
  const [targetTagForm, setTargetTagForm] = useState<TargetTagFormState | null>(null);
  const [targetFilterForm, setTargetFilterForm] = useState<TargetFilterFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDistributionSetTypesWithModules = useCallback(async () => {
    const types = await DistributionSetTypesService.fetchDistributionSetTypes();
    return Promise.all(
      types.map(async (type) => {
        const [mandatoryModules, optionalModules] = await Promise.all([
          DistributionSetTypesService.fetchMandatoryModuleTypes(type.id),
          DistributionSetTypesService.fetchOptionalModuleTypes(type.id),
        ]);

        return { ...type, mandatoryModules, optionalModules };
      })
    );
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [nextSoftwareModuleTypes, nextDistributionSetTypes, nextTargetTags, nextTargetFilters] = await Promise.all([
        SoftwareModuleTypesService.fetchSoftwareModuleTypes(),
        fetchDistributionSetTypesWithModules(),
        TargetTagsService.getTags(),
        TargetFiltersService.fetchTargetFilters({ queryParams: { limit: 200 } }),
      ]);

      setSoftwareModuleTypes(nextSoftwareModuleTypes);
      setDistributionSetTypes(nextDistributionSetTypes);
      setTargetTags(nextTargetTags);
      setTargetFilters(nextTargetFilters.targetFilters);
    } catch (err) {
      console.error(err);
      setError('Failed to load product structure from hawkBit.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchDistributionSetTypesWithModules]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const productKeys = useMemo(() => {
    const keys = new Set<string>();

    softwareModuleTypes.forEach((type) => {
      const [prefix] = type.key.split('_');
      if (prefix && !['os', 'application', 'app'].includes(type.key)) {
        keys.add(prefix.toUpperCase());
      }
    });

    targetTags.forEach((tag) => keys.add(tag.name.split('-')[0]));
    return Array.from(keys).sort();
  }, [softwareModuleTypes, targetTags]);

  const handleSoftwareModuleTypeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!softwareModuleTypeForm) return;

    setIsSaving(true);
    setError(null);

    const payload = {
      name: softwareModuleTypeForm.name,
      key: softwareModuleTypeForm.key,
      description: softwareModuleTypeForm.description,
      colour: softwareModuleTypeForm.colour,
      maxAssignments: Number(softwareModuleTypeForm.maxAssignments),
    };

    try {
      if (softwareModuleTypeForm.id) {
        await SoftwareModuleTypesService.updateType(softwareModuleTypeForm.id, payload);
      } else {
        await SoftwareModuleTypesService.createType([payload]);
      }

      setSoftwareModuleTypeForm(null);
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to save software module type.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDistributionSetTypeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!distributionSetTypeForm) return;

    setIsSaving(true);
    setError(null);

    const payload = {
      name: distributionSetTypeForm.name,
      key: distributionSetTypeForm.key,
      description: distributionSetTypeForm.description,
      colour: distributionSetTypeForm.colour,
      mandatorymodules: distributionSetTypeForm.mandatoryModuleIds.map((id) => ({ id })),
      optionalmodules: distributionSetTypeForm.optionalModuleIds.map((id) => ({ id })),
    };

    try {
      if (distributionSetTypeForm.id) {
        await DistributionSetTypesService.updateDistributionSetType(distributionSetTypeForm.id, payload);
      } else {
        await DistributionSetTypesService.createDistributionSetType([payload]);
      }

      setDistributionSetTypeForm(null);
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to save distribution set type.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTargetTagSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetTagForm) return;

    setIsSaving(true);
    setError(null);

    try {
      if (targetTagForm.id) {
        await TargetTagsService.updateTag({
          id: targetTagForm.id,
          name: targetTagForm.name,
          description: targetTagForm.description,
          color: targetTagForm.colour,
        });
      } else {
        await TargetTagsService.createTag({
          name: targetTagForm.name,
          description: targetTagForm.description,
          color: targetTagForm.colour,
        });
      }

      setTargetTagForm(null);
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to save target tag.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTargetFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetFilterForm) return;

    setIsSaving(true);
    setError(null);

    const payload = {
      name: targetFilterForm.name,
      query: targetFilterForm.query,
    };

    try {
      if (targetFilterForm.id) {
        await TargetFiltersService.updateTargetFilter(targetFilterForm.id, payload);
      } else {
        await TargetFiltersService.createTargetFilter(payload);
      }

      setTargetFilterForm(null);
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to save target filter.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModule = (field: 'mandatoryModuleIds' | 'optionalModuleIds', moduleId: number) => {
    setDistributionSetTypeForm((current) => {
      if (!current) return current;

      const values = new Set(current[field]);
      if (values.has(moduleId)) {
        values.delete(moduleId);
      } else {
        values.add(moduleId);
      }

      return { ...current, [field]: Array.from(values) };
    });
  };

  return (
    <PageWrapper>
      <PageWrapper.Title>Product Structure</PageWrapper.Title>

      <div className={styles.page}>
      <div className={styles.toolbar}>
        <Button variant='outline' onClick={refresh} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Products</h2>
        </div>
        <div className={styles.chips}>
          {productKeys.length ? productKeys.map((product) => <span className={styles.chip} key={product}>{product}</span>) : <span className={styles.muted}>No product prefixes found</span>}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Software module types</h2>
            <Button onClick={() => setSoftwareModuleTypeForm(DEFAULT_SOFTWARE_MODULE_TYPE)}>Create</Button>
          </div>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.head}`}>
              <span>Key</span>
              <span>Name</span>
              <span>Description</span>
              <span>Assignments</span>
              <span></span>
            </div>
            {softwareModuleTypes.map((type) => (
              <div className={styles.row} key={type.id}>
                <span className={styles.key}>{type.key}</span>
                <span>{type.name}</span>
                <span className={styles.muted}>{type.description}</span>
                <span>{type.maxAssignments === 2147483647 ? 'Multiple' : type.maxAssignments}</span>
                <span className={styles.actions}>
                  <Button
                    variant='text'
                    onClick={() =>
                      setSoftwareModuleTypeForm({
                        id: type.id,
                        name: type.name,
                        key: type.key,
                        description: type.description,
                        colour: type.colour ?? '#1aa6c0',
                        maxAssignments: type.maxAssignments,
                      })
                    }
                  >
                    Edit
                  </Button>
                </span>
              </div>
            ))}
            {!softwareModuleTypes.length && !isLoading && <div className={styles.row}>No software module types</div>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Distribution set types</h2>
            <Button onClick={() => setDistributionSetTypeForm(DEFAULT_DISTRIBUTION_SET_TYPE)}>Create</Button>
          </div>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.setTypeRow} ${styles.head}`}>
              <span>Key</span>
              <span>Name</span>
              <span>Mandatory modules</span>
              <span>Optional modules</span>
              <span></span>
            </div>
            {distributionSetTypes.map((type) => (
              <div className={`${styles.row} ${styles.setTypeRow}`} key={type.id}>
                <span className={styles.key}>{type.key}</span>
                <span>{type.name}</span>
                <ChipList items={type.mandatoryModules.map((module) => module.key)} />
                <ChipList items={type.optionalModules.map((module) => module.key)} />
                <span className={styles.actions}>
                  <Button
                    variant='text'
                    onClick={() =>
                      setDistributionSetTypeForm({
                        id: type.id,
                        name: type.name,
                        key: type.key,
                        description: type.description,
                        colour: type.colour ?? '#15314c',
                        mandatoryModuleIds: type.mandatoryModules.map((module) => module.id),
                        optionalModuleIds: type.optionalModules.map((module) => module.id),
                      })
                    }
                  >
                    Edit
                  </Button>
                </span>
              </div>
            ))}
            {!distributionSetTypes.length && !isLoading && <div className={styles.row}>No distribution set types</div>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Target segmentation</h2>
            <div className={styles.actions}>
              <Button variant='outline' onClick={() => setTargetTagForm(DEFAULT_TARGET_TAG)}>
                Create tag
              </Button>
              <Button onClick={() => setTargetFilterForm(DEFAULT_TARGET_FILTER)}>Create filter</Button>
            </div>
          </div>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.twoColumnRow} ${styles.head}`}>
              <span>Type</span>
              <span>Value</span>
            </div>
            {targetTags.map((tag) => (
              <div className={`${styles.row} ${styles.twoColumnRow}`} key={`tag-${tag.id}`}>
                <span>Target tag</span>
                <span className={styles.segmentValue}>
                  <span className={styles.chip}>{tag.name}</span>
                  <Button
                    variant='text'
                    onClick={() =>
                      setTargetTagForm({
                        id: tag.id,
                        name: tag.name,
                        description: tag.description,
                        colour: tag.colour ?? '#1aa6c0',
                      })
                    }
                  >
                    Edit
                  </Button>
                </span>
              </div>
            ))}
            {targetFilters.map((filter) => (
              <div className={`${styles.row} ${styles.twoColumnRow}`} key={`filter-${filter.id}`}>
                <span>{filter.name}</span>
                <span className={styles.segmentValue}>
                  <span className={styles.key}>{filter.query}</span>
                  <Button
                    variant='text'
                    onClick={() =>
                      setTargetFilterForm({
                        id: filter.id,
                        name: filter.name,
                        query: filter.query,
                      })
                    }
                  >
                    Edit
                  </Button>
                </span>
              </div>
            ))}
            <div className={`${styles.row} ${styles.twoColumnRow}`}>
              <span>Reported attributes</span>
              <ChipList items={['product', 'os', 'service-pack', 'kernel', 'hwrev']} />
            </div>
          </div>
        </section>
      </div>

      <Modal isOpen={!!softwareModuleTypeForm} onClose={() => setSoftwareModuleTypeForm(null)}>
        <Modal.Header>{softwareModuleTypeForm?.id ? 'Edit software module type' : 'Create software module type'}</Modal.Header>
        <Modal.Content>
          {softwareModuleTypeForm && (
            <form className={styles.form} onSubmit={handleSoftwareModuleTypeSubmit}>
              <div className={styles.formGrid}>
                <FormControl id='software-name' label='Name' required>
                  <Input
                    id='software-name'
                    value={softwareModuleTypeForm.name}
                    onChange={(event) => setSoftwareModuleTypeForm({ ...softwareModuleTypeForm, name: event.target.value })}
                    required
                  />
                </FormControl>
                <FormControl id='software-key' label='Key' required>
                  <Input
                    id='software-key'
                    value={softwareModuleTypeForm.key}
                    onChange={(event) => setSoftwareModuleTypeForm({ ...softwareModuleTypeForm, key: event.target.value })}
                    disabled={!!softwareModuleTypeForm.id}
                    required
                  />
                </FormControl>
              </div>
              <FormControl id='software-description' label='Description'>
                <TextArea
                  id='software-description'
                  value={softwareModuleTypeForm.description}
                  onChange={(event) => setSoftwareModuleTypeForm({ ...softwareModuleTypeForm, description: event.target.value })}
                />
              </FormControl>
              <div className={styles.formGrid}>
                <FormControl id='software-colour' label='Colour'>
                  <Input
                    id='software-colour'
                    type='color'
                    value={softwareModuleTypeForm.colour}
                    onChange={(event) => setSoftwareModuleTypeForm({ ...softwareModuleTypeForm, colour: event.target.value })}
                  />
                </FormControl>
                <FormControl id='software-max-assignments' label='Max assignments' required>
                  <Input
                    id='software-max-assignments'
                    type='number'
                    min={1}
                    value={softwareModuleTypeForm.maxAssignments}
                    onChange={(event) => setSoftwareModuleTypeForm({ ...softwareModuleTypeForm, maxAssignments: Number(event.target.value) })}
                    required
                  />
                </FormControl>
              </div>
              <div className={styles.formActions}>
                <Button variant='outline' onClick={() => setSoftwareModuleTypeForm(null)}>
                  Cancel
                </Button>
                <Button type='submit' isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </Modal.Content>
      </Modal>

      <Modal isOpen={!!distributionSetTypeForm} onClose={() => setDistributionSetTypeForm(null)} size='lg'>
        <Modal.Header>{distributionSetTypeForm?.id ? 'Edit distribution set type' : 'Create distribution set type'}</Modal.Header>
        <Modal.Content>
          {distributionSetTypeForm && (
            <form className={styles.form} onSubmit={handleDistributionSetTypeSubmit}>
              <div className={styles.formGrid}>
                <FormControl id='distribution-name' label='Name' required>
                  <Input
                    id='distribution-name'
                    value={distributionSetTypeForm.name}
                    onChange={(event) => setDistributionSetTypeForm({ ...distributionSetTypeForm, name: event.target.value })}
                    required
                  />
                </FormControl>
                <FormControl id='distribution-key' label='Key' required>
                  <Input
                    id='distribution-key'
                    value={distributionSetTypeForm.key}
                    onChange={(event) => setDistributionSetTypeForm({ ...distributionSetTypeForm, key: event.target.value })}
                    disabled={!!distributionSetTypeForm.id}
                    required
                  />
                </FormControl>
              </div>
              <FormControl id='distribution-description' label='Description'>
                <TextArea
                  id='distribution-description'
                  value={distributionSetTypeForm.description}
                  onChange={(event) => setDistributionSetTypeForm({ ...distributionSetTypeForm, description: event.target.value })}
                />
              </FormControl>
              <FormControl id='distribution-colour' label='Colour'>
                <Input
                  id='distribution-colour'
                  type='color'
                  value={distributionSetTypeForm.colour}
                  onChange={(event) => setDistributionSetTypeForm({ ...distributionSetTypeForm, colour: event.target.value })}
                />
              </FormControl>
              <div className={styles.modulePickers}>
                <ModulePicker
                  title='Mandatory modules'
                  selectedIds={distributionSetTypeForm.mandatoryModuleIds}
                  moduleTypes={softwareModuleTypes}
                  onToggle={(moduleId) => toggleModule('mandatoryModuleIds', moduleId)}
                />
                <ModulePicker
                  title='Optional modules'
                  selectedIds={distributionSetTypeForm.optionalModuleIds}
                  moduleTypes={softwareModuleTypes}
                  onToggle={(moduleId) => toggleModule('optionalModuleIds', moduleId)}
                />
              </div>
              <div className={styles.formActions}>
                <Button variant='outline' onClick={() => setDistributionSetTypeForm(null)}>
                  Cancel
                </Button>
                <Button type='submit' isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </Modal.Content>
      </Modal>

      <Modal isOpen={!!targetTagForm} onClose={() => setTargetTagForm(null)}>
        <Modal.Header>{targetTagForm?.id ? 'Edit target tag' : 'Create target tag'}</Modal.Header>
        <Modal.Content>
          {targetTagForm && (
            <form className={styles.form} onSubmit={handleTargetTagSubmit}>
              <div className={styles.formGrid}>
                <FormControl id='target-tag-name' label='Name' required>
                  <Input
                    id='target-tag-name'
                    value={targetTagForm.name}
                    onChange={(event) => setTargetTagForm({ ...targetTagForm, name: event.target.value })}
                    required
                  />
                </FormControl>
                <FormControl id='target-tag-colour' label='Colour'>
                  <Input
                    id='target-tag-colour'
                    type='color'
                    value={targetTagForm.colour}
                    onChange={(event) => setTargetTagForm({ ...targetTagForm, colour: event.target.value })}
                  />
                </FormControl>
              </div>
              <FormControl id='target-tag-description' label='Description'>
                <TextArea
                  id='target-tag-description'
                  value={targetTagForm.description}
                  onChange={(event) => setTargetTagForm({ ...targetTagForm, description: event.target.value })}
                />
              </FormControl>
              <div className={styles.formActions}>
                <Button variant='outline' onClick={() => setTargetTagForm(null)}>
                  Cancel
                </Button>
                <Button type='submit' isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </Modal.Content>
      </Modal>

      <Modal isOpen={!!targetFilterForm} onClose={() => setTargetFilterForm(null)}>
        <Modal.Header>{targetFilterForm?.id ? 'Edit target filter' : 'Create target filter'}</Modal.Header>
        <Modal.Content>
          {targetFilterForm && (
            <form className={styles.form} onSubmit={handleTargetFilterSubmit}>
              <FormControl id='target-filter-name' label='Name' required>
                <Input
                  id='target-filter-name'
                  value={targetFilterForm.name}
                  onChange={(event) => setTargetFilterForm({ ...targetFilterForm, name: event.target.value })}
                  required
                />
              </FormControl>
              <FormControl id='target-filter-query' label='Query' required>
                <Input
                  id='target-filter-query'
                  value={targetFilterForm.query}
                  onChange={(event) => setTargetFilterForm({ ...targetFilterForm, query: event.target.value })}
                  required
                />
              </FormControl>
              <div className={styles.formActions}>
                <Button variant='outline' onClick={() => setTargetFilterForm(null)}>
                  Cancel
                </Button>
                <Button type='submit' isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </Modal.Content>
      </Modal>
      </div>
    </PageWrapper>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) {
    return <span className={styles.muted}>None</span>;
  }

  return (
    <span className={styles.chips}>
      {items.map((item) => (
        <span className={styles.chip} key={item}>
          {item}
        </span>
      ))}
    </span>
  );
}

function ModulePicker({
  title,
  selectedIds,
  moduleTypes,
  onToggle,
}: {
  title: string;
  selectedIds: number[];
  moduleTypes: SoftwareModuleType[];
  onToggle: (moduleId: number) => void;
}) {
  return (
    <div className={styles.picker}>
      <span className={styles.pickerTitle}>{title}</span>
      {moduleTypes.map((moduleType) => (
        <label className={styles.checkRow} key={moduleType.id}>
          <input type='checkbox' checked={selectedIds.includes(moduleType.id)} onChange={() => onToggle(moduleType.id)} />
          <span className={styles.key}>{moduleType.key}</span>
          <span>{moduleType.name}</span>
        </label>
      ))}
    </div>
  );
}
