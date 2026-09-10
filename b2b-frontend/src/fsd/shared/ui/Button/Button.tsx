import { createElement, ReactNode } from 'react';

type TButtonProps = {
  active?: boolean;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
  element?: 'a' | 'button';
  href?: string;
  target?: '_blank';
  type?: 'submit' | 'reset' | 'button';
  onClick?: (e: MouseEvent) => void | Promise<void | boolean>;
  preset?:
    | 'primarySolid'
    | 'primarySolidDisabled'
    | 'secondarySolid'
    | 'secondarySolidDisabled'
    | 'thirdlySolid'
    | 'thirdlySolidDisabled';
};

export const presetsButton: Record<string, Partial<TButtonProps>> = {};

export default function Button(props: TButtonProps) {
  const preset = (props.preset ? presetsButton[props.preset] : null) || {};

  return createElement(
    props.element || preset.element || 'button',
    {
      className:
        'uix-component-button-button' +
        (props.active || preset.active ? ' uix--active' : '') +
        (props.disabled || preset.disabled ? ' uix--disabled' : '') +
        (preset.className ? ' ' + preset.className : '') +
        (props.className ? ' ' + props.className : ''),
      href: props.href || preset.href || undefined,
      disabled: props.disabled || preset.disabled,
      target: props.target || preset.target,
      onClick: props.onClick || preset.onClick
    },
    props.children || preset.children
  );
}
