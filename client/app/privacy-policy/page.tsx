import LegalPage from "@/components/legal/LegalPage";
import { privacyPolicy } from "@/lib/legal/policies";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata(privacyPolicy.path);

export default function PrivacyPolicyPage() {
  return <LegalPage document={privacyPolicy} />;
}
