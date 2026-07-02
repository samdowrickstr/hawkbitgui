import { StylesConfig } from 'react-select';

export interface BaseOption {
  id: number | string;
  name: string;
  colour?: string;
  onEdit?: (opt: BaseOption) => void;
  onDelete?: (opt: BaseOption) => void;
}

export function createCustomStyles<T extends BaseOption>(): StylesConfig<T, true> {
  const accent = '#1aa6c0';

  return {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused || state.menuIsOpen ? accent : '#ccc',
      boxShadow: state.isFocused || state.menuIsOpen ? `0 0 0 1px ${accent}` : 'none',
      ':hover': {
        border: `1px solid ${accent}`,
        boxShadow: `0 0 0 1px ${accent}`,
      },
      ':focus': {
        border: `1px solid ${accent}`,
        boxShadow: `0 0 0 1px ${accent}`,
      },
      ':active': {
        border: `1px solid ${accent}`,
        boxShadow: `0 0 0 1px ${accent}`,
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'transparent',
      border: '1px solid #dce8ee',
      borderRadius: '8px',
    }),
    multiValueLabel: (base) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
    }),
  };
}
