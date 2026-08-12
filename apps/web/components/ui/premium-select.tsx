'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PremiumSelectOption = {
  label: string;
  value: string;
};

type PremiumSelectProps = {
  ariaLabel?: string;
  className?: string;
  defaultValue?: string;
  label?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: PremiumSelectOption[];
  value?: string;
};

export function PremiumSelect({
  ariaLabel,
  className = '',
  defaultValue,
  label,
  name,
  onValueChange,
  options,
  value,
}: PremiumSelectProps) {
  const fallbackValue = options[0]?.value ?? '';
  const [internalValue, setInternalValue] = useState(defaultValue ?? fallbackValue);
  const currentValue = value ?? internalValue;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === currentValue),
  );
  const selected = options[selectedIndex] ?? { label: '', value: '' };
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const generatedId = useId().replaceAll(':', '');
  const labelId = `premium-select-label-${generatedId}`;
  const valueId = `premium-select-value-${generatedId}`;
  const listId = `premium-select-list-${generatedId}`;

  const labelledBy = useMemo(
    () => (label ? `${labelId} ${valueId}` : undefined),
    [label, labelId, valueId],
  );

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ left: rect.left, top: rect.bottom + 8, width: rect.width });
    }

    function closeOnOutsidePress(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    updatePosition();
    const focusFrame = requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, selectedIndex]);

  function choose(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function moveOptionFocus(index: number) {
    const normalized = (index + options.length) % options.length;
    optionRefs.current[normalized]?.focus();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveOptionFocus(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveOptionFocus(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveOptionFocus(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveOptionFocus(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(options[index]?.value ?? currentValue);
    }
  }

  const listbox = open && (
    <div
      aria-labelledby={label ? labelId : undefined}
      aria-label={label ? undefined : ariaLabel}
      className="premium-select-list"
      id={listId}
      ref={listRef}
      role="listbox"
      style={position}
    >
      {options.map((option, index) => (
        <button
          aria-selected={option.value === currentValue}
          className="premium-select-option"
          key={option.value}
          onClick={() => choose(option.value)}
          onKeyDown={(event) => handleOptionKeyDown(event, index)}
          ref={(node) => {
            optionRefs.current[index] = node;
          }}
          role="option"
          tabIndex={index === selectedIndex ? 0 : -1}
          type="button"
        >
          <span>{option.label}</span>
          <span aria-hidden="true">{option.value === currentValue ? '✓' : ''}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`premium-select ${className}`.trim()} ref={rootRef}>
      {label && (
        <span className="premium-select-label" id={labelId}>
          {label}
        </span>
      )}
      {name && <input name={name} type="hidden" value={currentValue} />}
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={labelledBy}
        className="premium-select-trigger"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span id={valueId}>{selected.label}</span>
        <span aria-hidden="true" className="premium-select-chevron" />
      </button>
      {listbox && typeof document !== 'undefined' ? createPortal(listbox, document.body) : null}
    </div>
  );
}
