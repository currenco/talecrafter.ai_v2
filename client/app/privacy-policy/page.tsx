import LegalPage from "@/components/legal/LegalPage";
import { privacyPolicy } from "@/lib/legal/policies";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({ ...privacyPolicy, index: false });

export default function PrivacyPolicyPage() {
  return <LegalPage document={privacyPolicy} />;
}
