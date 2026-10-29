export type LegalDocument = {
  title: string;
  path: string;
  description: string;
  sections: { id: string; title: string; paragraphs: string[]; links?: { label: string; href: string }[] }[];
};

export const legalContactEmail = "contact@talecrafterai.com";
export const legalEffectiveDate = "2026-10-17";
const contactLink = { label: legalContactEmail, href: `mailto:${legalContactEmail}` };

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  path: "/privacy-policy",
  description: "How TaleCrafter AI handles account information, story content, AI requests, payments, and analytics.",
  sections: [
    { id: "about", title: "About this policy", paragraphs: [
      "This Privacy Policy explains how TaleCrafter AI ('we', 'us', and 'our') handles information when you visit talecrafterai.com, create an account, generate stories, or purchase a subscription.",
      "For privacy questions, personal-data requests, or complaints, contact us using the email address below.",
    ], links: [contactLink] },
    { id: "information", title: "Information the service handles", paragraphs: [
      "Account information includes your authentication identifier, email address, display name, profile image when available, linked sign-in providers, and account role. When you choose social sign-in, we receive the information needed to authenticate you and maintain your account, not your social account password.",
      "Creative information includes the prompts and images you submit, generated text and illustrations, characters, scene prompts, branching choices, drafts, and published stories. Requests and generation results may be stored so you can return to your work and recover interrupted generation.",
      "If you connect an image-generation account, we store connection details, permissions, expiry information, and an encrypted access token. We may retrieve account and balance information to check generation availability. Disconnecting disables use of the connection in TaleCrafter; it does not delete your external account.",
      "Subscription information includes payment and subscription identifiers, plan, currency, amount, payment status, billing periods, cancellation status, and payment confirmation records. Payment details entered at checkout are handled by our payment processor and its payment partners; TaleCrafter's application does not collect your full card number or CVV.",
      "Technical information can include IP addresses, browser and device details, visited pages, request identifiers, error messages, and service logs. Hosting and analytics providers may collect this information when your browser or device connects to them.",
    ] },
    { id: "purposes", title: "Why information is used", paragraphs: [
      "Information is used to sign you in, link accounts, generate and store stories, display your library, publish and share stories, provide paid features, verify payments, manage subscription renewal, diagnose failures, protect the service, and understand site usage.",
      "We use account, creative, and subscription information to provide the service you request. Security and diagnostic information supports our legitimate interests in protecting and operating the service, where that legal basis applies. We also process records to meet legal obligations and rely on consent where applicable law requires it. This policy does not treat continued browsing as consent to optional tracking.",
      "To deliver these functions, information is processed by providers of authentication, hosting, storage, AI generation, payments, and analytics. AI requests can include your prompts, submitted images, and generated results. Provider processing may include safety review and, depending on the service configuration, model improvement. Do not submit confidential material. Information may also be disclosed when legally required or necessary to investigate abuse, protect rights, or respond to a security incident.",
    ] },
    { id: "public-content", title: "Published stories and media are public", paragraphs: [
      "Completed published stories can be read without signing in through a direct link. They may appear in Explore, related-story recommendations, search-engine results, and shared links. Their titles, text, cover art, illustrations, and displayed creator information may therefore be public.",
      "Drafts are not listed as published stories, but do not treat the service as confidential storage. Uploaded or generated media can use public delivery URLs. Anyone who obtains such a URL may be able to access the media. Browser restrictions do not prevent screenshots or saving content that has been delivered to a device.",
      "Do not submit secrets, payment details, sensitive personal information, or private information about other people. Removing a story from TaleCrafter cannot immediately remove copies held by search engines, recipients, or other third parties.",
    ] },
    { id: "cookies", title: "Cookies and analytics", paragraphs: [
      "The app uses authentication cookies and browser storage to keep sessions working and support application features. Disabling necessary storage may prevent sign-in or other functions from working.",
      "We use Google Analytics to understand visits, page activity, and device information. It can use cookies or similar identifiers and sends usage information to Google. Analytics currently loads automatically after the page becomes interactive; the app does not yet provide an analytics preference control.",
      "You can manage cookies through your browser and review Google's controls using the links below. Browser controls may affect site functionality and do not replace any consent required by applicable law.",
    ], links: [
      { label: "How Google uses cookies", href: "https://policies.google.com/technologies/cookies" },
      { label: "Google's use of information from partner sites", href: "https://policies.google.com/technologies/partner-sites" },
    ] },
    { id: "retention", title: "Storage, retention, and international processing", paragraphs: [
      "We retain account and story records to maintain your account and library. Retention also depends on the type of information, the purpose for which it is used, legal recordkeeping requirements, security needs, and unresolved disputes. Financial records may be retained separately; cancelling a subscription does not automatically erase payment history.",
      "You may request deletion by contacting us. Some information may need to be retained to meet legal obligations or protect legitimate rights. Backup copies and independently cached public content may not be removed immediately. We do not promise immediate removal from third-party systems outside our control.",
      "Information may be processed outside your country of residence because the service uses international infrastructure. Data-protection laws can differ between countries. Contact us for questions about processing locations and applicable transfer arrangements.",
    ] },
    { id: "choices", title: "Your choices and privacy requests", paragraphs: [
      "You can use available story deletion controls in your library, disconnect your image-generation account, and cancel Creator renewal from Plans. Cancelling a subscription, disconnecting an external account, and deleting account data are different actions.",
      "Depending on applicable law, you may have rights to access, correct, delete, or obtain a copy of personal information, object to or restrict certain processing, withdraw consent, or raise a complaint. Some requests require identity verification or are subject to lawful retention exceptions.",
      "Send privacy requests to the email address below using the email associated with your account where possible. Describe the request without sending passwords, API keys, or payment-card details. We may ask for information reasonably needed to verify your identity and will handle requests in accordance with applicable law. You may also complain to the relevant data-protection authority where that right applies.",
    ], links: [contactLink] },
    { id: "security", title: "Security and younger users", paragraphs: [
      "The app uses access checks and encrypts stored image-generation access tokens. These measures do not make public content private and do not guarantee that every security incident can be prevented.",
      "Accounts and generation features are intended for adults aged 18 or older. Story genres and age-group settings describe generated content, not the account holder's age. Do not submit personal information about children. Contact us if you believe a child has provided personal information so we can investigate and take appropriate action.",
    ] },
    { id: "changes", title: "Policy updates", paragraphs: [
      "We may update this policy as the service or applicable requirements change. The effective date appears at the top of this page. We will provide additional notice of material changes and seek consent where required by applicable law. Questions about this policy can be sent to our contact address.",
    ] },
  ],
};

