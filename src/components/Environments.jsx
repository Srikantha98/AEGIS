import { useEffect, useState } from 'react';
import {
  jurisdictions,
} from '../config/jurisdictionEnvironments';
import { environmentService } from '../services/EnvironmentService';

const EnvironmentSetup = () => {
  const [jurisdiction, setJurisdiction] = useState('');
  const [environment, setEnvironment] = useState('');
  const [environmentOptions, setEnvironmentOptions] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    const loadOptions = async () => {
      try {
        const options = await environmentService.listEnvironmentOptions();
        if (isCurrent) setEnvironmentOptions(options);
      } catch (error) {
        if (isCurrent) setLoadError(error.message || 'Unable to load environment options.');
      }
    };
    void loadOptions();
    return () => { isCurrent = false; };
  }, []);

  const availableJurisdictions = Array.from(new Set([
    ...jurisdictions,
    ...environmentOptions.map((option) => option.jurisdiction),
  ]));
  const environments = environmentOptions.filter(
    (option) => option.jurisdiction === jurisdiction
  );

  const handleJurisdictionChange = (event) => {
    setJurisdiction(event.target.value);
    setEnvironment('');
  };

  return (
    <section className="environment-setup" aria-label="Environment selection">
      <label className="field environment-field">
        <span>Jurisdiction</span>
        <select id="jurisdiction" value={jurisdiction} onChange={handleJurisdictionChange}>
          <option value="">Select Jurisdiction</option>
          {availableJurisdictions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="field environment-field">
        <span>Environment</span>
        <select id="environment" value={environment} onChange={(event) => setEnvironment(event.target.value)} disabled={!jurisdiction}>
          <option value="">Select Environment</option>
          {environments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
      </label>
      {loadError && <p className="form-error environment-load-error" role="alert">{loadError}</p>}
    </section>
  );
};

export default EnvironmentSetup;
