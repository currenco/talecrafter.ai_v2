import LegalPage from "@/components/legal/LegalPage";
import { termsAndConditions } from "@/lib/legal/policies";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({ ...termsAndConditions, index: false });

export default function TermsAndConditionsPage() {
  return <LegalPage document={termsAndConditions} />;
}
