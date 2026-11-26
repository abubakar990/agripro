import { useId } from 'react';
import { UNITS, lineTotal } from '../../utils/quantity';

/**
 * Item / Quantity / Unit / Rate inputs. Typing a quantity and rate fills in
 * `amount` automatically; the amount can still be edited afterwards
 * (e.g. to add transport or round off).
 */
const QuantityRateFields = ({ formData, setFormData, suggestions = [], itemPlaceholder = 'e.g. Urea, DAP' }) => {
  const id = useId();

  const update = (name, value) => {
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'quantity' || name === 'unit_price') {
        const total = lineTotal(next.quantity, next.unit_price);
        if (total !== null) next.amount = String(total);
      }
      return next;
    });
  };

  const onChange = (e) => update(e.target.name, e.target.value);

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-text-muted uppercase">Item / Product</label>
        <input
          type="text"
          name="item_name"
          list={`${id}-items`}
          value={formData.item_name || ''}
          onChange={onChange}
          placeholder={itemPlaceholder}
          className="agri-input"
        />
        <datalist id={`${id}-items`}>
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-text-muted uppercase">Quantity</label>
          <input
            type="number"
            name="quantity"
            step="any"
            min="0"
            value={formData.quantity || ''}
            onChange={onChange}
            placeholder="0"
            className="agri-input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-text-muted uppercase">Unit</label>
          <input
            type="text"
            name="unit"
            list={`${id}-units`}
            value={formData.unit || ''}
            onChange={onChange}
            placeholder="bag, kg, maund"
            className="agri-input"
          />
          <datalist id={`${id}-units`}>
            {UNITS.map(u => <option key={u} value={u} />)}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-text-muted uppercase">Rate / Unit (PKR)</label>
          <input
            type="number"
            name="unit_price"
            step="any"
            min="0"
            value={formData.unit_price || ''}
            onChange={onChange}
            placeholder="0.00"
            className="agri-input"
          />
        </div>
      </div>
      <p className="text-[11px] text-text-muted">
        Optional. Amount is calculated as quantity × rate, and you can still change it.
      </p>
    </div>
  );
};

export default QuantityRateFields;
