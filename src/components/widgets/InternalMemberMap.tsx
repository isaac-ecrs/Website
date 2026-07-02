import { useState } from 'react';
import MemberLocationsUploader from './MemberLocationsUploader';
import MemberHeatmap from './MemberHeatmap';
import SiteEvaluator from './SiteEvaluator';
import type { ParseResult, MemberCity } from './memberLocationsParser';
import type { ActiveSite } from './SiteEvaluator';

interface KnownSite {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  committedCities: MemberCity[];
  committedAt: string;
  knownSites: KnownSite[];
}

export default function InternalMemberMap({ committedCities, committedAt, knownSites }: Props) {
  const [cities, setCities] = useState<MemberCity[]>(committedCities);
  const [sourceLabel, setSourceLabel] = useState<string>(
    `committed data · ${new Date(committedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  );
  const [showUploader, setShowUploader] = useState(false);
  const [activeSite, setActiveSite] = useState<ActiveSite | null>(null);

  function handleResult(result: ParseResult) {
    setCities(result.cities);
    setSourceLabel(`uploaded · ${result.stats.uniqueEmails} attendees · ${result.cities.length} locations`);
  }

  return (
    <div className="space-y-12">
      {/* Map section */}
      <div className="space-y-6">
        {/* Source bar */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{sourceLabel}</span>
          <button
            type="button"
            onClick={() => setShowUploader((v) => !v)}
            className="text-primary hover:underline text-xs font-medium"
          >
            {showUploader ? 'Hide uploader' : 'Upload new data'}
          </button>
        </div>

        {showUploader && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-muted mb-3">
              Upload Cognito Forms event exports (.xlsx) and/or a Mailchimp subscriber export (.csv). Upload multiple
              files — emails are deduped across all, with event data winning over Mailchimp addresses.
            </p>
            <MemberLocationsUploader onResult={handleResult} />
          </div>
        )}

        <MemberHeatmap cities={cities} activeSite={activeSite} />
      </div>

      {/* Site evaluator section */}
      <div>
        <h2 className="text-2xl font-bold text-default mb-2">Site Evaluation</h2>
        <p className="text-muted text-sm mb-6">
          How far are attendees from a given venue? Pick an existing ECRS site or enter a proposed address.
        </p>
        <SiteEvaluator cities={cities} knownSites={knownSites} onSiteChange={setActiveSite} />
      </div>
    </div>
  );
}