export const termsAndConditions: LegalDocument = {
  title: "Terms & Conditions",
  path: "/terms-and-conditions",
  description: "TaleCrafter AI terms covering accounts, generated content, subscriptions, cancellation, and acceptable use.",
  sections: [
    { id: "service", title: "About these terms", paragraphs: [
      "These Terms & Conditions govern your use of TaleCrafter AI ('we', 'us', and 'our'), an illustrated-story creation service at talecrafterai.com. Features include Classic stories, branching Plot Twist stories, story libraries, character and scene material, and PDF exports where your plan allows them.",
      "By creating an account, subscribing, or using generation features, you agree to these terms. If you do not agree, do not use those features. The Privacy Policy explains how information is handled.",
    ] },
    { id: "accounts", title: "Eligibility and accounts", paragraphs: [
      "You must be at least 18 years old and able to enter a binding agreement to create an account or use generation features. Content age-group settings describe a story's intended audience; they do not establish eligibility to use the service.",
      "Keep your account and connected credentials secure, provide accurate information, and use only accounts and images you are authorized to use. You are responsible for activity you authorize through your account. Do not share passwords, payment details, or API keys in public stories or support messages.",
    ] },
    { id: "plans", title: "Free trial and Creator access", paragraphs: [
      "Both plans offer Google and GitHub sign-in. Free trial creation supports Classic stories and uses your own connected Pollinations key and available provider balance. The label Free trial does not promise free Pollinations credits, a fixed number of days, or an automatic paid upgrade.",
      "Creator requires active paid access and includes Classic and Plot Twist generation, platform-funded illustrations, character and scene material, and PDF export. Creator does not require a personal Pollinations key for creation.",
      "Neither plan has per-user monthly project or image quotas. This is not a promise of unlimited or uninterrupted output: generation depends on provider restrictions, availability, and, for Creator images, shared platform capacity. Complete short-film generation is not included in the current subscription.",
    ] },
    { id: "billing", title: "Subscriptions, renewal, and delivery", paragraphs: [
      "The price, currency, and recurring billing interval are shown on Plans and at checkout. Creator renews automatically each month until cancelled, subject to successful payment and the payment mandate. Our payment processor handles payment authorization and recurring collection. Your bank or payment provider may apply its own conversion or other charges.",
      "Creator access starts when a qualifying payment is verified, not merely when a checkout modal closes or a mandate is authorized. Confirmation can be delayed. Review or refresh the subscription status before trying another payment.",
      "This is a digitally delivered service, not a shipment of physical goods. Generation time varies. Review output before relying on it and check saved drafts before restarting interrupted work. The service does not guarantee a particular number of completed stories or a specific generation time.",
    ] },
    { id: "cancellation", title: "Cancellation and refunds", paragraphs: [
      "Use Cancel automatic renewal on Plans before the next billing date and check the confirmation. For an active paid period, cancelling renewal normally preserves Creator access until that period ends. Signing out, removing a story, or disconnecting Pollinations does not cancel a subscription.",
      "Cancellation does not itself trigger a refund. For a refund request, duplicate charge, or payment problem, email our contact address with your account email and payment reference. Do not send card details or passwords. Requests are reviewed based on the circumstances and applicable law; submitting a request does not guarantee approval. Your statutory cancellation and refund rights are not waived.",
      "Failed renewals, expiry, refunds, or disputes can change paid access. Existing stories are not automatically deleted solely because a subscription ends. Free trial creation requirements apply when you no longer have active Creator access.",
    ] },
    { id: "content", title: "Your inputs and generated content", paragraphs: [
      "You retain any rights you already hold in your inputs. You must have the rights and permissions needed to upload and process them, including any relevant likeness, privacy, and intellectual-property permissions.",
      "For the service to work, you authorize TaleCrafter and its providers to process, store, reproduce, and deliver submitted and generated content as needed to provide requested features. Published stories are displayed publicly, can be shared, and may be indexed by search engines. Do not use the service for confidential material.",
      "AI output may be inaccurate, inappropriate, similar to another person's output, or subject to third-party rights. No guarantee is made of originality, exclusivity, copyright protection, commercial clearance, or suitability for a particular purpose. Check the output and applicable model/provider terms before publishing or using it commercially.",
      "Access to somebody else's public story is not a transfer of their rights or permission to resell it. PDF export is a product feature, not a guarantee of exclusive rights. Restrictions on right-click or download cannot prevent screenshots or other copying of publicly delivered media.",
    ] },
    { id: "acceptable-use", title: "Acceptable use", paragraphs: [
      "Do not use the service for unlawful activity, exploitation or sexual abuse of children, threats, harassment, fraud, non-consensual intimate material, privacy violations, or infringement of another person's rights. Do not upload malicious files or attempt to steal credentials or access another user's private records.",
      "Do not bypass authentication, paid feature checks, provider safeguards, or the platform's protective controls. Automated abuse, deliberate resource exhaustion, and unauthorized resale of access are not permitted. You must also follow applicable AI-provider rules.",
    ] },
    { id: "availability", title: "Availability, changes, and suspension", paragraphs: [
      "The service depends on external authentication, hosting, AI, media, and payment services. Outages, exhausted provider balance, revoked keys, model changes, maintenance, or shared capacity can interrupt features. Keep copies of content you need using available export features.",
      "Access or content may be restricted where necessary to address abuse, security risks, legal requirements, or violations of these terms. Material changes to paid features or subscription terms should be communicated before they take effect, with any remedies required by law.",
    ] },
    { id: "responsibility", title: "Responsibility and consumer rights", paragraphs: [
      "Generated stories are creative outputs, not professional medical, legal, financial, or other expert advice. Review content before relying on it, sharing it, or presenting it to another audience.",
      "To the extent permitted by law, no guarantee is made that AI output will be error-free or that every service request will succeed. Nothing in these terms excludes rights, warranties, remedies, or liability that cannot lawfully be excluded.",
    ] },
    { id: "privacy", title: "Privacy", paragraphs: [
      "The Privacy Policy describes account data, public stories, processing of generation requests, analytics, and payment records. Reading or accepting these terms is not a substitute for any separate consent required for optional tracking or another activity.",
    ], links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
    ] },
    { id: "contact", title: "Contact and updates", paragraphs: [
      "For support, subscription questions, complaints, or questions about these terms, contact us at the email address below. Include enough information to identify the issue, but never send passwords, API keys, or full payment-card details.",
      "We may update these terms as the service changes. We will provide appropriate notice of material changes affecting paid access and obtain agreement where required. No update removes mandatory consumer protections or remedies that apply to you.",
    ], links: [contactLink] },
  ],
};
