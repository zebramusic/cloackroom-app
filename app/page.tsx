import Navbar from "@/app/components/Navbar";
import Hero from "@/app/components/Hero";
import Features from "@/app/components/Features";
import Partners from "@/app/components/Partners";
import FAQ from "@/app/components/FAQ";
import Contact from "@/app/components/Contact";
import Footer from "@/app/components/Footer";

export default function Home() {
  return (
    <div className="font-sans">
      <Navbar />
      <p>hero</p>
      <Hero />

      <Features />
      <Partners />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}
