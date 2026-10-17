export type LegalDocument = {
  title: string;
  path: string;
  description: string;
  sections: { id: string; title: string; paragraphs: string[]; links?: { label: string; href: string }[] }[];
};

export const legalDraftNotice = "Draft for review. These documents are not yet finalized or in effect. The operator's legal name, contact details, and remaining policy decisions must be confirmed before publication as final policies.";
export const legalReviewDate = "2026-10-17";

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  path: "/privacy-policy",
  description: "How TaleCrafter AI handles account information, story content, AI requests, payments, and analytics.",
  sections: [
    { id: "operator", title: "Who operates TaleCrafter AI", paragraphs: [
      "TaleCrafter AI is a product operated by an individual based in India, not by an incorporated company. This draft describes information handling on talecrafterai.com and its connected application services.",
      "The operator's legal identity and a working privacy contact will be added before this policy is finalized. No contact address has been published in this draft.",
    ] },
    { id: "information", title: "Information the service handles", paragraphs: [
      "Account information includes your authentication identifier, email address, display name, profile image when available, linked sign-in providers, and account role. Authentication is handled through Neon Auth, including Google or GitHub when you use those options. We do not ask for your Google or GitHub password.",
      "Creative information includes the prompts and images you submit, generated text and illustrations, characters, scene prompts, branching choices, drafts, and published stories. Requests and generation results may be stored so you can return to your work and recover interrupted generation.",
      "If you connect Pollinations, the service stores connection details, permissions, expiry information, and an encrypted access token. It may retrieve account and balance information to check generation availability. Disconnecting disables use of the connection in TaleCrafter; it does not delete your Pollinations account.",
      "Subscription information includes payment and subscription identifiers, plan, currency, amount, payment status, billing periods, cancellation status, and relevant webhook records. Payment details entered in Razorpay Checkout are handled by Razorpay and its payment partners; TaleCrafter's application does not collect your full card number or CVV.",
      "Technical information can include IP addresses, browser and device details, visited pages, request identifiers, error messages, and service logs. Hosting and analytics providers may collect this information when your browser or device connects to them.",
    ] },
    { id: "purposes", title: "Why information is used", paragraphs: [
      "Information is used to sign you in, link accounts, generate and store stories, display your library, publish and share stories, provide paid features, verify payments, manage subscription renewal, diagnose failures, protect the service, and understand site usage.",
      "Where applicable, processing grounds may include providing the service you request, consent for optional processing, legitimate interests in security and service operation, and legal obligations such as maintaining financial records. The final policy must reflect the operator's confirmed practices and the laws applicable to the people served.",
    ] },
    { id: "public-content", title: "Published stories and media are public", paragraphs: [
      "Completed published stories can be read without signing in through a direct link. They may appear in Explore, related-story recommendations, search-engine results, and shared links. Their titles, text, cover art, illustrations, and displayed creator information may therefore be public.",
      "Drafts are not listed as published stories, but do not treat the service as confidential storage. Uploaded or generated media can use public delivery URLs. Anyone who obtains such a URL may be able to access the media. Browser restrictions do not prevent screenshots or saving content that has been delivered to a device.",
      "Do not submit secrets, payment details, sensitive personal information, or private information about other people. Removing a story from TaleCrafter cannot immediately remove copies held by search engines, recipients, or other third parties.",
    ] },
    { id: "providers", title: "Service providers and AI processing", paragraphs: [
      "Neon provides authentication and database services. Cloudinary stores and delivers media. Vercel and Render host application services. Google and GitHub process sign-in information when selected. These services receive information needed for their roles.",
      "Google Gemini processes generation requests, which can include your text prompts and submitted images. Pollinations processes illustration requests and associated credentials or reference material. Using your own Pollinations key does not prevent those requests from leaving TaleCrafter.",
      "AI providers have their own retention, safety-review, and data-use terms. Gemini's treatment of inputs and outputs can differ between paid and unpaid services. TaleCrafter does not promise that every provider request is excluded from training or human review; do not submit confidential material.",
      "Razorpay processes checkout and recurring payments. Google Analytics measures site usage. Information may also be disclosed when legally required or necessary to investigate abuse, protect rights, or respond to a security incident.",
    ], links: [
      { label: "Google Gemini API terms", href: "https://ai.google.dev/gemini-api/terms" },
      { label: "Pollinations privacy policy", href: "https://enter.pollinations.ai/privacy" },
      { label: "Razorpay privacy policy", href: "https://razorpay.com/privacy-policy/" },
    ] },
    { id: "cookies", title: "Cookies and analytics", paragraphs: [
      "The app uses authentication cookies and browser storage to keep sessions working and support application features. Disabling necessary storage may prevent sign-in or other functions from working.",
      "Google Analytics is currently configured to load after the page becomes interactive. It can use cookies or similar identifiers to measure visits, page activity, and device information. There is not yet an in-app analytics consent or preference control. This draft does not represent continued browsing as consent to optional analytics.",
      "You can manage cookies through your browser and review Google's analytics controls. These are not a substitute for consent controls that the operator may need to implement for the locations served.",
    ], links: [
      { label: "How Google uses cookies", href: "https://policies.google.com/technologies/cookies" },
      { label: "Google's use of information from partner sites", href: "https://policies.google.com/technologies/partner-sites" },
    ] },
    { id: "retention", title: "Storage, retention, and international processing", paragraphs: [
      "Account and story records are stored to provide the service. Financial, security, and operational records may need to be retained separately for legal obligations, resolving disputes, and preventing abuse. This draft does not promise a fixed deletion deadline or immediate removal from backups.",
      "A category-specific retention schedule and deletion process must be finalized before this policy is released. Historical payment records are not automatically erased when a subscription is cancelled.",
      "Because the service uses international infrastructure and AI providers, information may be processed outside India or your country of residence. Provider locations and any required transfer protections must be reviewed for the regions in which the service is offered.",
    ] },
    { id: "choices", title: "Your choices and privacy requests", paragraphs: [
      "You can manage available story deletion controls in your library, disconnect a Pollinations connection, and cancel Creator renewal from Plans. Cancelling a subscription, disconnecting an AI provider, and deleting account data are different actions.",
      "Depending on applicable law, you may have rights to access, correct, delete, or obtain a copy of personal information, object to or restrict certain processing, withdraw consent, or raise a complaint. Some requests require identity verification or are subject to lawful retention exceptions.",
      "A working contact and request-handling process for these rights is still required before this policy can be finalized. This draft does not claim that a self-service account-deletion or personal-data export workflow already exists.",
    ] },
    { id: "security", title: "Security and younger users", paragraphs: [
      "The app uses access checks and encrypts stored Pollinations access tokens. These measures do not make public content private and do not guarantee that every security incident can be prevented.",
      "Story genres and age-group settings describe generated content; they are not verification of a user's age. The service's eligibility policy and any age controls must be reviewed against its AI providers' requirements before final release. Do not submit personal information about children.",
    ] },
    { id: "changes", title: "Policy updates", paragraphs: [
      "The final policy will include an effective date, the operator's identity, and a working contact. Material changes should be communicated appropriately, and consent obtained where required. This draft is not a substitute for an implemented privacy program or legal review.",
    ] },
  ],
};

