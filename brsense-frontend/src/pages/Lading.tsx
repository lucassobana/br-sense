import { Box } from "@chakra-ui/react";
import Header from "../components/Lading/Header";
import Hero from "../components/Lading/Hero";
import Services from "../components/Lading/Services";
import Consultoria from "../components/Lading/Consultoria";
import SystemInField from "../components/Lading/SystemInField";
import Acompanhamento from "../components/Lading/Acompanhamento";
import Features from "../components/Lading/Features";
import Differentials from "../components/Lading/Differentials";
import HowItWorks from "../components/Lading/HowItWorks";
import About from "../components/Lading/About";
import CTASection from "../components/Lading/CTASection";
import Footer from "../components/Lading/Footer";
import Plataforma from "../components/Lading/Plataforma";
import ScrollProgress from "../components/Lading/ScrollProgress";
import VideosSection from "../components/Lading/VideosSection";

export function Lading() {
  return (
    <Box bg="#050B18">
      <Header />
      <ScrollProgress />
      <Hero />
      <Services />
      <Consultoria />
      <SystemInField />
      <Plataforma />
      <Acompanhamento />
      <Features />
      <Differentials />
      <HowItWorks />
      <About />
      <CTASection />
      <VideosSection />
      <Footer />
    </Box>
  );
}
