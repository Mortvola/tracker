import React from 'react';
import { Button } from 'react-bootstrap';
import { NextPanelHandler } from './types';
import styles from './Panel.module.css';
import { useStore } from '../Context';

type PropsType = {
  onNext: NextPanelHandler,
}

const UrlPanel: React.FC<PropsType> = ({
  onNext,
}) => {
  const store = useStore();
  const [url, setUrl] = React.useState<string>(store.url ?? '');

  const handlePrevClick = () => {
    store.url = url;
    onNext('intro');
  };

  const handleNextClick = () => {
    store.url = url;
    onNext('password');
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setUrl(event.target.value);
  };

  return (
    <div className={styles.body}>
      <div>
        Enter the portion of the MapShare URL after &quot;share.garmin.com/&quot;.
      </div>
      <div className={styles.inputWrapper}>
        share.garmin.com/
        <input onChange={handleChange} value={url} />
      </div>
      <img src="/mapshare_url.png" alt="mapshare" style={{ width: '80%' }} />
      <div className={styles.footer}>
        <Button onClick={handlePrevClick}>Previous</Button>
        <Button onClick={handleNextClick} disabled={url === ''}>Next</Button>
      </div>
    </div>
  );
};

export default UrlPanel;
