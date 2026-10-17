import Hero from "./(components)/Hero";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata("/");

export default function Home() {
  return <Hero />;
}
