import React from 'react';
import { LocationStatus } from '../Map/Map';
import styles from './GpsFeedStatus.module.css';

type PropsType = {
  status: LocationStatus,
}

const GpsFeedStatus: React.FC<PropsType> = ({ status }) => {
  let color: string;

  switch (status) {
    case 'red':
      color = styles.red;
      break;

    case 'yellow':
      color = styles.yellow;
      break;

    case 'green':
    default:
      color = styles.green;
  }

  return <div className={`${styles.led} ${color}`} />;
};

export default GpsFeedStatus;
