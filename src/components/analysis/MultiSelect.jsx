import React, { useMemo, useState } from 'react';

export default function MultiSelect({ label, options, value, onChange, emptyText = 'No options available', expandable, expanding, onExpand }) {
  const [query, setQuery] = useState('');
  const uniqueOptions = useMemo(() => [...new Set(options)], [options]);
  const selected = useMemo(() => new Set(value), [value]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? uniqueOptions.filter((option) => String(option).toLowerCase().includes(normalized)) : uniqueOptions;
  }, [query, uniqueOptions]);

  const toggle = (option) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option); else next.add(option);
    onChange(uniqueOptions.filter((item) => next.has(item)));
  };

  const allVisibleSelected = visible.length > 0 && visible.every((option) => selected.has(option));

  return (
    <div className="analysis-multi-select">
      <div className="analysis-field-heading">
        <strong>{label}</strong>
        <span>{selected.size}/{uniqueOptions.length}</span>
      </div>
      <div className="analysis-multi-actions">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label}`} aria-label={`Search ${label}`} />
        <button type="button" onClick={() => {
          if (allVisibleSelected) onChange(value.filter((item) => !visible.includes(item)));
          else onChange(uniqueOptions.filter((item) => selected.has(item) || visible.includes(item)));
        }} disabled={visible.length === 0}>{allVisibleSelected ? 'Clear visible' : 'Select visible'}</button>
      </div>
      <div className="analysis-option-list">
        {visible.length === 0 && <span className="analysis-empty-option">{emptyText}</span>}
        {visible.map((option) => (
          <label key={option} title={option}>
            <input type="checkbox" checked={selected.has(option)} onChange={() => toggle(option)} />
            <span>{option}</span>
            {expandable?.has(option) && (
              <button type="button" className="analysis-expand-btn" disabled={Boolean(expanding)} onClick={(event) => { event.preventDefault(); onExpand(option); }}>
                {expanding === option ? 'Loading…' : 'Load sub-iterations'}
              </button>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
