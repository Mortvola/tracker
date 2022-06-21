import React from 'react';
import { FieldProps } from './FormField';
import styles from './GarminAddress.module.css';

type GarminAddressProps = FieldProps;

const GarminAddress = React.forwardRef<HTMLInputElement, GarminAddressProps>((
  props,
  ref,
) => (
  <div className={styles.url}>
    <div>share.garmin.com/</div>
    <input
      type="text"
      {...props}
      ref={ref}
    />
  </div>
));

GarminAddress.displayName = 'GarminAddress';

export default GarminAddress;
