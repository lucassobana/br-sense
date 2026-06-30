import { Box } from "@chakra-ui/react";
import { motion, useScroll } from "framer-motion";

export default function ScrollProgress() {
  // O Framer Motion calcula automaticamente a percentagem do scroll da página inteira
  const { scrollYProgress } = useScroll();

  return (
    <Box
      as={motion.div}
      position="fixed"
      top={0}
      left={0}
      right={0}
      height="4px" // Espessura da barra
      bgGradient="linear(to-r, #8ec6f4, #008bf6d1)" // Um degradê usando as cores do seu projeto (Azul para Verde)
      transformOrigin="0%" // Garante que a barra cresce da esquerda para a direita
      style={{ scaleX: scrollYProgress }} // Vincula a largura da barra ao scroll
      zIndex={9999} // Garante que fica por cima de tudo (menus, imagens, etc.)
    />
  );
}