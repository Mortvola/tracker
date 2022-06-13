import React from 'react';
import styles from './Controls.module.css';

type PropsType = {
  min: number,
  max: number,
  onChange: (value: number) => void,
}

const Controls: React.FC<PropsType> = ({ min, max, onChange }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [value, setValue] = React.useState<number>(0);
  const captureRef = React.useRef<boolean>(false);

  const mouseToPercent = (clientX: number) => {
    const bar = ref.current;
    if (bar) {
      const rects = bar.getClientRects();
      const pct = (clientX - rects[0].left) / rects[0].width;
      const v = Math.round((max - min) * pct);
      setValue((v / (max - min)) * 100);
      onChange(v);
    }
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement> & {
      target: {
        setPointerCapture?: (id: number) => void,
      },
    },
  ) => {
    captureRef.current = true;

    mouseToPercent(event.clientX);
    if (event.target.setPointerCapture) {
      event.target.setPointerCapture(event.pointerId);
    }

    event.stopPropagation();
    event.preventDefault();
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (captureRef.current) {
      mouseToPercent(event.clientX);
      event.stopPropagation();
      event.preventDefault();
    }
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    captureRef.current = false;

    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <div className={styles.controls}>
      <div
        ref={ref}
        className={styles.progressBar}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <div className={styles.progress} style={{ width: `${value.toString()}%` }} />
      </div>
    </div>
  );
};

export default Controls;
