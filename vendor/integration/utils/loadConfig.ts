import fs from 'node:fs';
// js-yaml v5 ships named exports only (no default).
import * as yaml from 'js-yaml';

const loadConfig = async (configPathOrData: string | object) => {
  if (typeof configPathOrData === 'string') {
    const content = fs.readFileSync(configPathOrData, 'utf8');
    if (configPathOrData.endsWith('.yaml') || configPathOrData.endsWith('.yml')) {
      return yaml.load(content);
    }
    return content;
  }

  return configPathOrData;
};

export default loadConfig;