export const termsAndConditions: LegalDocument = {
  title: "Terms & Conditions",
  path: "/terms-and-conditions",
  description: "TaleCrafter AI terms covering accounts, generated content, subscriptions, cancellation, and acceptable use.",
  sections: [
    { id: "service", title: "The service and its operator", paragraphs: [
      "TaleCrafter AI is an illustrated-story creation service operated by an individual based in India. It supports Classic stories, branching Plot Twist stories, story libraries, character and scene material, and PDF exports where your plan allows them.",
      "These are draft terms for review, not an effective agreement. The operator's legal name, contact details, and effective date must be confirmed before final terms are offered for acceptance.",
    ] },
    { id: "accounts", title: "Eligibility and accounts", paragraphs: [
      "The proposed account and generation service is for adults aged 18 or older who can enter a binding agreement. This eligibility rule requires review and appropriate implementation before final publication. Content age-group settings do not establish eligibility to use the service.",
      "Keep your account and connected credentials secure, provide accurate information, and use only accounts and images you are authorized to use. You are responsible for activity you authorize through your account. Do not share passwords, payment details, or API keys in public stories or support messages.",
    ] },
    { id: "plans", title: "Free trial and Creator access", paragraphs: [
      "Both plans offer Google and GitHub sign-in. Free trial creation requires a linked GitHub account, supports Classic stories, and uses your own connected Pollinations key and available provider balance. The label Free trial does not promise free Pollinations credits, a fixed number of days, or an automatic paid upgrade.",
      "Creator requires active paid access and includes Classic and Plot Twist generation, platform-funded illustrations, character and scene material, and PDF export. Creator does not require a personal Pollinations key or linked GitHub account for creation.",
      "Neither plan has per-user monthly project, image, or image-to-story quotas. This is not a promise of unlimited or uninterrupted output: generation depends on provider restrictions, availability, and, for Creator images, shared platform capacity. Complete short-film generation is not included in the current subscription.",
    ] },
    { id: "billing", title: "Subscriptions, renewal, and delivery", paragraphs: [
      "The price, currency, and recurring billing interval are shown on Plans and at checkout. Creator renews automatically each month until cancelled, subject to successful payment and the payment mandate. Razorpay handles payment authorization and recurring collection. Your bank or payment provider may apply its own conversion or other charges.",
      "Creator access starts when a qualifying payment is verified, not merely when a checkout modal closes or a mandate is authorized. Confirmation can be delayed. Review or refresh the subscription status before trying another payment.",
      "This is a digitally delivered service, not a shipment of physical goods. Generation time varies. Review output before relying on it and check saved drafts before restarting interrupted work. The service does not guarantee a particular number of completed stories or a specific generation time.",
    ] },
    { id: "cancellation", title: "Cancellation and refunds", paragraphs: [
      "Use Cancel automatic renewal on Plans before the next billing date and check the confirmation. For an active paid period, cancelling renewal normally preserves Creator access until that period ends. Signing out, removing a story, or disconnecting Pollinations does not cancel a subscription.",
      "Cancellation does not itself trigger a refund. A commercial refund policy, request channel, and handling process still need to be finalized; this draft does not create a blanket no-refund rule or promise a particular refund deadline. Rights and remedies that apply under consumer law are not waived.",
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
      "To the extent permitted by law, no guarantee is made that AI output will be error-free or that every service request will succeed. Nothing in these terms excludes rights, warranties, remedies, or liability that cannot lawfully be excluded. No monetary liability cap or mandatory arbitration requirement is established by this draft.",
    ] },
    { id: "privacy", title: "Privacy and third-party services", paragraphs: [
      "The Privacy Policy describes account data, public stories, provider processing, analytics, and payment records. Using external services can also be subject to their own terms. Reading a policy is not a substitute for any separate consent required for optional tracking or another activity.",
    ], links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Google Gemini API terms", href: "https://ai.google.dev/gemini-api/terms" },
      { label: "Pollinations terms", href: "https://enter.pollinations.ai/terms" },
    ] },
    { id: "contact", title: "Contact, disputes, and final publication", paragraphs: [
      "The operator's legal identity and a working support, privacy, and complaints contact must be added before these terms are finalized. No email address or postal address has been supplied in this draft.",
      "Governing-law and dispute-resolution provisions require review for an India-based individual serving international customers. This draft does not select an exclusive court or remove mandatory protections that apply where a customer lives.",
    ] },
  ],
};
