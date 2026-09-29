import React from 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends React.AriaAttributes, React.DOMAttributes<T> {
    children?: React.ReactNode;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      children?: React.ReactNode;
      className?: string;
      id?: string;
      variant?: string;
      size?: string;
      asChild?: boolean;
      placeholder?: string;
      disabled?: boolean;
      onClick?: (...args: any[]) => void;
      onChange?: (...args: any[]) => void;
      value?: string | number | readonly string[];
      type?: string;
      min?: string | number;
      max?: string | number;
      step?: string | number;
      autoComplete?: string;
      required?: boolean;
      rows?: number;
      name?: string;
      htmlFor?: string;
      title?: string;
      description?: string;
      icon?: any;
      maxWidth?: string;
      actions?: any;
      action?: any;
      subtitle?: string;
      defaultOpen?: boolean;
      deep?: boolean;
      badge?: any;
    }
  }
}
