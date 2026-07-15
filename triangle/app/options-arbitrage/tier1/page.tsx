import TierComingSoon from "../TierComingSoon";
import { OPTIONS_TIERS } from "../tiers";

export default function Tier1Page() {
  return <TierComingSoon tier={OPTIONS_TIERS[0]} />;
}
