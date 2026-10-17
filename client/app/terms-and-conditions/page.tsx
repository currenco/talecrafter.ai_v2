import LegalPage from "@/components/legal/LegalPage";
import { termsAndConditions } from "@/lib/legal/policies";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata(termsAndConditions.path);

export default function TermsAndConditionsPage() {
  return <LegalPage document={termsAndConditions} />;
}
