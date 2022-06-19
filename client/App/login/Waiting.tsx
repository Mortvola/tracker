import React from 'react';
import { Spinner } from 'react-bootstrap';

type PropsType = {
  show: boolean,
};

const Waiting: React.FC<PropsType> = ({
  show,
}) => (
  show
    ? (
      <div className="wait-background">
        <Spinner
          animation="border"
          className="abs-centered"
          variant="light"
        />
      </div>
    )
    : null
);

export default Waiting;
