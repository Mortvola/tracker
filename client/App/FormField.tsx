import { ErrorMessage } from '@hookform/error-message';
import React, { JSXElementConstructor, ReactElement } from 'react';
import {
  Validate,
  useFormContext,
} from 'react-hook-form';

export type FieldProps = {
  className?: string,
  style?: React.CSSProperties,
  readOnly?: boolean,
  autoComplete?: string,
  name?: string,
  onChange?: React.ChangeEventHandler,
  onBlur?: React.ChangeEventHandler,
  children?: React.ReactNode,
}

type FormErrorPropsType = {
  name: string,
  style?: React.CSSProperties,
}

export const FormError: React.FC<FormErrorPropsType> = ({ name, style }) => (
  <ErrorMessage
    name={name}
    render={({ message }) => (
      <span className="text-danger" role="alert" style={style}>
        {message}
      </span>
    )}
  />
);

type FormFieldPropsType<V, P> = {
  name: keyof V,
  label: string,
  as?: JSXElementConstructor<P>,
  type?: string,
  validate?: Validate<string>,
  deps?: string[],
} & FieldProps

// eslint-disable-next-line react/function-component-definition
export function FormField<V = unknown>({
  validate,
  deps,
  as,
  label,
  ...props
}: FormFieldPropsType<V, FieldProps>): ReactElement {
  // const [field, meta] = useField<V>(name)
  // const form = useFormikContext<T>();

  // const handleChange = (event: React.ChangeEvent<E>) => {
  //   field.onChange(event);
  //   if (onChange) {
  //     onChange(event, { field, form, meta });
  //   }
  // }

  // const handleBlur = (event: React.ChangeEvent<E>) => {
  //   field.onBlur(event);
  //   if (onBlur) {
  //     onBlur(event, { field, form, meta });
  //   }
  // }

  const { register } = useFormContext();

  const registerProps = register(props.name, { validate, deps });

  const Element = as;

  const { style, ...remainingProps } = props;

  if (!Element) {
    return (
      <label style={{ userSelect: 'none', marginTop: '0.5rem', ...style }}>
        {label}
        <input
          type={props.type ?? 'text'}
          {...remainingProps}
          className="form-control"
          {...registerProps}
        />
        <FormError name={registerProps.name} />
      </label>
    );
  }

  return (
    <label style={{ userSelect: 'none', marginTop: '0.5rem', ...style }}>
      {label}
      <Element
        {...props}
        className="form-control"
        {...registerProps}
      >
        {props.children}
      </Element>
      <FormError name={registerProps.name} />
    </label>
  );
}
