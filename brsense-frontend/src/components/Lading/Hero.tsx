import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import HeroBg from '../../assets/projeto.jpeg';
import { FiChevronDown } from 'react-icons/fi';

const MotionBox = motion(Box);

export default function Hero() {
  const ref = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  
  const yParallax = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  return (
    <Box
      id="inicio"
      ref={ref}
      position="relative"
      minH="100vh"
      display="flex"
      alignItems="center"
      pt="100px"
      pb={{ base: 20, md: 32 }}
      overflow="hidden" 
    >
      <MotionBox
        position="absolute"
        top="-10%"
        left={0}
        w="full"
        h="130%"
        bgImage={`url(${HeroBg})`}
        bgSize="cover"
        bgPosition={{ 
          base: "70% center",
          md: "center"
        }}
        bgRepeat="no-repeat"
        style={{ y: yParallax }}
        zIndex={0}
      />

      <Box position="absolute" top={0} left={0} w="full" h="full" bg="blackAlpha.800" zIndex={1} />

      <Container maxW="container.xl" position="relative" zIndex={2}>
        <Stack direction="column" spacing={8} align={{ base: 'center', md: 'flex-start' }} textAlign={{ base: 'center', md: 'left' }} maxW="3xl">
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Heading as="h1" size={{ base: '2xl', md: '3xl' }} fontWeight="bold" lineHeight="1.15" color="#FFFFFF">
              Inteligência Agrícola na <Text as="span" color="#3084c9">Palma da sua Mão</Text>
            </Heading>
          </MotionBox>
          
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Text fontSize={{ base: 'lg', md: 'xl' }} color="#A0AEC0" lineHeight="tall" fontWeight="medium">
              A BR Sense oferece telemetria avançada e monitoramento climático em tempo real. Acompanhe a umidade do solo em múltiplas profundidades e tenha total previsibilidade para otimizar o manejo e a produtividade da sua lavoura.
            </Text>
          </MotionBox>

        </Stack>
      </Container>
      <Box position="absolute" bottom="10%" left="50%" transform="translateX(-50%)" zIndex={3}>
        <motion.div
          animate={{
            y: [0, 15, 0],
            opacity: [0.7, 1.5, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <FiChevronDown size={40} color="#FFFFFF" opacity={0.7} />
        </motion.div>
      </Box>
    </Box>
  );
}