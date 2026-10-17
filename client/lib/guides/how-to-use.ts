export const guideSections = [
  { id: "getting-started", label: "Account and plans" },
  { id: "classic", label: "Create a Classic story" },
  { id: "image-ideas", label: "Start from an image" },
  { id: "plot-twist", label: "Create a Plot Twist story" },
  { id: "drafts", label: "Resume a draft" },
  { id: "read-and-export", label: "Read, share and export" },
  { id: "subscriptions", label: "Manage your subscription" },
  { id: "help", label: "Troubleshooting" },
] as const;

export const classicSteps = [
  { title: "Open Create Story", text: "Sign in, then open Create Story. On Free trial, link a GitHub account if prompted. Choose Connect key, approve access on Pollinations, and return to TaleCrafter. Your connected account needs sufficient balance and access to the requested image model. Creator uses platform-funded image generation instead." },
  { title: "Describe your idea", text: "In Begin with an idea, describe the main character, setting, goal, and tone. Include important visual details, such as clothing or appearance, that you want to carry through the story. Avoid entering private or sensitive information." },
  { title: "Choose a genre and illustration style", text: "Select one genre and one art style. Complete both selections before generating. The style guides the illustrations across the story." },
  { title: "Choose Classic Story", text: "TaleCrafter writes and saves the draft, then generates its illustrations. Keep the page open to follow progress. Generation time varies, and provider availability or usage limits can interrupt it." },
  { title: "Read the finished story", text: "When generation finishes, the app opens the published story. If generation stops, check Draft stories in My Stories before starting another project. Published stories are public and may appear in Explore, shared links, and search engines." },
];

export const plotTwistSteps = [
  { title: "Start with Creator", text: "Open Create Story, enter an idea, and select a genre and art style. Choose Plot Twist. This option is locked on Free trial." },
  { title: "Read to the end of the current pages", text: "Use the reader's next-page control. Story choices become available when you reach the end of the current section." },
  { title: "Choose what happens next", text: "Pick an available choice to generate the next part of the story. The story tree shows your selected path. Wait for the new section before making another choice." },
  { title: "Finish or return later", text: "Use End Story when you are ready for a resolution. Unfinished stories stay in Draft stories, where Continue reopens the interactive reader. Finishing publishes the completed story." },
];

export const subscriptionSteps = [
  { title: "Review the current offer", text: "Open Plans while signed in. Check the displayed price, currency, and renewal terms. Creator is a monthly subscription, not a purchase of credits, and generation is not unlimited." },
  { title: "Complete secure checkout", text: "Review the subscription terms and complete the Razorpay checkout. Creator access begins after the monthly payment is confirmed, not just when a payment mandate is authorised. If checkout is unavailable, do not attempt an alternate payment outside the app." },
  { title: "Check your subscription status", text: "Return to Plans to see whether Creator is active and its paid-through date. If confirmation is pending, use Refresh status when it is shown before trying another payment. Creator includes platform-funded images subject to provider availability and shared platform capacity; Free trial uses your own Pollinations balance." },
  { title: "Cancel automatic renewal when needed", text: "On Plans, choose Cancel automatic renewal and confirm. For an active paid period, Creator remains available until that period ends. Check that the page shows Renewal cancelled. Cancelling renewal is not an automatic refund; it stops future renewal charges. After paid access ends, Free trial creation requirements apply again." },
];

export const guideFaqs = [
  { question: "How long does the Free trial last?", answer: "There is no fixed trial duration or automatic upgrade charge. Classic generation requires a linked GitHub account, a valid Pollinations key with available balance. TaleCrafter does not impose monthly project, image, or image-to-story quotas on the Free trial. Pollinations limits still apply, and free provider credits are not guaranteed. If the key expires or its balance runs out, generation stops until those requirements are met. Choose Creator to use platform-funded images instead. You can still read public stories without subscribing." },
  { question: "I signed in with Google. Can I create a story?", answer: "Yes with Creator. For Free trial creation, you also need to link a GitHub account using the prompt on Create Story. You can still sign in with Google to read and explore." },
  { question: "My Pollinations key is connected, but images will not generate.", answer: "Check the error shown in the app, your Pollinations balance, the key's expiry, and the model permissions you approved. A connection alone does not guarantee available generation quota. Reconnect when access has expired or permissions need updating, then resume the existing draft." },
  { question: "Generation stopped or I closed the page. Is my story lost?", answer: "Open My Stories and check both Draft stories and your library. A saved unfinished Classic story can be resumed, and an unfinished Plot Twist story can be continued. If the initial text generation failed before saving, there may not be a draft yet." },
  { question: "I paid, but my account still shows Free trial.", answer: "Open Plans and use Refresh status if available. Payment verification may still be pending. Avoid paying again until you have checked the status. If it remains unresolved, contact support with the payment reference and your account email, never your card details, password, or API key." },
  { question: "Why is PDF export or Plot Twist locked?", answer: "These features require active Creator access. Check your plan on Plans. If you recently paid, refresh the subscription status before trying again." },
  { question: "Does Creator include video generation?", answer: "No. Complete short-film generation is coming soon and is not included in the current plans. Creator provides story content, character details, scene prompts, and illustrations that can support your wider creative workflow." },
  { question: "Why does an older story have no character bible?", answer: "Some older stories were created without saved character details or image prompts. Upgrading does not automatically create missing data for those stories." },
];
