import DraftReader from './DraftReader';

export const metadata = { title: 'Your story | TaleCrafter AI', robots: { index: false, follow: false } };

export default async function DraftStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DraftReader storyId={id} />;
}
