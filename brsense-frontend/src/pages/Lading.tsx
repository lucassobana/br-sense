import { Box } from "@chakra-ui/react";
import Header from "../components/Lading/Header";
import Hero from "../components/Lading/Hero";
import Services from "../components/Lading/Services";
import Consultoria from "../components/Lading/Consultoria";
import SystemInField from "../components/Lading/SystemInField";
import Acompanhamento from "../components/Lading/Acompanhamento";
import Features from "../components/Lading/Features";
import Audience from "../components/Lading/Audience";
import Differentials from "../components/Lading/Differentials";
import HowItWorks from "../components/Lading/HowItWorks";
import About from "../components/Lading/About";
import CTASection from "../components/Lading/CTASection";
import Footer from "../components/Lading/Footer";
import Plataforma from "../components/Lading/Plataforma";

export function Lading() {
  return (
    <Box bg="#050B18">
      {/* 1. Navegação */}
      <Header />
      
      {/* 2. Topo / Introdução */}
      <Hero />
      
      {/* 3. O que a BR Sense faz (Pilares Principais) */}
      <Services />
      
      {/* 4. Pilar A - Consultoria e Projetos Físicos */}
      <Consultoria />
      
      {/* 5. Pilar B - Sonda e Plataforma Tecnológica */}
      <SystemInField />
      <Plataforma />
      
      {/* 6. Acompanhamento e Suporte Prático */}
      <Acompanhamento />
      
      {/* 7. Vantagens Reais (Água, Energia, Raiz, Produtividade) */}
      <Features />
      
      {/* 8. Pra quem o sistema foi feito */}
      <Audience />
      
      {/* 9. Diferenciais da Tecnologia */}
      <Differentials />
      
      {/* 10. Processo de Implantação */}
      <HowItWorks />
      
      {/* 11. Sobre a Empresa e Expertise */}
      <About />
      
      {/* 12. Formulário de Contato Direto */}
      <CTASection />
      
      {/* 13. Rodapé */}
      <Footer />
    </Box>
  );
}