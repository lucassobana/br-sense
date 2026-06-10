import { Box } from "@chakra-ui/react";
import Hero from "../components/Lading/Hero";
import Features from "../components/Lading/Features";
import HowItWorks from "../components/Lading/HowItWorks";
import CTASection from "../components/Lading/CTASection";
import Footer from "../components/Lading/Footer";
import SystemInField from "../components/Lading/SystemInField";
import Header from "../components/Lading/Header";
import Services from "../components/Lading/Services";

export function Lading() {
  return (
    <Box>
      <Header />
      <Hero />
      <HowItWorks />
      <SystemInField />
      <Services />
      <Features />
      <CTASection />
      <Footer />
    </Box>
  );
}
