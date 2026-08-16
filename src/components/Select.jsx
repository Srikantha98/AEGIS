function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default Select;
