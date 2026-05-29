import { Box, Container, Heading, Text, VStack, List, ListItem, ListIcon } from '@chakra-ui/react';
import { FiTarget, FiZap, FiWifi, FiMapPin } from 'react-icons/fi';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import FieldBg from '../../assets/instalado.jpeg';

// Criamos o componente animado para a camada de fundo
const MotionBox = motion(Box);

const benefitPoints = [
  { icon: FiTarget, text: 'Alta precisão em múltiplas profundidades' },
  { icon: FiWifi, text: 'Conectividade confiável, mesmo em áreas remotas' },
  { icon: FiZap, text: 'Alertas imediatos sobre a saúde das sondas' },
  { icon: FiMapPin, text: 'Mapeamento visual da sua produção' },
];

export default function SystemInField() {
  const ref = useRef(null);

  // Mapeia o progresso do scroll apenas durante a passagem desta seção pela tela
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"] // Começa quando o topo entra na base da tela, termina quando a base sai pelo topo
  });

  // Transforma o progresso (0 a 1) num movimento vertical da imagem. 
  // Pode ajustar as porcentagens para deixar o movimento mais rápido ou mais lento.
  const yParallax = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <Box
      id="impacto"
      ref={ref} // Referência conectada ao useScroll
      minH="100vh"
      display="flex"
      alignItems="center"
      py={{ base: 20, md: 32 }}
      position="relative"
      overflow="hidden" // ESSENCIAL: impede que a imagem com parallax ultrapasse os limites da seção
    >
      {/* CAMADA 1: Fundo Fotográfico Animado (Parallax) */}
      <MotionBox
        position="absolute"
        top="-20%" // Inicia acima para ter margem de sobra no movimento
        left={0}
        w="full"
        h="140%" // A altura extra impede que bordas brancas apareçam durante o deslocamento
        bgImage={`url(${FieldBg})`}
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
        style={{ y: yParallax }} // Efeito dinâmico injetado aqui
        zIndex={0}
      />

      {/* CAMADA 2: Overlay Escuro */}
      {/* Usamos uma Box própria para o overlay em vez de _before para garantir o alinhamento de zIndex */}
      <Box
        position="absolute"
        top={0}
        left={0}
        w="full"
        h="full"
        bg="blackAlpha.700" // Opacidade ajustada para leitura (equivalente ao 650 anterior)
        zIndex={1}
      />

      {/* CAMADA 3: Conteúdo (Fica fixo e rola normalmente) */}
      <Container maxW="container.md" position="relative" zIndex={2}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <VStack 
            spacing={8} 
            textAlign="center" 
            bg="brand.900" 
            p={10} 
            rounded="2xl" 
            border="1px" 
            borderColor="whiteAlpha.100" 
            shadow="2xl"
          >
            <Heading size="xl" color="white">
              Sistema Completo e Integrado
            </Heading>
            <Text fontSize="lg" color="text.secondary">
              Deixe os dados guiarem sua irrigação e proteja sua lavoura com monitoramento preciso em tempo real.
            </Text>
            
            <List spacing={5} w="full" textAlign="left" pt={4}>
              {benefitPoints.map((point, idx) => (
                <ListItem key={idx} display="flex" alignItems="center" color="whiteAlpha.900" fontWeight="medium">
                  <ListIcon as={point.icon} color="brand.500" boxSize={6} mr={3} />
                  {point.text}
                </ListItem>
              ))}
            </List>
          </VStack>
        </motion.div>
      </Container>
    </Box>
  );
}