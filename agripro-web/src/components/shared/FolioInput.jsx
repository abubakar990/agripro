import { useId } from 'react';
import { useKhatas } from '../../hooks/queries';

/**
 * Folio (صفحہ) number of the khata this entry is posted to, as written in the Roznamcha.
 * Suggests khatas from the register; the selected khata's name is shown underneath.
 */
const FolioInput = ({ value, onChange, className = '' }) => {
  const id = useId();
  const orgId = localStorage.getItem('agripro_current_org_id');
  const { data: khatas = [] } = useKhatas(orgId);
  const match = khatas.find(k => String(k.folio) === String(value));

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-bold text-text-muted uppercase">
        Folio / <span dir="rtl" lang="ur">صفحہ</span>
      </label>
      <input
        type="number"
        min="1"
        list={`${id}-khatas`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Khata page no."
        className="agri-input"
      />
      <datalist id={`${id}-khatas`}>
        {khatas.map(k => (
          <option key={k.folio} value={k.folio}>{k.name}{k.name_ur ? ` / ${k.name_ur}` : ''}</option>
        ))}
      </datalist>
      <span className="text-[11px] text-text-muted min-h-[1em]">
        {value ? (match ? `${match.name}${match.name_ur ? ` / ${match.name_ur}` : ''}` : 'Not in khata register yet') : ''}
      </span>
    </div>
  );
};

export default FolioInput;
