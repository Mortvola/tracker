import React from 'react';
import { Button } from 'react-bootstrap';
import { NextPanelHandler } from './types';
import styles from './Panel.module.css';

type PropsType = {
  onNext: NextPanelHandler,
}

const IntroPanel: React.FC<PropsType> = ({
  onNext,
}) => {
  const handleClick = () => {
    onNext('url');
  };

  // const handleSkipClick = () => {
  //   onNext('finish');
  // };

  return (
    <div className={styles.body}>
      <div style={{ marginBottom: '1rem' }}>Let&apos;s get you set up.</div>
      <div className={styles.intro}>
        To participate in the generation of the heat map, we will
        retrieve location information from your Garmin MapShare.
        If you don&apos;t already have MapShare enabled, you can enable
        it on your
        <a
          href="https://explore.garmin.com/Social"
          target="_blank"
          rel="noreferrer"
        >
          explore.garmin.com
        </a>
        social page.
      </div>
      <img src="/mapshare_enabled.png" alt="mapshare" style={{ width: '80%' }} />
      <div className={styles.footer}>
        {/* <Button onClick={handleSkipClick}>Skip</Button> */}
        <Button onClick={handleClick}>Next</Button>
      </div>
    </div>
  );
};

export default IntroPanel;
