import { useContext } from 'react';

import { MintlayerUnit } from '../../models/mintlayerUnits';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const getFormattedMlUnitByTestMode = (unit, isTestMode) => {
  if (isTestMode && unit === MintlayerUnit.ML) {
    return MintlayerUnit.TML;
  }

  return unit;
};

const useFormattedMlUnit = () => {
  const { isTestMode } = useContext(BlueStorageContext);
  const getFormattedUnit = (unit) => getFormattedMlUnitByTestMode(unit, isTestMode);

  return { getFormattedUnit };
};

export { useFormattedMlUnit, getFormattedMlUnitByTestMode };
